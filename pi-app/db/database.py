import sqlite3
import os
from datetime import datetime

class Database:
    def __init__(self):
        os.makedirs("data", exist_ok=True)
        self.conn = sqlite3.connect("data/mixion.db", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self._init_schema()

    def _init_schema(self):
        c = self.conn.cursor()
        c.executescript("""
            CREATE TABLE IF NOT EXISTS categories (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ui_groups (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                name        TEXT NOT NULL,
                FOREIGN KEY(category_id) REFERENCES categories(id)
            );

            CREATE TABLE IF NOT EXISTS ingredient_types (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ingredients (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                name    TEXT NOT NULL,
                type_id INTEGER NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY(type_id) REFERENCES ingredient_types(id)
            );

            CREATE TABLE IF NOT EXISTS lines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS bottles (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                ingredient_id INTEGER,
                line_id       INTEGER NOT NULL,
                flow_rate     REAL NOT NULL DEFAULT 5.0,
                capacity_ml   REAL DEFAULT 1000,
                current_ml    REAL DEFAULT 1000,
                enabled       INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY(ingredient_id) REFERENCES ingredients(id),
                FOREIGN KEY(line_id) REFERENCES lines(id)
            );

            CREATE TABLE IF NOT EXISTS glasses (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS methods (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS drinks (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                category_id INTEGER NOT NULL,
                ui_group_id INTEGER NOT NULL,
                glass_id    INTEGER NOT NULL,
                method_id   INTEGER NOT NULL,
                has_ice     INTEGER NOT NULL DEFAULT 1,
                price       REAL DEFAULT 0.0,
                enabled     INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY(category_id) REFERENCES categories(id),
                FOREIGN KEY(ui_group_id) REFERENCES ui_groups(id),
                FOREIGN KEY(glass_id) REFERENCES glasses(id),
                FOREIGN KEY(method_id) REFERENCES methods(id)
            );

            CREATE TABLE IF NOT EXISTS recipes (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                drink_id      TEXT NOT NULL,
                ingredient_id INTEGER NOT NULL,
                amount_ml     REAL NOT NULL,
                FOREIGN KEY(drink_id)      REFERENCES drinks(id) ON DELETE CASCADE,
                FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
            );

            CREATE TABLE IF NOT EXISTS extras (
                id    INTEGER PRIMARY KEY AUTOINCREMENT,
                name  TEXT UNIQUE NOT NULL,
                price REAL DEFAULT 0.0
            );

            CREATE TABLE IF NOT EXISTS recipe_extras (
                drink_id TEXT NOT NULL,
                extra_id INTEGER NOT NULL,
                FOREIGN KEY(drink_id) REFERENCES drinks(id) ON DELETE CASCADE,
                FOREIGN KEY(extra_id) REFERENCES extras(id) ON DELETE CASCADE,
                PRIMARY KEY(drink_id, extra_id)
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                drink_id  TEXT NOT NULL,
                status    TEXT NOT NULL DEFAULT 'started',
                timestamp TEXT NOT NULL,
                FOREIGN KEY(drink_id) REFERENCES drinks(id) ON DELETE CASCADE
            );
        """)
        self.conn.commit()

    # ── Core: Availability & Frontend ─────────────────────────────────────────

    def check_drink_availability(self, drink_id: str, device_online: bool = True) -> tuple[bool, str]:
        if not device_online:
            return False, "Hardware Offline"

        c = self.conn.cursor()
        c.execute("SELECT enabled FROM drinks WHERE id=?", (drink_id,))
        row = c.fetchone()
        if not row or not row["enabled"]:
            return False, "Drink disabled"

        c.execute("""
            SELECT i.name as ingredient_name, r.amount_ml, b.current_ml, b.enabled as bottle_enabled, b.id as bottle_id
            FROM recipes r
            JOIN ingredients i ON i.id = r.ingredient_id
            LEFT JOIN bottles b ON b.ingredient_id = i.id
            WHERE r.drink_id = ?
        """, (drink_id,))
        rows = c.fetchall()

        if not rows:
            return False, "No recipe defined"

        for row in rows:
            if not row["bottle_id"]:
                return False, f"Missing bottle for {row['ingredient_name']}"
            if not row["bottle_enabled"]:
                return False, f"Bottle for {row['ingredient_name']} is disabled"
            if row["current_ml"] < row["amount_ml"]:
                return False, f"Low stock for {row['ingredient_name']} ({row['current_ml']:.0f}ml available, needs {row['amount_ml']}ml)"

        return True, "ok"

    # ── Media helper ────────────────────────────────────────────────────────
    _MEDIA_EXTS = [
        ("mp4", "video"),
        ("jpg", "image"),
        ("png", "image"),
        ("webp", "image"),
        ("avif", "image"),
        ("jpeg", "image"),
    ]
    _MEDIA_DIRS = [
        (
            os.path.join(os.path.dirname(__file__), "..", "web", "static", "media", "drinks"),
            "/static/media/drinks",
        ),
        (
            os.path.join(os.path.dirname(__file__), "..", "web", "static", "images"),
            "/static/images",
        ),
    ]

    def _resolve_media(self, drink_id: str):
        for base_dir, public_prefix in self._MEDIA_DIRS:
            base = os.path.normpath(base_dir)
            for ext, mtype in self._MEDIA_EXTS:
                path = os.path.join(base, f"{drink_id}.{ext}")
                if os.path.isfile(path):
                    return f"{public_prefix}/{drink_id}.{ext}", mtype
        return None, None

    def get_all_drinks(self, device_online: bool = True):
        c = self.conn.cursor()
        c.execute("""
            SELECT d.id, d.name, d.price, d.enabled, d.has_ice,
                   cat.name AS category, grp.name AS ui_group,
                   gl.name AS glass, meth.name AS method,
                   i.name AS ing_name, r.amount_ml,
                   b.current_ml, b.enabled as bottle_enabled, b.id as bottle_id
            FROM drinks d
            JOIN categories cat ON d.category_id = cat.id
            JOIN ui_groups grp ON d.ui_group_id = grp.id
            JOIN glasses gl ON d.glass_id = gl.id
            JOIN methods meth ON d.method_id = meth.id
            LEFT JOIN recipes r ON r.drink_id = d.id
            LEFT JOIN ingredients i ON i.id = r.ingredient_id
            LEFT JOIN bottles b ON b.ingredient_id = i.id
            WHERE d.enabled = 1
            ORDER BY cat.name, grp.name, d.id
        """)
        rows = c.fetchall()

        drinks_map = {}
        for row in rows:
            did = row["id"]
            if did not in drinks_map:
                media_url, media_type = self._resolve_media(did)
                drinks_map[did] = {
                    "id": did,
                    "name": row["name"],
                    "category": row["category"],
                    "ui_group": row["ui_group"],
                    "glass": row["glass"],
                    "method": row["method"],
                    "has_ice": bool(row["has_ice"]),
                    "price": row["price"],
                    "enabled": row["enabled"],
                    "available": True,
                    "unavailable_reason": None,
                    "ingredients": [],
                    "extras": [],
                    "media": media_url,
                    "media_type": media_type,
                }
            if row["ing_name"]:
                drinks_map[did]["ingredients"].append({
                    "name": row["ing_name"],
                    "amount_ml": row["amount_ml"]
                })
                if not row["bottle_id"]:
                    drinks_map[did]["available"] = False
                    drinks_map[did]["unavailable_reason"] = f"No bottle for {row['ing_name']}"
                elif not row["bottle_enabled"]:
                    drinks_map[did]["available"] = False
                    drinks_map[did]["unavailable_reason"] = f"Bottle for {row['ing_name']} disabled"
                elif row["current_ml"] < row["amount_ml"]:
                    drinks_map[did]["available"] = False
                    drinks_map[did]["unavailable_reason"] = f"Low stock for {row['ing_name']}"

        # Fetch extras for the menu
        c.execute("""
            SELECT re.drink_id, e.id as extra_id, e.name, e.price
            FROM recipe_extras re
            JOIN extras e ON e.id = re.extra_id
        """)
        for row in c.fetchall():
            did = row["drink_id"]
            if did in drinks_map:
                drinks_map[did]["extras"].append({
                    "id": row["extra_id"],
                    "name": row["name"],
                    "price": row["price"]
                })

        result = list(drinks_map.values())
        for d in result:
            if not device_online:
                d["available"] = False
                d["unavailable_reason"] = "Hardware Offline"
            elif not d["ingredients"]:
                d["available"] = False
                d["unavailable_reason"] = "No recipe set"

        return result

    def get_recipe_bottles(self, drink_id: str):
        c = self.conn.cursor()
        c.execute("""
            SELECT b.id, i.name, l.name as line_name, b.flow_rate, b.enabled, r.amount_ml
            FROM recipes r
            JOIN ingredients i ON i.id = r.ingredient_id
            JOIN bottles b ON b.ingredient_id = i.id
            JOIN lines l ON b.line_id = l.id
            WHERE r.drink_id = ?
        """, (drink_id,))
        return [dict(r) for r in c.fetchall()]

    # ── Transactions ─────────────────────────────────────────────────────────

    def create_transaction(self, drink_id: str) -> int:
        c = self.conn.cursor()
        c.execute(
            "INSERT INTO transactions (drink_id, status, timestamp) VALUES (?,?,?)",
            (drink_id, "started", datetime.now().isoformat())
        )
        self.conn.commit()
        return c.lastrowid

    def complete_transaction(self, txn_id: int, status: str = "completed"):
        c = self.conn.cursor()
        c.execute("UPDATE transactions SET status=? WHERE id=?", (status, txn_id))
        self.conn.commit()

    def deduct_bottles(self, drink_id: str):
        c = self.conn.cursor()
        c.execute("""
            SELECT b.id as bottle_id, r.amount_ml
            FROM recipes r
            JOIN bottles b ON b.ingredient_id = r.ingredient_id
            WHERE r.drink_id = ?
        """, (drink_id,))
        rows = c.fetchall()
        for row in rows:
            c.execute(
                "UPDATE bottles SET current_ml = MAX(0, current_ml - ?) WHERE id=?",
                (row["amount_ml"], row["bottle_id"])
            )
        self.conn.commit()

    # ── Admin: Categories & Groups ───────────────────────────────────────────

    def admin_get_categories(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM categories")
        return [dict(r) for r in c.fetchall()]

    def admin_add_category(self, name):
        c = self.conn.cursor()
        c.execute("INSERT INTO categories (name) VALUES (?)", (name,))
        self.conn.commit()
        return c.lastrowid

    def admin_update_category(self, cid, name):
        c = self.conn.cursor()
        c.execute("UPDATE categories SET name=? WHERE id=?", (name, cid))
        self.conn.commit()

    def admin_delete_category(self, cid):
        c = self.conn.cursor()
        c.execute("DELETE FROM categories WHERE id=?", (cid,))
        c.execute("DELETE FROM ui_groups WHERE category_id=?", (cid,))
        self.conn.commit()

    def admin_get_groups(self):
        c = self.conn.cursor()
        c.execute("""
            SELECT g.*, c.name as category_name
            FROM ui_groups g
            JOIN categories c ON g.category_id = c.id
        """)
        return [dict(r) for r in c.fetchall()]

    def admin_add_group(self, category_id, name):
        c = self.conn.cursor()
        c.execute("INSERT INTO ui_groups (category_id, name) VALUES (?,?)", (category_id, name))
        self.conn.commit()
        return c.lastrowid

    def admin_update_group(self, gid, category_id, name):
        c = self.conn.cursor()
        c.execute("UPDATE ui_groups SET category_id=?, name=? WHERE id=?", (category_id, name, gid))
        self.conn.commit()

    def admin_delete_group(self, gid):
        c = self.conn.cursor()
        c.execute("DELETE FROM ui_groups WHERE id=?", (gid,))
        self.conn.commit()

    # ── Admin: Ingredient Types ──────────────────────────────────────────────

    def admin_get_ingredient_types(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM ingredient_types")
        return [dict(r) for r in c.fetchall()]

    def admin_add_ingredient_type(self, name):
        c = self.conn.cursor()
        c.execute("INSERT INTO ingredient_types (name) VALUES (?)", (name,))
        self.conn.commit()
        return c.lastrowid

    def admin_update_ingredient_type(self, tid, name):
        c = self.conn.cursor()
        c.execute("UPDATE ingredient_types SET name=? WHERE id=?", (name, tid))
        self.conn.commit()

    def admin_delete_ingredient_type(self, tid):
        c = self.conn.cursor()
        c.execute("DELETE FROM ingredient_types WHERE id=?", (tid,))
        c.execute("DELETE FROM ingredients WHERE type_id=?", (tid,))
        self.conn.commit()

    # ── Admin: Glasses ───────────────────────────────────────────────────────

    def admin_get_glasses(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM glasses")
        return [dict(r) for r in c.fetchall()]

    def admin_add_glass(self, name):
        c = self.conn.cursor()
        c.execute("INSERT INTO glasses (name) VALUES (?)", (name,))
        self.conn.commit()
        return c.lastrowid

    def admin_update_glass(self, gid, name):
        c = self.conn.cursor()
        c.execute("UPDATE glasses SET name=? WHERE id=?", (name, gid))
        self.conn.commit()

    def admin_delete_glass(self, gid):
        c = self.conn.cursor()
        c.execute("DELETE FROM glasses WHERE id=?", (gid,))
        self.conn.commit()

    # ── Admin: Methods ───────────────────────────────────────────────────────

    def admin_get_methods(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM methods")
        return [dict(r) for r in c.fetchall()]

    def admin_add_method(self, name):
        c = self.conn.cursor()
        c.execute("INSERT INTO methods (name) VALUES (?)", (name,))
        self.conn.commit()
        return c.lastrowid

    def admin_update_method(self, mid, name):
        c = self.conn.cursor()
        c.execute("UPDATE methods SET name=? WHERE id=?", (name, mid))
        self.conn.commit()

    def admin_delete_method(self, mid):
        c = self.conn.cursor()
        c.execute("DELETE FROM methods WHERE id=?", (mid,))
        self.conn.commit()

    # ── Admin: Extras ────────────────────────────────────────────────────────

    def admin_get_extras(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM extras")
        return [dict(r) for r in c.fetchall()]

    def admin_add_extra(self, name, price=0.0):
        c = self.conn.cursor()
        c.execute("INSERT INTO extras (name, price) VALUES (?, ?)", (name, price))
        self.conn.commit()
        return c.lastrowid

    def admin_update_extra(self, eid, name, price=0.0):
        c = self.conn.cursor()
        c.execute("UPDATE extras SET name=?, price=? WHERE id=?", (name, price, eid))
        self.conn.commit()

    def admin_delete_extra(self, eid):
        c = self.conn.cursor()
        c.execute("DELETE FROM extras WHERE id=?", (eid,))
        c.execute("DELETE FROM recipe_extras WHERE extra_id=?", (eid,))
        self.conn.commit()

    # ── Admin: Ingredients ───────────────────────────────────────────────────

    def admin_get_ingredients(self):
        c = self.conn.cursor()
        c.execute("""
            SELECT i.*, t.name as type_name
            FROM ingredients i
            JOIN ingredient_types t ON i.type_id = t.id
        """)
        return [dict(r) for r in c.fetchall()]

    def admin_add_ingredient(self, name, type_id, enabled):
        c = self.conn.cursor()
        c.execute("INSERT INTO ingredients (name, type_id, enabled) VALUES (?,?,?)", (name, type_id, enabled))
        self.conn.commit()
        return c.lastrowid

    def admin_update_ingredient(self, iid, name, type_id, enabled):
        c = self.conn.cursor()
        c.execute("UPDATE ingredients SET name=?, type_id=?, enabled=? WHERE id=?", (name, type_id, enabled, iid))
        self.conn.commit()

    def admin_delete_ingredient(self, iid):
        c = self.conn.cursor()
        c.execute("DELETE FROM ingredients WHERE id=?", (iid,))
        c.execute("UPDATE bottles SET ingredient_id=NULL WHERE ingredient_id=?", (iid,))
        self.conn.commit()

    # ── Admin: Lines ─────────────────────────────────────────────────────────

    def admin_get_lines(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM lines")
        return [dict(r) for r in c.fetchall()]

    def admin_add_line(self, name):
        c = self.conn.cursor()
        c.execute("INSERT INTO lines (name) VALUES (?)", (name,))
        self.conn.commit()
        return c.lastrowid

    def admin_update_line(self, lid, name):
        c = self.conn.cursor()
        c.execute("UPDATE lines SET name=? WHERE id=?", (name, lid))
        self.conn.commit()

    def admin_delete_line(self, lid):
        c = self.conn.cursor()
        c.execute("DELETE FROM lines WHERE id=?", (lid,))
        self.conn.commit()

    # ── Admin: Bottles ───────────────────────────────────────────────────────

    def admin_get_bottles(self):
        c = self.conn.cursor()
        c.execute("""
            SELECT b.*, i.name as ingredient_name, l.name as line_name
            FROM bottles b
            LEFT JOIN ingredients i ON b.ingredient_id = i.id
            JOIN lines l ON b.line_id = l.id
        """)
        return [dict(r) for r in c.fetchall()]

    def admin_add_bottle(self, ingredient_id, line_id, flow_rate, capacity_ml, current_ml, enabled):
        c = self.conn.cursor()
        c.execute("""
            INSERT INTO bottles (ingredient_id, line_id, flow_rate, capacity_ml, current_ml, enabled)
            VALUES (?,?,?,?,?,?)
        """, (ingredient_id, line_id, flow_rate, capacity_ml, current_ml, enabled))
        self.conn.commit()
        return c.lastrowid

    def admin_update_bottle(self, bid, ingredient_id, line_id, flow_rate, capacity_ml, current_ml, enabled):
        c = self.conn.cursor()
        c.execute("""
            UPDATE bottles SET ingredient_id=?, line_id=?, flow_rate=?, capacity_ml=?, current_ml=?, enabled=?
            WHERE id=?
        """, (ingredient_id, line_id, flow_rate, capacity_ml, current_ml, enabled, bid))
        self.conn.commit()

    def admin_delete_bottle(self, bid):
        c = self.conn.cursor()
        c.execute("DELETE FROM bottles WHERE id=?", (bid,))
        self.conn.commit()

    def admin_refill_bottle(self, bid: int, fill_to_ml: float):
        c = self.conn.cursor()
        c.execute("SELECT current_ml FROM bottles WHERE id=?", (bid,))
        row = c.fetchone()
        if row:
            c.execute("UPDATE bottles SET current_ml = ? WHERE id=?", (fill_to_ml, bid))
            self.conn.commit()

    # ── Admin: Drinks ────────────────────────────────────────────────────────

    def admin_get_drinks(self):
        c = self.conn.cursor()
        c.execute("""
            SELECT d.*, cat.name as category_name, grp.name as group_name,
                   gl.name as glass_name, meth.name as method_name
            FROM drinks d
            JOIN categories cat ON d.category_id = cat.id
            JOIN ui_groups grp ON d.ui_group_id = grp.id
            JOIN glasses gl ON d.glass_id = gl.id
            JOIN methods meth ON d.method_id = meth.id
        """)
        return [dict(r) for r in c.fetchall()]

    def admin_add_drink(self, did, name, category_id, ui_group_id, glass_id, method_id, has_ice, price, enabled):
        c = self.conn.cursor()
        c.execute("""
            INSERT INTO drinks (id, name, category_id, ui_group_id, glass_id, method_id, has_ice, price, enabled)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (did, name, category_id, ui_group_id, glass_id, method_id, has_ice, price, enabled))
        self.conn.commit()
        return did

    def admin_update_drink(self, did, name, category_id, ui_group_id, glass_id, method_id, has_ice, price, enabled):
        c = self.conn.cursor()
        c.execute("""
            UPDATE drinks SET name=?, category_id=?, ui_group_id=?, glass_id=?, method_id=?, has_ice=?, price=?, enabled=? WHERE id=?
        """, (name, category_id, ui_group_id, glass_id, method_id, has_ice, price, enabled, did))
        self.conn.commit()

    def admin_delete_drink(self, did):
        c = self.conn.cursor()
        c.execute("DELETE FROM drinks WHERE id=?", (did,))
        c.execute("DELETE FROM recipes WHERE drink_id=?", (did,))
        c.execute("DELETE FROM recipe_extras WHERE drink_id=?", (did,))
        self.conn.commit()

    # ── Admin: Recipes ───────────────────────────────────────────────────────

    def admin_get_recipes_for_drink(self, drink_id: str):
        c = self.conn.cursor()
        c.execute("""
            SELECT r.id, r.ingredient_id, i.name as ingredient_name, r.amount_ml
            FROM recipes r
            JOIN ingredients i ON i.id = r.ingredient_id
            WHERE r.drink_id = ?
            ORDER BY r.id
        """, (drink_id,))
        ingredients = [dict(r) for r in c.fetchall()]
        
        c.execute("""
            SELECT re.extra_id, e.name as extra_name
            FROM recipe_extras re
            JOIN extras e ON e.id = re.extra_id
            WHERE re.drink_id = ?
        """, (drink_id,))
        extras = [dict(r) for r in c.fetchall()]
        
        return {"ingredients": ingredients, "extras": extras}

    def admin_set_recipes_for_drink(self, drink_id: str, data: dict):
        c = self.conn.cursor()
        c.execute("DELETE FROM recipes WHERE drink_id=?", (drink_id,))
        c.execute("DELETE FROM recipe_extras WHERE drink_id=?", (drink_id,))
        
        for ing in data.get("ingredients", []):
            c.execute(
                "INSERT INTO recipes (drink_id, ingredient_id, amount_ml) VALUES (?,?,?)",
                (drink_id, ing["ingredient_id"], ing["amount_ml"])
            )
            
        for ext in data.get("extras", []):
            c.execute(
                "INSERT INTO recipe_extras (drink_id, extra_id) VALUES (?,?)",
                (drink_id, ext["extra_id"])
            )
            
        self.conn.commit()

    # ── Admin: Logs ──────────────────────────────────────────────────────────

    def admin_get_transactions(self, limit: int = 100):
        c = self.conn.cursor()
        c.execute("""
            SELECT t.*, d.name as drink_name
            FROM transactions t
            LEFT JOIN drinks d ON t.drink_id = d.id
            ORDER BY t.id DESC LIMIT ?
        """, (limit,))
        return [dict(r) for r in c.fetchall()]
