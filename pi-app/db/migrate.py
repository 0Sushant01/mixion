"""
db/migrate.py — Safe Database Migration for Mixion Pi App
==========================================================
Rules:
  - NEVER drops a table or column
  - NEVER destroys existing data
  - Each migration is IDEMPOTENT (safe to run multiple times)
  - Migrations are versioned; already-applied ones are skipped
  - On ANY failure the transaction is rolled back and the app halts
"""

import sqlite3
import os
import sys

DB_PATH = os.path.join("data", "mixion.db")

# ── Migration Definitions ─────────────────────────────────────────────────────
# Each entry is a tuple: (version_id: int, description: str, sql_statements: list[str])
# version_id must be unique and increasing.
# sql_statements are executed inside a single transaction.
MIGRATIONS = [
    (
        1,
        "Create base schema (categories, ui_groups, ingredient_types, ingredients, "
        "lines, bottles, glasses, methods, drinks, recipes, extras, recipe_extras, transactions)",
        [
            """CREATE TABLE IF NOT EXISTS categories (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS ui_groups (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                name        TEXT NOT NULL,
                FOREIGN KEY(category_id) REFERENCES categories(id)
            )""",
            """CREATE TABLE IF NOT EXISTS ingredient_types (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS ingredients (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                name    TEXT NOT NULL,
                type_id INTEGER NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY(type_id) REFERENCES ingredient_types(id)
            )""",
            """CREATE TABLE IF NOT EXISTS lines (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS bottles (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                ingredient_id INTEGER,
                line_id       INTEGER NOT NULL,
                flow_rate     REAL NOT NULL DEFAULT 5.0,
                capacity_ml   REAL DEFAULT 1000,
                current_ml    REAL DEFAULT 1000,
                enabled       INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY(ingredient_id) REFERENCES ingredients(id),
                FOREIGN KEY(line_id)       REFERENCES lines(id)
            )""",
            """CREATE TABLE IF NOT EXISTS glasses (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS methods (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS drinks (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                category_id INTEGER NOT NULL,
                ui_group_id INTEGER NOT NULL,
                glass_id    INTEGER NOT NULL,
                method_id   INTEGER NOT NULL,
                has_ice     INTEGER NOT NULL DEFAULT 1,
                enabled     INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY(category_id) REFERENCES categories(id),
                FOREIGN KEY(ui_group_id) REFERENCES ui_groups(id),
                FOREIGN KEY(glass_id)   REFERENCES glasses(id),
                FOREIGN KEY(method_id)  REFERENCES methods(id)
            )""",
            """CREATE TABLE IF NOT EXISTS recipes (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                drink_id      TEXT NOT NULL,
                ingredient_id INTEGER NOT NULL,
                amount_ml     REAL NOT NULL,
                FOREIGN KEY(drink_id)      REFERENCES drinks(id) ON DELETE CASCADE,
                FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
            )""",
            """CREATE TABLE IF NOT EXISTS extras (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS recipe_extras (
                drink_id TEXT NOT NULL,
                extra_id INTEGER NOT NULL,
                FOREIGN KEY(drink_id) REFERENCES drinks(id) ON DELETE CASCADE,
                FOREIGN KEY(extra_id) REFERENCES extras(id) ON DELETE CASCADE,
                PRIMARY KEY(drink_id, extra_id)
            )""",
            """CREATE TABLE IF NOT EXISTS transactions (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                drink_id  TEXT NOT NULL,
                status    TEXT NOT NULL DEFAULT 'started',
                timestamp TEXT NOT NULL,
                FOREIGN KEY(drink_id) REFERENCES drinks(id) ON DELETE CASCADE
            )""",
        ],
    ),
    (
        2,
        "Add price column to drinks table (default 0.0)",
        [
            # ALTER TABLE ignores 'IF NOT EXISTS' — handled via _safe_add_column
            "ALTER TABLE drinks ADD COLUMN price REAL DEFAULT 0.0",
        ],
    ),
    (
        3,
        "Add price column to extras table (default 0.0)",
        [
            "ALTER TABLE extras ADD COLUMN price REAL DEFAULT 0.0",
        ],
    ),
    # ── Add future migrations below ──────────────────────────────────────────
    # (
    #     4,
    #     "Description of change",
    #     ["ALTER TABLE ...", "CREATE TABLE IF NOT EXISTS ..."],
    # ),
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_existing_columns(conn: sqlite3.Connection, table: str) -> set:
    """Return the set of column names in an existing table."""
    c = conn.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in c.fetchall()}


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    c = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    )
    return c.fetchone() is not None


def _is_alter_add_column(sql: str) -> tuple[bool, str, str]:
    """
    Detect 'ALTER TABLE <t> ADD [COLUMN] <col> ...' patterns.
    Returns (is_alter, table_name, column_name).
    Works for both:
      ALTER TABLE foo ADD COLUMN bar TEXT
      ALTER TABLE foo ADD bar TEXT
    """
    parts = sql.strip().split()
    # Need at least: ALTER TABLE <name> ADD [COLUMN] <col>
    if len(parts) < 5:
        return False, "", ""
    if parts[0].upper() != "ALTER" or parts[1].upper() != "TABLE" or parts[3].upper() != "ADD":
        return False, "", ""

    table = parts[2]
    # If 'COLUMN' keyword is present, column name is at index 5; otherwise index 4
    if parts[4].upper() == "COLUMN" and len(parts) >= 6:
        col = parts[5]
    else:
        col = parts[4]

    return True, table, col


def _ensure_migrations_table(conn: sqlite3.Connection):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS _schema_migrations (
            version     INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.commit()


def _applied_versions(conn: sqlite3.Connection) -> set:
    c = conn.execute("SELECT version FROM _schema_migrations")
    return {row[0] for row in c.fetchall()}


# ── Required Schema Validation Map ───────────────────────────────────────────
# table -> [required columns]
# Extend this as the schema grows.
REQUIRED_SCHEMA = {
    "categories":       ["id", "name"],
    "ui_groups":        ["id", "category_id", "name"],
    "ingredient_types": ["id", "name"],
    "ingredients":      ["id", "name", "type_id", "enabled"],
    "lines":            ["id", "name"],
    "bottles":          ["id", "ingredient_id", "line_id", "flow_rate", "capacity_ml", "current_ml", "enabled"],
    "glasses":          ["id", "name"],
    "methods":          ["id", "name"],
    "drinks":           ["id", "name", "category_id", "ui_group_id", "glass_id", "method_id", "has_ice", "price", "enabled"],
    "recipes":          ["id", "drink_id", "ingredient_id", "amount_ml"],
    "extras":           ["id", "name", "price"],
    "recipe_extras":    ["drink_id", "extra_id"],
    "transactions":     ["id", "drink_id", "status", "timestamp"],
}


def validate_schema(conn: sqlite3.Connection) -> bool:
    """
    Verify that all required tables and columns exist.
    Returns True if valid, False otherwise (and prints failures).
    """
    print("🔎 Validating schema integrity...")
    failures = []

    for table, required_cols in REQUIRED_SCHEMA.items():
        if not _table_exists(conn, table):
            failures.append(f"  ✗ Missing table: '{table}'")
            continue
        existing = {c.lower() for c in _get_existing_columns(conn, table)}
        for col in required_cols:
            if col.lower() not in existing:
                failures.append(f"  ✗ Missing column: '{table}.{col}'")

    if failures:
        print("❌ Schema validation FAILED:")
        for f in failures:
            print(f)
        return False

    print("✅ Schema validation passed — all required tables and columns present.")
    return True


# ── Main Entry Point ──────────────────────────────────────────────────────────

def run_migrations():
    os.makedirs("data", exist_ok=True)
    print("=" * 55)
    print("  🗄️  Mixion DB Migration")
    print("=" * 55)
    print("  ▶ Migration started")

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=OFF")  # Disable FK during migration
    except Exception as e:
        print(f"  ❌ Cannot open database: {e}")
        print("  ⛔ Migration failed – stopping app")
        sys.exit(1)

    _ensure_migrations_table(conn)
    applied = _applied_versions(conn)
    pending = [m for m in MIGRATIONS if m[0] not in applied]

    if not pending:
        print("  ✅ Schema already up-to-date")
    else:
        print(f"  📋 {len(pending)} migration(s) pending...")

        for version, description, statements in pending:
            print(f"  ⏳ v{version}: {description}")
            try:
                with conn:  # Single transaction — auto-rollback on error
                    for sql in statements:
                        sql_stripped = sql.strip()

                        # ALTER TABLE ADD COLUMN: skip if column already exists
                        is_alter, tbl, col = _is_alter_add_column(sql_stripped)
                        if is_alter:
                            if _table_exists(conn, tbl):
                                existing_cols = _get_existing_columns(conn, tbl)
                                if col.lower() in {c.lower() for c in existing_cols}:
                                    print(f"     ↩  '{tbl}.{col}' already exists — skipping.")
                                    continue
                            conn.execute(sql_stripped)
                        else:
                            conn.execute(sql_stripped)

                    conn.execute(
                        "INSERT INTO _schema_migrations (version, description) VALUES (?, ?)",
                        (version, description),
                    )
                print(f"     ✅ v{version} applied.")

            except Exception as e:
                print(f"     ❌ v{version} FAILED: {e}")
                print("  ⛔ Migration failed – stopping app")
                conn.close()
                sys.exit(1)

        print(f"  🎉 Schema updated successfully — {len(pending)} migration(s) applied.")

    # ── Post-migration schema validation ─────────────────────────────────────
    conn.execute("PRAGMA foreign_keys=ON")
    if not validate_schema(conn):
        print("  ⛔ Migration failed – stopping app")
        conn.close()
        sys.exit(1)

    conn.close()
    print("=" * 55)


if __name__ == "__main__":
    run_migrations()
