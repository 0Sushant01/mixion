#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path


def locate_frontend():
    """Locate the 'frontend' folder relative to this manage.py. Returns Path or None."""
    this = Path(__file__).resolve()
    # search up to 6 parents for a sibling 'frontend' folder
    for i in range(6):
        if i >= len(this.parents):
            break
        candidate = this.parents[i]
        if (candidate / "frontend").exists():
            return candidate / "frontend"
    # try a couple more heuristics
    for p in (this.parents[2] if len(this.parents) > 2 else None,
              this.parents[3] if len(this.parents) > 3 else None):
        if p and p.parent.joinpath("frontend").exists():
            return p.parent.joinpath("frontend")
    return None


def check_frontend():
    """
    Quick sanity checks for the frontend configuration.
    Run: python manage.py check_frontend
    """
    issues = []
    info = []

    frontend = locate_frontend()
    if frontend is None:
        issues.append("Could not locate frontend directory (expected a sibling 'frontend' folder).")
        print("Frontend check: FAILED\n")
        for it in issues:
            print("- " + it)
        sys.exit(1)

    info.append(f"Found frontend at: {frontend}")

    # Files to check
    files = {
        "postcss": frontend / "postcss.config.js",
        "tailwind": frontend / "tailwind.config.js",
        "globals_css": frontend / "styles" / "globals.css",
        "package": frontend / "package.json",
        "app_layout": frontend / "app" / "layout.tsx",
        "app_page": frontend / "app" / "page.tsx",
    }

    for name, path in files.items():
        if name in ("app_layout", "app_page"):
            # optional: at least one should exist
            continue
        if not path.exists():
            issues.append(f"Missing required file: {path}")

    # ensure at least one app entrypoint exists
    if not (files["app_layout"].exists() or files["app_page"].exists()):
        issues.append(f"Missing frontend app entry: {files['app_layout']} or {files['app_page']}")

    # Inspect postcss.config.js and tailwind.config.js for common errors
    def scan_file(path):
        try:
            text = path.read_text(encoding="utf-8")
            return text
        except Exception:
            return ""

    postcss_text = scan_file(files["postcss"])
    tailwind_text = scan_file(files["tailwind"])
    globals_text = scan_file(files["globals_css"])

    # PowerShell artifact detection
    for txt, path in ((postcss_text, files["postcss"]), (tailwind_text, files["tailwind"]), (globals_text, files["globals_css"])):
        if txt:
            if "@'" in txt or "'@" in txt or "New-Item" in txt or "> .\\" in txt:
                issues.append(f"PowerShell artifacts detected in {path.name}. Remove @' ... '@ and any PowerShell commands.")

    # Check postcss plugin usage
    if postcss_text:
        if "@tailwindcss/postcss" not in postcss_text and "tailwindcss" in postcss_text:
            issues.append(f"postcss.config.js appears to reference 'tailwindcss' directly. Install and use '@tailwindcss/postcss' or update config.")
        elif "@tailwindcss/postcss" in postcss_text:
            info.append("postcss.config.js uses @tailwindcss/postcss (good).")

    # Basic tailwind content check
    if tailwind_text and "content:" not in tailwind_text:
        issues.append("tailwind.config.js does not contain a 'content' field - verify your content globs.")

    # Globals.css basic check
    if globals_text and ("@tailwind base" not in globals_text and "@tailwind" not in globals_text):
        issues.append("styles/globals.css does not include Tailwind directives (@tailwind base/components/utilities).")

    # package.json existence and checks
    if files["package"].exists():
        try:
            import json
            pj = json.loads(files["package"].read_text(encoding="utf-8"))
            devdeps = pj.get("devDependencies", {}) or {}
            deps = pj.get("dependencies", {}) or {}
            if "@tailwindcss/postcss" not in devdeps and "@tailwindcss/postcss" not in deps:
                info.append("Note: @tailwindcss/postcss not listed in package.json devDependencies/dependencies.")
        except Exception:
            info.append("Could not parse package.json (not JSON?)")
    else:
        issues.append("Missing package.json in frontend folder.")

    # Print report
    if issues:
        print("Frontend check: FAILED\n")
        for it in issues:
            print("- " + it)
        if info:
            print("\nInfo:")
            for it in info:
                print("- " + it)
        sys.exit(1)
    else:
        print("Frontend check: OK ✅\n")
        for it in info:
            print("- " + it)
        sys.exit(0)


def fix_frontend():
    """
    Create minimal frontend scaffold if files are missing.
    Usage: python manage.py fix_frontend [--force]
    """
    force = "--force" in sys.argv
    frontend = locate_frontend()
    if frontend is None:
        # try to create frontend adjacent to the repo root (one level up from manage.py)
        manage_parent = Path(__file__).resolve().parents[1]
        frontend = manage_parent / "frontend"
        print(f"No frontend found; will create at: {frontend}")

    # Ensure directories
    (frontend / "app").mkdir(parents=True, exist_ok=True)
    (frontend / "styles").mkdir(parents=True, exist_ok=True)

    # Templates
    tailwind_cfg = """/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
"""
    postcss_cfg = """module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
"""
    globals_css = """@tailwind base;
@tailwind components;
@tailwind utilities;

/* custom styles below */
body {
  @apply bg-gray-50;
}
"""
    app_page = """export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">MIXION Frontend</h1>
        <p className="text-lg text-gray-600">Tailwind + Next.js skeleton created by manage.py fix_frontend</p>
      </div>
    </main>
  );
}
"""
    app_layout = """import '../styles/globals.css';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
"""
    package_json = """{
  "name": "mixion-frontend",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "16.0.3",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^1.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0"
  }
}
"""

    to_write = {
        frontend / "tailwind.config.js": tailwind_cfg,
        frontend / "postcss.config.js": postcss_cfg,
        frontend / "styles" / "globals.css": globals_css,
        frontend / "app" / "page.tsx": app_page,
        frontend / "app" / "layout.tsx": app_layout,
        frontend / "package.json": package_json,
    }

    for path, content in to_write.items():
        if path.exists() and not force:
            print(f"Exists: {path} (skip; use --force to overwrite)")
            continue
        path.write_text(content, encoding="utf-8")
        print(f"Wrote: {path}")

    print("\nDone. If you created/updated files, run in frontend:\n  npm install\n  npm run dev\n")
    sys.exit(0)


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

    # Custom quick-check command (before Django's command dispatch)
    if len(sys.argv) > 1 and sys.argv[1] == "check_frontend":
        check_frontend()
    if len(sys.argv) > 1 and sys.argv[1] == "fix_frontend":
        fix_frontend()

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
