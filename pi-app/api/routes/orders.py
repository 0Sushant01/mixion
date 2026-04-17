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
