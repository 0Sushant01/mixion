from fastapi import APIRouter
from db.database import Database
from mqtt.mqtt_client import MQTTClient

router = APIRouter()

db = Database()
mqtt = MQTTClient()

@router.get("/recipes")
def get_recipes():
    return db.get_all_drinks(device_online=mqtt.device_online)

@router.get("/drinks")
def get_drinks():
    return db.get_all_drinks(device_online=mqtt.device_online)

@router.get("/manual-extras/")
def get_manual_extras():
    return db.admin_get_extras()

