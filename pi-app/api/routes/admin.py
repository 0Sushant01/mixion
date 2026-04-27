import secrets
import os
from typing import List
from fastapi import APIRouter, Header, HTTPException, Depends, Body
from db.database import Database

_active_tokens: set[str] = set()
ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")

router = APIRouter()

def require_auth(x_admin_token: str = Header(default="")):
    if x_admin_token not in _active_tokens:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.post("/admin/login")
def admin_login(data: dict):
    if data.get("username") == ADMIN_USER and data.get("password") == ADMIN_PASS:
        token = secrets.token_hex(32)
        _active_tokens.add(token)
        return {"token": token}
    raise HTTPException(status_code=403, detail="Invalid credentials")

@router.post("/admin/logout")
def admin_logout(x_admin_token: str = Header(default="")):
    _active_tokens.discard(x_admin_token)
    return {"status": "logged_out"}

_db: Database | None = None
def get_db() -> Database:
    global _db
    if _db is None:
        _db = Database()
    return _db

# ── Categories & Groups ─────────────────────────────────────────────────────
@router.get("/admin/categories", dependencies=[Depends(require_auth)])
def get_categories():
    return get_db().admin_get_categories()

@router.post("/admin/categories", dependencies=[Depends(require_auth)])
def add_category(data: dict):
    rid = get_db().admin_add_category(data["name"])
    return {"id": rid}

@router.put("/admin/categories/{cid}", dependencies=[Depends(require_auth)])
def update_category(cid: int, data: dict):
    get_db().admin_update_category(cid, data["name"])
    return {"status": "updated"}

@router.delete("/admin/categories/{cid}", dependencies=[Depends(require_auth)])
def delete_category(cid: int):
    get_db().admin_delete_category(cid)
    return {"status": "deleted"}

@router.get("/admin/groups", dependencies=[Depends(require_auth)])
def get_groups():
    return get_db().admin_get_groups()

@router.post("/admin/groups", dependencies=[Depends(require_auth)])
def add_group(data: dict):
    rid = get_db().admin_add_group(data["category_id"], data["name"])
    return {"id": rid}

@router.put("/admin/groups/{gid}", dependencies=[Depends(require_auth)])
def update_group(gid: int, data: dict):
    get_db().admin_update_group(gid, data["category_id"], data["name"])
    return {"status": "updated"}

@router.delete("/admin/groups/{gid}", dependencies=[Depends(require_auth)])
def delete_group(gid: int):
    get_db().admin_delete_group(gid)
    return {"status": "deleted"}

# ── Ingredient Types ────────────────────────────────────────────────────────
@router.get("/admin/ingredient_types", dependencies=[Depends(require_auth)])
def get_ingredient_types():
    return get_db().admin_get_ingredient_types()

@router.post("/admin/ingredient_types", dependencies=[Depends(require_auth)])
def add_ingredient_type(data: dict):
    rid = get_db().admin_add_ingredient_type(data["name"])
    return {"id": rid}

@router.put("/admin/ingredient_types/{tid}", dependencies=[Depends(require_auth)])
def update_ingredient_type(tid: int, data: dict):
    get_db().admin_update_ingredient_type(tid, data["name"])
    return {"status": "updated"}

@router.delete("/admin/ingredient_types/{tid}", dependencies=[Depends(require_auth)])
def delete_ingredient_type(tid: int):
    get_db().admin_delete_ingredient_type(tid)
    return {"status": "deleted"}

# ── Glasses ─────────────────────────────────────────────────────────────────
@router.get("/admin/glasses", dependencies=[Depends(require_auth)])
def get_glasses():
    return get_db().admin_get_glasses()

@router.post("/admin/glasses", dependencies=[Depends(require_auth)])
def add_glass(data: dict):
    rid = get_db().admin_add_glass(data["name"])
    return {"id": rid}

@router.put("/admin/glasses/{gid}", dependencies=[Depends(require_auth)])
def update_glass(gid: int, data: dict):
    get_db().admin_update_glass(gid, data["name"])
    return {"status": "updated"}

@router.delete("/admin/glasses/{gid}", dependencies=[Depends(require_auth)])
def delete_glass(gid: int):
    get_db().admin_delete_glass(gid)
    return {"status": "deleted"}

# ── Methods ─────────────────────────────────────────────────────────────────
@router.get("/admin/methods", dependencies=[Depends(require_auth)])
def get_methods():
    return get_db().admin_get_methods()

@router.post("/admin/methods", dependencies=[Depends(require_auth)])
def add_method(data: dict):
    rid = get_db().admin_add_method(data["name"])
    return {"id": rid}

@router.put("/admin/methods/{mid}", dependencies=[Depends(require_auth)])
def update_method(mid: int, data: dict):
    get_db().admin_update_method(mid, data["name"])
    return {"status": "updated"}

@router.delete("/admin/methods/{mid}", dependencies=[Depends(require_auth)])
def delete_method(mid: int):
    get_db().admin_delete_method(mid)
    return {"status": "deleted"}

# ── Extras ──────────────────────────────────────────────────────────────────
@router.get("/admin/extras", dependencies=[Depends(require_auth)])
def get_extras():
    return get_db().admin_get_extras()

@router.post("/admin/extras", dependencies=[Depends(require_auth)])
def add_extra(data: dict):
    rid = get_db().admin_add_extra(data["name"], data.get("price", 0.0))
    return {"id": rid}

@router.put("/admin/extras/{eid}", dependencies=[Depends(require_auth)])
def update_extra(eid: int, data: dict):
    get_db().admin_update_extra(eid, data["name"], data.get("price", 0.0))
    return {"status": "updated"}

@router.delete("/admin/extras/{eid}", dependencies=[Depends(require_auth)])
def delete_extra(eid: int):
    get_db().admin_delete_extra(eid)
    return {"status": "deleted"}

# ── Ingredients ─────────────────────────────────────────────────────────────
@router.get("/admin/ingredients", dependencies=[Depends(require_auth)])
def get_ingredients():
    return get_db().admin_get_ingredients()

@router.post("/admin/ingredients", dependencies=[Depends(require_auth)])
def add_ingredient(data: dict):
    rid = get_db().admin_add_ingredient(data["name"], data["type_id"], data.get("enabled", 1))
    return {"id": rid}

@router.put("/admin/ingredients/{iid}", dependencies=[Depends(require_auth)])
def update_ingredient(iid: int, data: dict):
    get_db().admin_update_ingredient(iid, data["name"], data["type_id"], data.get("enabled", 1))
    return {"status": "updated"}

@router.delete("/admin/ingredients/{iid}", dependencies=[Depends(require_auth)])
def delete_ingredient(iid: int):
    get_db().admin_delete_ingredient(iid)
    return {"status": "deleted"}

# ── Lines ───────────────────────────────────────────────────────────────────
@router.get("/admin/lines", dependencies=[Depends(require_auth)])
def get_lines():
    return get_db().admin_get_lines()

@router.post("/admin/lines", dependencies=[Depends(require_auth)])
def add_line(data: dict):
    rid = get_db().admin_add_line(
        data["name"],
        data.get("calibration_type", "none"),
        float(data.get("calibration_value", 0.0))
    )
    return {"id": rid}

@router.put("/admin/lines/{lid}", dependencies=[Depends(require_auth)])
def update_line(lid: int, data: dict):
    get_db().admin_update_line(
        lid,
        data["name"],
        data.get("calibration_type", "none"),
        float(data.get("calibration_value", 0.0))
    )
    return {"status": "updated"}

@router.delete("/admin/lines/{lid}", dependencies=[Depends(require_auth)])
def delete_line(lid: int):
    get_db().admin_delete_line(lid)
    return {"status": "deleted"}

# ── Bottles ─────────────────────────────────────────────────────────────────
@router.get("/admin/bottles", dependencies=[Depends(require_auth)])
def get_bottles():
    return get_db().admin_get_bottles()

@router.post("/admin/bottles", dependencies=[Depends(require_auth)])
def add_bottle(data: dict):
    rid = get_db().admin_add_bottle(
        data.get("ingredient_id"), data["line_id"], data["flow_rate"],
        data.get("capacity_ml", 1000), data.get("current_ml", 1000), data.get("enabled", 1)
    )
    return {"id": rid}

@router.put("/admin/bottles/{bid}", dependencies=[Depends(require_auth)])
def update_bottle(bid: int, data: dict):
    get_db().admin_update_bottle(
        bid, data.get("ingredient_id"), data["line_id"], data["flow_rate"],
        data.get("capacity_ml", 1000), data.get("current_ml", 1000), data.get("enabled", 1)
    )
    return {"status": "updated"}

@router.post("/admin/bottles/{bid}/refill", dependencies=[Depends(require_auth)])
def refill_bottle(bid: int, data: dict):
    fill_to = data.get("fill_to_ml")
    if fill_to is None:
        raise HTTPException(status_code=400, detail="fill_to_ml required")
    get_db().admin_refill_bottle(bid, fill_to)
    return {"status": "refilled"}

@router.delete("/admin/bottles/{bid}", dependencies=[Depends(require_auth)])
def delete_bottle(bid: int):
    get_db().admin_delete_bottle(bid)
    return {"status": "deleted"}

# ── Drinks ──────────────────────────────────────────────────────────────────
@router.get("/admin/drinks", dependencies=[Depends(require_auth)])
def get_drinks():
    return get_db().admin_get_drinks()

@router.post("/admin/drinks", dependencies=[Depends(require_auth)])
def add_drink(data: dict):
    rid = get_db().admin_add_drink(
        data["id"], data["name"], data["category_id"], data["ui_group_id"],
        data["glass_id"], data["method_id"], data.get("has_ice", 1),
        data.get("price", 0), data.get("enabled", 1)
    )
    return {"id": rid}

@router.put("/admin/drinks/{did}", dependencies=[Depends(require_auth)])
def update_drink(did: str, data: dict):
    get_db().admin_update_drink(
        did, data["name"], data["category_id"], data["ui_group_id"],
        data["glass_id"], data["method_id"], data.get("has_ice", 1),
        data.get("price", 0), data.get("enabled", 1)
    )
    return {"status": "updated"}

@router.delete("/admin/drinks/{did}", dependencies=[Depends(require_auth)])
def delete_drink(did: str):
    get_db().admin_delete_drink(did)
    return {"status": "deleted"}

# ── Recipes ─────────────────────────────────────────────────────────────────
@router.get("/admin/recipes/{drink_id}", dependencies=[Depends(require_auth)])
def get_recipes_for_drink(drink_id: str):
    return get_db().admin_get_recipes_for_drink(drink_id)

@router.post("/admin/recipes/{drink_id}", dependencies=[Depends(require_auth)])
def save_recipes_for_drink(drink_id: str, data: dict = Body(...)):
    get_db().admin_set_recipes_for_drink(drink_id, data)
    return {"status": "saved"}

# ── Logs ────────────────────────────────────────────────────────────────────
@router.get("/admin/transactions", dependencies=[Depends(require_auth)])
def get_transactions(limit: int = 100):
    return get_db().admin_get_transactions(limit)

# ── Status ──────────────────────────────────────────────────────────────────
@router.get("/admin/status", dependencies=[Depends(require_auth)])
def get_status():
    import datetime
    from hardware.serial_client import SerialClient
    serial = SerialClient()
    return {
        "device": "online" if serial.device_online else "offline",
        "server_time": datetime.datetime.now().isoformat(),
        "active_sessions": len(_active_tokens)
    }
