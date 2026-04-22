from fastapi import APIRouter, HTTPException
from services.pour_service import PourService
from db.database import Database
from mqtt.mqtt_client import MQTTClient

router = APIRouter()

db = Database()
mqtt = MQTTClient()
pour_service = PourService(db, mqtt)

@router.post("/order")
def create_order(data: dict):
    drink_id = data.get("drink_id")
    if not drink_id:
        raise HTTPException(status_code=400, detail="drink_id required")
    # PourService raises HTTPException(409) if unavailable
    return pour_service.dispense(drink_id)

@router.post("/create-order/")
def create_order_with_extras(data: dict):
    drink_id = data.get("drink_id")
    if not drink_id:
        raise HTTPException(status_code=400, detail="drink_id required")
    # In the future, extras & price can be logged to the database.
    # For now, we process the hardware dispense exactly the same way.
    return pour_service.dispense(drink_id)
