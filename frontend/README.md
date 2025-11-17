# Mixion Frontend (Next.js)

Development commands and environment

Prerequisites
- Node.js (>=18 recommended)
- pnpm or npm/yarn (examples use pnpm)

Environment variables
- `NEXT_PUBLIC_API_BASE` — Base URL for backend API (default: `http://localhost:8000/api`)
 - `NEXT_PUBLIC_API_BASE` — Base URL for backend API (default: `http://localhost:8000/api`)
 - `NEXT_PUBLIC_IDLE_VIDEO` — (optional) path to the idle video to play on the homepage (default: `/idle.mp4`). Place the file in `frontend/public/` (for example `frontend/public/idle.mp4`). Supported formats: `mp4`, `webm`.
  
Audio and voice behavior
- If your video contains a voice/audio track, browsers will not autoplay audible audio until the user interacts with the page. This app mutes the video for autoplay. On the first user tap/click the app will unmute the video and allow its audio (voice) to play while showing the login options overlay.
- If you prefer a separate audio file, you can provide `NEXT_PUBLIC_IDLE_AUDIO=/idle-audio.mp3` and the app can be adapted to play that file on first interaction instead of unmuting the video.

Install dependencies
```bash
cd frontend
pnpm install
```

Run development server
```bash
pnpm dev
```

Build & start
```bash
pnpm build
pnpm start
```

Linting
```bash
pnpm lint
pnpm lint:fix
```

Testing
```bash
pnpm test
```

Husky (git hooks)
```bash
pnpm prepare
# then enable hooks
npx husky add .husky/pre-commit "npx --no -- lint-staged"
```

Notes
- The repository includes Tailwind CSS and PostCSS configuration.
- Add credentials or API URLs via a `.env.local` file as needed.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
