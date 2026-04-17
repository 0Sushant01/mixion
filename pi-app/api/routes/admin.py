import secrets
import os
from typing import List
from fastapi import APIRouter, Header, HTTPException, Depends, Body

# ── Simple in-memory token store ────────────────────────────────────────────────
_active_tokens: set[str] = set()

ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")

router = APIRouter()

# ── Auth helper ─────────────────────────────────────────────────────────────────
def require_auth(x_admin_token: str = Header(default="")):
    if x_admin_token not in _active_tokens:
        raise HTTPException(status_code=401, detail="Unauthorized")

# ── Login ────────────────────────────────────────────────────────────────────────
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

# ── Singleton DB instance ────────────────────────────────────────────────────────
from db.database import Database
_db: Database | None = None

def get_db() -> Database:
    global _db
    if _db is None:
        _db = Database()
    return _db

# ── Bottles ──────────────────────────────────────────────────────────────────────
@router.get("/admin/bottles", dependencies=[Depends(require_auth)])
def get_bottles():
    return get_db().admin_get_bottles()

@router.post("/admin/bottles", dependencies=[Depends(require_auth)])
def add_bottle(data: dict):
    db = get_db()
    rid = db.admin_add_bottle(
        data["name"], data["position"], data["flow_rate"],
        data.get("enabled", 1),
        data.get("capacity_ml", 1000),
        data.get("current_ml", None)
    )
    return {"id": rid}

@router.put("/admin/bottles/{bid}", dependencies=[Depends(require_auth)])
def update_bottle(bid: int, data: dict):
    get_db().admin_update_bottle(
        bid, data["name"], data["position"], data["flow_rate"],
        data.get("enabled", 1),
        data.get("capacity_ml", 1000),
        data.get("current_ml", None)
    )
    return {"status": "updated"}

@router.post("/admin/bottles/{bid}/refill", dependencies=[Depends(require_auth)])
def refill_bottle(bid: int, data: dict):
    """Set current_ml for a bottle (refill operation)."""
    fill_to = data.get("fill_to_ml")
    if fill_to is None:
        raise HTTPException(status_code=400, detail="fill_to_ml required")
    get_db().admin_refill_bottle(bid, fill_to)
    return {"status": "refilled"}

@router.delete("/admin/bottles/{bid}", dependencies=[Depends(require_auth)])
def delete_bottle(bid: int):
    get_db().admin_delete_bottle(bid)
    return {"status": "deleted"}

# ── Drinks ───────────────────────────────────────────────────────────────────────
@router.get("/admin/drinks", dependencies=[Depends(require_auth)])
def get_drinks():
    return get_db().admin_get_drinks()

@router.post("/admin/drinks", dependencies=[Depends(require_auth)])
def add_drink(data: dict):
    rid = get_db().admin_add_drink(data["name"], data.get("price", 0), data.get("active", 1))
    return {"id": rid}

@router.put("/admin/drinks/{did}", dependencies=[Depends(require_auth)])
def update_drink(did: int, data: dict):
    get_db().admin_update_drink(did, data["name"], data.get("price", 0), data.get("active", 1))
    return {"status": "updated"}

@router.delete("/admin/drinks/{did}", dependencies=[Depends(require_auth)])
def delete_drink(did: int):
    get_db().admin_delete_drink(did)
    return {"status": "deleted"}

# ── Recipes (drink-scoped) ────────────────────────────────────────────────────
@router.get("/admin/recipes/{drink_id}", dependencies=[Depends(require_auth)])
def get_recipes_for_drink(drink_id: int):
    return get_db().admin_get_recipes_for_drink(drink_id)

@router.post("/admin/recipes/{drink_id}", dependencies=[Depends(require_auth)])
def save_recipes_for_drink(
    drink_id: int,
    data: List[dict] = Body(...)
):
    """Replace ALL ingredients for a drink in one atomic operation.
    Body: [{ bottle_id: int, amount_ml: float }, ...]
    """
    get_db().admin_set_recipes_for_drink(drink_id, data)
    return {"status": "saved"}

@router.delete("/admin/recipes/{drink_id}/{rid}", dependencies=[Depends(require_auth)])
def delete_single_recipe(drink_id: int, rid: int):
    get_db().admin_delete_recipe(rid)
    return {"status": "deleted"}

# ── Limits ────────────────────────────────────────────────────────────────────────
@router.get("/admin/limits", dependencies=[Depends(require_auth)])
def get_limits():
    return get_db().admin_get_limits()

@router.post("/admin/limits", dependencies=[Depends(require_auth)])
def set_limit(data: dict):
    get_db().admin_set_limit(data["bottle_id"], data["min_ml"], data["max_ml"])
    return {"status": "saved"}

# ── Transactions ──────────────────────────────────────────────────────────────────
@router.get("/admin/transactions", dependencies=[Depends(require_auth)])
def get_transactions(limit: int = 100):
    return get_db().admin_get_transactions(limit)

# ── Status ────────────────────────────────────────────────────────────────────────
@router.get("/admin/status", dependencies=[Depends(require_auth)])
def get_status():
    import datetime
    from mqtt.mqtt_client import MQTTClient
    mqtt = MQTTClient()
    return {
        "device": "online" if mqtt.device_online else "offline",
        "server_time": datetime.datetime.now().isoformat(),
        "active_sessions": len(_active_tokens)
    }
