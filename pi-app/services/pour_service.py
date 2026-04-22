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
        bottles = self.db.get_recipe_bottles(drink_id)
        if not bottles:
            raise HTTPException(status_code=404, detail="No recipe found for this drink, or missing physical bottles")

        jobs = []
        for b in bottles:
            if not b["enabled"]:
                raise HTTPException(status_code=409, detail=f"Bottle '{b['name']}' is disabled")
            duration = self.calculate_duration(b["amount_ml"], b["flow_rate"])
            jobs.append({"relay": b["line_name"], "duration_sec": duration})
        return jobs

    def dispense(self, drink_id):
        # 1. Pre-flight availability check
        available, reason = self.db.check_drink_availability(drink_id, device_online=self.mqtt.device_online)
        if not available:
            raise HTTPException(status_code=409, detail=f"Drink unavailable: {reason}")

        # 3. Build hardware jobs
        jobs = self.prepare_jobs(drink_id)
        msg_id = str(uuid.uuid4())

        # 4. Create transaction record (status=started)
        txn_id = self.db.create_transaction(drink_id)

        # 5. Publish to hardware
        payload = {
            "cmd": "dispense_parallel",
            "jobs": jobs,
            "msg_id": msg_id
        }
        self.mqtt.publish(payload)

        # 6. Deduct inventory immediately (optimistic — hardware is fire-and-forget)
        try:
            self.db.deduct_bottles(drink_id)
            self.db.complete_transaction(txn_id, "completed")
        except Exception as e:
            self.db.complete_transaction(txn_id, "failed")
            raise HTTPException(status_code=500, detail=f"Inventory update failed: {e}")

        return {
            "status": "started",
            "msg_id": msg_id,
            "transaction_id": txn_id
        }
