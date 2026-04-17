import uuid
from fastapi import HTTPException

class PourService:
    def __init__(self, db, mqtt):
        self.db = db
        self.mqtt = mqtt

    def calculate_duration(self, amount_ml, flow_rate):
        duration = (amount_ml / flow_rate) + 0.3
        return round(duration, 2)

    def prepare_jobs(self, drink_id):
        recipes = self.db.get_recipes_for_drink(drink_id)
        if not recipes:
            raise HTTPException(status_code=404, detail="No recipe found for this drink")

        jobs = []
        for r in recipes:
            bottle = self.db.get_bottle(r["bottle_id"])
            if not bottle["enabled"]:
                raise HTTPException(status_code=409, detail=f"Bottle '{bottle['name']}' is disabled")
            duration = self.calculate_duration(r["amount_ml"], bottle["flow_rate"])
            jobs.append({"relay": bottle["position"], "duration_sec": duration})
        return jobs

    def dispense(self, drink_id):
        # 1. Pre-flight availability check
        available, reason = self.db.check_drink_availability(drink_id, device_online=self.mqtt.device_online)
        if not available:
            raise HTTPException(status_code=409, detail=f"Drink unavailable: {reason}")

        # 2. Get drink name for transaction log
        from db.database import Database
        drinks = self.db.admin_get_drinks()
        drink_name = next((d["name"] for d in drinks if d["id"] == drink_id), f"Drink #{drink_id}")

        # 3. Build hardware jobs
        jobs = self.prepare_jobs(drink_id)
        msg_id = str(uuid.uuid4())

        # 4. Create transaction record (status=started)
        txn_id = self.db.create_transaction(drink_id, drink_name, msg_id)

        # 5. Publish to hardware
        payload = {
            "cmd": "dispense_parallel",
            "jobs": jobs,
            "msg_id": msg_id
        }
        self.mqtt.publish(payload)

        # 6. Deduct inventory immediately (optimistic — hardware is fire-and-forget)
        try:
            self.db.deduct_bottles(drink_id, txn_id)
            self.db.complete_transaction(txn_id, "completed")
        except Exception as e:
            self.db.complete_transaction(txn_id, "failed")
            raise HTTPException(status_code=500, detail=f"Inventory update failed: {e}")

        return {
            "status": "started",
            "msg_id": msg_id,
            "transaction_id": txn_id
        }
