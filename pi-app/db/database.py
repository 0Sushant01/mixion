import sqlite3
import os
from datetime import datetime

class Database:
    def __init__(self):
        os.makedirs("data", exist_ok=True)
        self.conn = sqlite3.connect("data/mixion.db", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")  # better concurrent access
        self._init_schema()
        self._migrate_schema()

    # ── Schema ──────────────────────────────────────────────────────────────────

    def _init_schema(self):
        c = self.conn.cursor()
        c.executescript("""
            CREATE TABLE IF NOT EXISTS bottles (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                position    INTEGER NOT NULL,
                flow_rate   REAL NOT NULL DEFAULT 5.0,
                enabled     INTEGER NOT NULL DEFAULT 1,
                min_ml      REAL DEFAULT 0,
                max_ml      REAL DEFAULT 200,
                capacity_ml REAL DEFAULT 1000,
                current_ml  REAL DEFAULT 1000
            );

            CREATE TABLE IF NOT EXISTS drinks (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                name    TEXT NOT NULL,
                price   REAL DEFAULT 0.0,
                active  INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS recipes (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                drink_id  INTEGER NOT NULL,
                bottle_id INTEGER NOT NULL,
                amount_ml REAL NOT NULL,
                FOREIGN KEY(drink_id)  REFERENCES drinks(id),
                FOREIGN KEY(bottle_id) REFERENCES bottles(id)
            );

            CREATE TABLE IF NOT EXISTS limits (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                bottle_id INTEGER NOT NULL UNIQUE,
                min_ml    REAL DEFAULT 0,
                max_ml    REAL DEFAULT 200,
                FOREIGN KEY(bottle_id) REFERENCES bottles(id)
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                drink_id     INTEGER NOT NULL,
                drink_name   TEXT NOT NULL,
                status       TEXT NOT NULL DEFAULT 'started',
                msg_id       TEXT,
                started_at   TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY(drink_id) REFERENCES drinks(id)
            );

            CREATE TABLE IF NOT EXISTS transaction_ingredients (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL,
                bottle_id      INTEGER NOT NULL,
                bottle_name    TEXT NOT NULL,
                amount_ml      REAL NOT NULL,
                FOREIGN KEY(transaction_id) REFERENCES transactions(id)
            );
        """)
        self.conn.commit()
        self._seed_demo_data()

    def _migrate_schema(self):
        """Add new columns to existing tables if they don't exist yet (safe migration)."""
        c = self.conn.cursor()
        existing = {row[1] for row in c.execute("PRAGMA table_info(bottles)")}
        migrations = []
        if "capacity_ml" not in existing:
            migrations.append("ALTER TABLE bottles ADD COLUMN capacity_ml REAL DEFAULT 1000")
        if "current_ml" not in existing:
            migrations.append("ALTER TABLE bottles ADD COLUMN current_ml  REAL DEFAULT 1000")
        for sql in migrations:
            c.execute(sql)
        if migrations:
            self.conn.commit()

    def _seed_demo_data(self):
        c = self.conn.cursor()
        if c.execute("SELECT COUNT(*) FROM drinks").fetchone()[0] == 0:
            c.executescript("""
                INSERT INTO bottles (name, position, flow_rate, enabled, capacity_ml, current_ml) VALUES
                    ('Cola',       1, 5.0, 1, 1000, 1000),
                    ('Lime Juice', 2, 4.5, 1, 1000, 1000),
                    ('Soda Water', 3, 6.0, 1, 1000, 1000);

                INSERT INTO drinks (name, price, active) VALUES
                    ('Neon Lime Surge', 50.0, 1),
                    ('Velvet Crimson',  60.0, 1);

                INSERT INTO recipes (drink_id, bottle_id, amount_ml) VALUES
                    (1, 1, 100),
                    (1, 2, 30),
                    (2, 1, 80),
                    (2, 3, 50);
            """)
            self.conn.commit()

    # ── Public: Drinks & Availability ──────────────────────────────────────────

    def check_drink_availability(self, drink_id: int, device_online: bool = True) -> tuple[bool, str]:
        """Returns (available: bool, reason: str). Checks hardware status and bottle current_ml."""
        if not device_online:
            return False, "Hardware Offline"

        c = self.conn.cursor()
        c.execute("""
            SELECT b.name, b.current_ml, b.enabled, r.amount_ml
            FROM recipes r
            JOIN bottles b ON b.id = r.bottle_id
            WHERE r.drink_id = ?
        """, (drink_id,))
        rows = c.fetchall()
        if not rows:
            return False, "No recipe defined"
        for row in rows:
            if not row["enabled"]:
                return False, f"Bottle '{row['name']}' is disabled"
            if row["current_ml"] < row["amount_ml"]:
                return False, f"Bottle '{row['name']}' has {row['current_ml']:.0f}ml, needs {row['amount_ml']:.0f}ml"
        return True, "ok"

    def get_all_drinks(self, device_online: bool = True):
        c = self.conn.cursor()
        # Fetch drinks with ingredients + availability per bottle
        c.execute("""
            SELECT d.id, d.name, d.price, d.active,
                   b.name AS ing_name, b.current_ml, b.enabled,
                   r.amount_ml
            FROM drinks d
            LEFT JOIN recipes r ON r.drink_id = d.id
            LEFT JOIN bottles b ON b.id = r.bottle_id
            WHERE d.active = 1
            ORDER BY d.id, r.id
        """)
        rows = c.fetchall()
        drinks = {}
        for row in rows:
            did = row["id"]
            if did not in drinks:
                drinks[did] = {
                    "id": did,
                    "name": row["name"],
                    "price": row["price"],
                    "active": row["active"],
                    "available": True,
                    "unavailable_reason": None,
                    "ingredients": []
                }
            if row["ing_name"] is not None:
                drinks[did]["ingredients"].append({
                    "name": row["ing_name"],
                    "amount_ml": row["amount_ml"],
                    "current_ml": row["current_ml"]
                })
                # Check availability inline
                if not row["enabled"] or row["current_ml"] < row["amount_ml"]:
                    drinks[did]["available"] = False
                    if not row["enabled"]:
                        drinks[did]["unavailable_reason"] = f"{row['ing_name']} disabled"
                    else:
                        drinks[did]["unavailable_reason"] = f"{row['ing_name']} low stock"

        # Apply global unavailability rules
        for d in drinks.values():
            if not device_online:
                d["available"] = False
                d["unavailable_reason"] = "Hardware Offline"
            elif not d["ingredients"]:
                d["available"] = False
                d["unavailable_reason"] = "No recipe set"

        return list(drinks.values())

    def get_recipes_for_drink(self, drink_id):
        c = self.conn.cursor()
        c.execute("SELECT bottle_id, amount_ml FROM recipes WHERE drink_id=?", (drink_id,))
        return [{"bottle_id": r["bottle_id"], "amount_ml": r["amount_ml"]} for r in c.fetchall()]

    def get_bottle(self, bottle_id):
        c = self.conn.cursor()
        c.execute("SELECT name, position, flow_rate, enabled, current_ml FROM bottles WHERE id=?", (bottle_id,))
        r = c.fetchone()
        if not r:
            raise Exception(f"Bottle {bottle_id} not found")
        return {"name": r["name"], "position": r["position"], "flow_rate": r["flow_rate"],
                "enabled": r["enabled"], "current_ml": r["current_ml"]}

    # ── Transactions ────────────────────────────────────────────────────────────

    def create_transaction(self, drink_id: int, drink_name: str, msg_id: str) -> int:
        c = self.conn.cursor()
        c.execute(
            "INSERT INTO transactions (drink_id, drink_name, status, msg_id, started_at) VALUES (?,?,?,?,?)",
            (drink_id, drink_name, "started", msg_id, datetime.now().isoformat())
        )
        self.conn.commit()
        return c.lastrowid

    def complete_transaction(self, txn_id: int, status: str = "completed"):
        c = self.conn.cursor()
        c.execute(
            "UPDATE transactions SET status=?, completed_at=? WHERE id=?",
            (status, datetime.now().isoformat(), txn_id)
        )
        self.conn.commit()

    def deduct_bottles(self, drink_id: int, txn_id: int):
        """Subtract used amounts from each bottle and log to transaction_ingredients."""
        c = self.conn.cursor()
        c.execute("""
            SELECT r.bottle_id, b.name AS bottle_name, r.amount_ml
            FROM recipes r JOIN bottles b ON b.id = r.bottle_id
            WHERE r.drink_id = ?
        """, (drink_id,))
        rows = c.fetchall()
        for row in rows:
            c.execute(
                "UPDATE bottles SET current_ml = MAX(0, current_ml - ?) WHERE id=?",
                (row["amount_ml"], row["bottle_id"])
            )
            c.execute(
                "INSERT INTO transaction_ingredients (transaction_id, bottle_id, bottle_name, amount_ml) VALUES (?,?,?,?)",
                (txn_id, row["bottle_id"], row["bottle_name"], row["amount_ml"])
            )
        self.conn.commit()

    # ── Admin: Bottles ──────────────────────────────────────────────────────────

    def admin_get_bottles(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM bottles")
        return [dict(r) for r in c.fetchall()]

    def admin_add_bottle(self, name, position, flow_rate, enabled, capacity_ml=1000, current_ml=None):
        c = self.conn.cursor()
        if current_ml is None:
            current_ml = capacity_ml
        c.execute(
            "INSERT INTO bottles (name,position,flow_rate,enabled,capacity_ml,current_ml) VALUES (?,?,?,?,?,?)",
            (name, position, flow_rate, enabled, capacity_ml, current_ml)
        )
        self.conn.commit()
        return c.lastrowid

    def admin_update_bottle(self, bid, name, position, flow_rate, enabled, capacity_ml=1000, current_ml=None):
        c = self.conn.cursor()
        if current_ml is None:
            # Preserve existing current_ml
            row = c.execute("SELECT current_ml FROM bottles WHERE id=?", (bid,)).fetchone()
            current_ml = row["current_ml"] if row else capacity_ml
        c.execute(
            "UPDATE bottles SET name=?,position=?,flow_rate=?,enabled=?,capacity_ml=?,current_ml=? WHERE id=?",
            (name, position, flow_rate, enabled, capacity_ml, current_ml, bid)
        )
        self.conn.commit()

    def admin_refill_bottle(self, bottle_id: int, fill_to_ml: float):
        """Set current_ml directly (admin refill)."""
        c = self.conn.cursor()
        c.execute(
            "UPDATE bottles SET current_ml = MIN(capacity_ml, MAX(0, ?)) WHERE id=?",
            (fill_to_ml, bottle_id)
        )
        self.conn.commit()

    def admin_delete_bottle(self, bid):
        c = self.conn.cursor()
        c.execute("DELETE FROM bottles WHERE id=?", (bid,))
        self.conn.commit()

    # ── Admin: Drinks ───────────────────────────────────────────────────────────

    def admin_get_drinks(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM drinks")
        return [dict(r) for r in c.fetchall()]

    def admin_add_drink(self, name, price, active):
        c = self.conn.cursor()
        c.execute("INSERT INTO drinks (name,price,active) VALUES (?,?,?)", (name, price, active))
        self.conn.commit()
        return c.lastrowid

    def admin_update_drink(self, did, name, price, active):
        c = self.conn.cursor()
        c.execute("UPDATE drinks SET name=?,price=?,active=? WHERE id=?", (name, price, active, did))
        self.conn.commit()

    def admin_delete_drink(self, did):
        c = self.conn.cursor()
        c.execute("DELETE FROM drinks WHERE id=?", (did,))
        self.conn.commit()

    # ── Admin: Recipes ──────────────────────────────────────────────────────────

    def admin_get_recipes_for_drink(self, drink_id: int):
        c = self.conn.cursor()
        c.execute("""
            SELECT r.id, b.id AS bottle_id, b.name AS bottle_name, r.amount_ml
            FROM recipes r
            JOIN bottles b ON r.bottle_id = b.id
            WHERE r.drink_id = ?
            ORDER BY r.id
        """, (drink_id,))
        return [dict(r) for r in c.fetchall()]

    def admin_set_recipes_for_drink(self, drink_id: int, ingredients: list):
        c = self.conn.cursor()
        c.execute("DELETE FROM recipes WHERE drink_id=?", (drink_id,))
        for ing in ingredients:
            c.execute(
                "INSERT INTO recipes (drink_id, bottle_id, amount_ml) VALUES (?,?,?)",
                (drink_id, ing["bottle_id"], ing["amount_ml"])
            )
        self.conn.commit()

    def admin_delete_recipe(self, rid):
        c = self.conn.cursor()
        c.execute("DELETE FROM recipes WHERE id=?", (rid,))
        self.conn.commit()

    # ── Admin: Limits ───────────────────────────────────────────────────────────

    def admin_get_limits(self):
        c = self.conn.cursor()
        c.execute("""
            SELECT l.id, b.name AS bottle_name, l.min_ml, l.max_ml
            FROM limits l JOIN bottles b ON l.bottle_id = b.id
        """)
        return [dict(r) for r in c.fetchall()]

    def admin_set_limit(self, bottle_id, min_ml, max_ml):
        c = self.conn.cursor()
        c.execute("""
            INSERT INTO limits (bottle_id, min_ml, max_ml) VALUES (?,?,?)
            ON CONFLICT(bottle_id) DO UPDATE SET min_ml=excluded.min_ml, max_ml=excluded.max_ml
        """, (bottle_id, min_ml, max_ml))
        self.conn.commit()

    # ── Admin: Transactions ─────────────────────────────────────────────────────

    def admin_get_transactions(self, limit: int = 100):
        c = self.conn.cursor()
        c.execute("""
            SELECT t.id, t.drink_id, t.drink_name, t.status,
                   t.msg_id, t.started_at, t.completed_at,
                   d.price
            FROM transactions t
            LEFT JOIN drinks d ON t.drink_id = d.id
            ORDER BY t.id DESC
            LIMIT ?
        """, (limit,))
        txns = [dict(r) for r in c.fetchall()]
        # Attach ingredient breakdown
        for txn in txns:
            c.execute("""
                SELECT bottle_name, amount_ml
                FROM transaction_ingredients
                WHERE transaction_id = ?
            """, (txn["id"],))
            txn["ingredients"] = [dict(r) for r in c.fetchall()]
        return txns
