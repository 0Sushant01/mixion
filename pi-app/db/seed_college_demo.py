"""
db/seed_college_demo.py — Safe, Idempotent Presentation Seed for Mixion Pi App
==============================================================================
Requirements:
  - Exactly three physical pump channels: Pump 1, Pump 2, Pump 3.
  - Three active bottles installed on the three pumps:
      * Pump 1: Lemon Juice
      * Pump 2: Sugar Syrup
      * Pump 3: Orange Juice
  - Eight non-alcoholic presentation drinks with clean descriptions and local images:
      1. Classic Lemonade (Available: Pump 1 + Pump 2)
      2. Mint Lemonade (Demonstrates Smart Inventory: missing Mint Syrup bottle)
      3. Orange Splash (Available: Pump 3 + Pump 1 + Pump 2 — 3 concurrent pumps)
      4. Mango Delight (Demonstrates Smart Inventory: missing Mango Puree bottle)
      5. Sweet Lime Cooler (Demonstrates Smart Inventory: missing Sweet Lime bottle)
      6. Green Apple Cooler (Demonstrates Smart Inventory: missing Green Apple bottle)
      7. Berry Blast (Demonstrates Smart Inventory: missing Berry Blend bottle)
      8. Tropical Sunrise (Demonstrates Smart Inventory: missing Pineapple/Grenadine)
  - Completely non-destructive: Preserves existing transactions, accounts, and custom calibrations.
"""

import sqlite3
import os

DB_PATH = os.path.join("data", "mixion.db")

def seed_database():
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    c = conn.cursor()

    print("🌱 Seeding College Presentation Non-Alcoholic Beverage Menu...")

    # 1. Categories
    c.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", ("Mocktails",))
    c.execute("SELECT id FROM categories WHERE name=?", ("Mocktails",))
    cat_mocktail_id = c.fetchone()[0]

    # 2. UI Groups
    c.execute("INSERT OR IGNORE INTO ui_groups (category_id, name) VALUES (?,?)", (cat_mocktail_id, "Citrus & Coolers"))
    c.execute("SELECT id FROM ui_groups WHERE name=?", ("Citrus & Coolers",))
    group_citrus_id = c.fetchone()[0]

    c.execute("INSERT OR IGNORE INTO ui_groups (category_id, name) VALUES (?,?)", (cat_mocktail_id, "Fruit Specials"))
    c.execute("SELECT id FROM ui_groups WHERE name=?", ("Fruit Specials",))
    group_fruit_id = c.fetchone()[0]

    # 3. Glasses & Methods
    glasses = ["Highball Glass", "Collins Glass", "Rock Glass"]
    glass_ids = {}
    for g in glasses:
        c.execute("INSERT OR IGNORE INTO glasses (name) VALUES (?)", (g,))
        c.execute("SELECT id FROM glasses WHERE name=?", (g,))
        glass_ids[g] = c.fetchone()[0]

    methods = ["Stirred", "Built Over Ice", "Shaken"]
    method_ids = {}
    for m in methods:
        c.execute("INSERT OR IGNORE INTO methods (name) VALUES (?)", (m,))
        c.execute("SELECT id FROM methods WHERE name=?", (m,))
        method_ids[m] = c.fetchone()[0]

    # 4. Ingredient Types
    ing_types = ["Juice", "Syrup", "Soda / Water"]
    type_ids = {}
    for t in ing_types:
        c.execute("INSERT OR IGNORE INTO ingredient_types (name) VALUES (?)", (t,))
        c.execute("SELECT id FROM ingredient_types WHERE name=?", (t,))
        type_ids[t] = c.fetchone()[0]

    # 5. Hardware Lines (EXACTLY 3 PUMPS)
    pumps = ["Pump 1", "Pump 2", "Pump 3"]
    line_ids = {}
    for p in pumps:
        c.execute("INSERT OR IGNORE INTO lines (name, calibration_type, calibration_value) VALUES (?, 'none', 0.0)", (p,))
        c.execute("SELECT id FROM lines WHERE name=?", (p,))
        line_ids[p] = c.fetchone()[0]

    # 6. Ingredients
    ingredients_data = [
        ("Lemon Juice", "Juice"),
        ("Sugar Syrup", "Syrup"),
        ("Orange Juice", "Juice"),
        ("Mint Syrup", "Syrup"),
        ("Mango Puree", "Juice"),
        ("Sweet Lime Juice", "Juice"),
        ("Green Apple Syrup", "Syrup"),
        ("Berry Blend", "Juice"),
        ("Pineapple Juice", "Juice"),
        ("Grenadine", "Syrup"),
    ]
    ing_ids = {}
    for name, itype in ingredients_data:
        c.execute("SELECT id FROM ingredients WHERE name=?", (name,))
        row = c.fetchone()
        if row:
            ing_ids[name] = row[0]
        else:
            c.execute("INSERT INTO ingredients (name, type_id, enabled) VALUES (?, ?, 1)", (name, type_ids[itype]))
            ing_ids[name] = c.lastrowid

    # 7. Bottles (Strictly 3 Physical Bottles mapped to Pump 1, Pump 2, Pump 3)
    initial_bottles = [
        ("Lemon Juice", line_ids["Pump 1"], 5.0, 1000.0, 1000.0),
        ("Sugar Syrup", line_ids["Pump 2"], 5.0, 1000.0, 1000.0),
        ("Orange Juice", line_ids["Pump 3"], 5.0, 1000.0, 1000.0),
    ]

    for ing_name, lid, flow_rate, cap, curr in initial_bottles:
        ing_id = ing_ids[ing_name]
        c.execute("SELECT id FROM bottles WHERE line_id=?", (lid,))
        row = c.fetchone()
        if not row:
            c.execute("""
                INSERT INTO bottles (ingredient_id, line_id, flow_rate, capacity_ml, current_ml, enabled)
                VALUES (?, ?, ?, ?, ?, 1)
            """, (ing_id, lid, flow_rate, cap, curr))
        else:
            c.execute("UPDATE bottles SET ingredient_id=? WHERE line_id=? AND ingredient_id IS NULL", (ing_id, lid))

    # 8. Extras
    extras_data = [
        ("Extra Mint", 10.0),
        ("Extra Ice", 0.0),
        ("Less Sweet", 0.0),
        ("Lemon Slice", 5.0),
    ]
    extra_ids = {}
    for name, price in extras_data:
        c.execute("SELECT id FROM extras WHERE name=?", (name,))
        row = c.fetchone()
        if row:
            extra_ids[name] = row[0]
        else:
            c.execute("INSERT INTO extras (name, price) VALUES (?, ?)", (name, price))
            extra_ids[name] = c.lastrowid

    # 9. Non-Alcoholic Presentation Drinks
    drinks_data = [
        {
            "id": "classic-lemonade",
            "name": "Classic Lemonade",
            "category_id": cat_mocktail_id,
            "ui_group_id": group_citrus_id,
            "glass_id": glass_ids["Highball Glass"],
            "method_id": method_ids["Built Over Ice"],
            "has_ice": 1,
            "price": 50.0,
            "enabled": 1,
            "recipe": [
                ("Lemon Juice", 40.0),
                ("Sugar Syrup", 20.0),
            ],
            "extras": ["Extra Mint", "Extra Ice", "Less Sweet", "Lemon Slice"]
        },
        {
            "id": "mint-lemonade",
            "name": "Mint Lemonade",
            "category_id": cat_mocktail_id,
            "ui_group_id": group_citrus_id,
            "glass_id": glass_ids["Highball Glass"],
            "method_id": method_ids["Stirred"],
            "has_ice": 1,
            "price": 60.0,
            "enabled": 1,
            "recipe": [
                ("Lemon Juice", 30.0),
                ("Mint Syrup", 20.0),
            ],
            "extras": ["Extra Mint", "Extra Ice"]
        },
        {
            "id": "orange-splash",
            "name": "Orange Splash",
            "category_id": cat_mocktail_id,
            "ui_group_id": group_citrus_id,
            "glass_id": glass_ids["Highball Glass"],
            "method_id": method_ids["Built Over Ice"],
            "has_ice": 1,
            "price": 55.0,
            "enabled": 1,
            "recipe": [
                ("Orange Juice", 50.0),
                ("Lemon Juice", 15.0),
                ("Sugar Syrup", 10.0),
            ],
            "extras": ["Extra Ice", "Less Sweet"]
        },
        {
            "id": "mango-delight",
            "name": "Mango Delight",
            "category_id": cat_mocktail_id,
            "ui_group_id": group_fruit_id,
            "glass_id": glass_ids["Collins Glass"],
            "method_id": method_ids["Shaken"],
            "has_ice": 1,
            "price": 65.0,
            "enabled": 1,
            "recipe": [
                ("Mango Puree", 50.0),
                ("Sugar Syrup", 15.0),
            ],
            "extras": ["Extra Ice"]
        },
        {
            "id": "sweet-lime-cooler",
            "name": "Sweet Lime Cooler",
            "category_id": cat_mocktail_id,
            "ui_group_id": group_citrus_id,
            "glass_id": glass_ids["Highball Glass"],
            "method_id": method_ids["Built Over Ice"],
            "has_ice": 1,
            "price": 50.0,
            "enabled": 1,
            "recipe": [
                ("Sweet Lime Juice", 45.0),
                ("Sugar Syrup", 20.0),
            ],
            "extras": ["Extra Mint", "Extra Ice"]
        },
        {
            "id": "green-apple-cooler",
            "name": "Green Apple Cooler",
            "category_id": cat_mocktail_id,
            "ui_group_id": group_citrus_id,
            "glass_id": glass_ids["Collins Glass"],
            "method_id": method_ids["Stirred"],
            "has_ice": 1,
            "price": 60.0,
            "enabled": 1,
            "recipe": [
                ("Green Apple Syrup", 30.0),
                ("Lemon Juice", 20.0),
            ],
            "extras": ["Extra Ice", "Less Sweet"]
        },
        {
            "id": "berry-blast",
            "name": "Berry Blast",
            "category_id": cat_mocktail_id,
            "ui_group_id": group_fruit_id,
            "glass_id": glass_ids["Collins Glass"],
            "method_id": method_ids["Built Over Ice"],
            "has_ice": 1,
            "price": 70.0,
            "enabled": 1,
            "recipe": [
                ("Berry Blend", 50.0),
                ("Sugar Syrup", 15.0),
            ],
            "extras": ["Extra Ice"]
        },
        {
            "id": "tropical-sunrise",
            "name": "Tropical Sunrise",
            "category_id": cat_mocktail_id,
            "ui_group_id": group_fruit_id,
            "glass_id": glass_ids["Collins Glass"],
            "method_id": method_ids["Built Over Ice"],
            "has_ice": 1,
            "price": 65.0,
            "enabled": 1,
            "recipe": [
                ("Orange Juice", 40.0),
                ("Pineapple Juice", 30.0),
                ("Grenadine", 10.0),
            ],
            "extras": ["Extra Ice", "Lemon Slice"]
        },
    ]

    for d in drinks_data:
        did = d["id"]
        c.execute("SELECT id FROM drinks WHERE id=?", (did,))
        row = c.fetchone()
        if not row:
            c.execute("""
                INSERT INTO drinks (id, name, category_id, ui_group_id, glass_id, method_id, has_ice, price, enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (did, d["name"], d["category_id"], d["ui_group_id"], d["glass_id"], d["method_id"], d["has_ice"], d["price"], d["enabled"]))
        else:
            c.execute("""
                UPDATE drinks SET name=?, category_id=?, ui_group_id=?, glass_id=?, method_id=?, has_ice=?, price=?, enabled=?
                WHERE id=?
            """, (d["name"], d["category_id"], d["ui_group_id"], d["glass_id"], d["method_id"], d["has_ice"], d["price"], d["enabled"], did))

        # Re-set recipes for presentation drinks
        c.execute("DELETE FROM recipes WHERE drink_id=?", (did,))
        for ing_name, amt in d["recipe"]:
            c.execute("""
                INSERT INTO recipes (drink_id, ingredient_id, amount_ml)
                VALUES (?, ?, ?)
            """, (did, ing_ids[ing_name], amt))

        # Re-set extras
        c.execute("DELETE FROM recipe_extras WHERE drink_id=?", (did,))
        for ext_name in d["extras"]:
            if ext_name in extra_ids:
                c.execute("""
                    INSERT INTO recipe_extras (drink_id, extra_id)
                    VALUES (?, ?)
                """, (did, extra_ids[ext_name]))

    conn.commit()
    conn.close()
    print("✅ Seed complete! 8 Non-Alcoholic Presentation Drinks initialized.")
    print("   Pump 1: Lemon Juice | Pump 2: Sugar Syrup | Pump 3: Orange Juice")

if __name__ == "__main__":
    seed_database()
