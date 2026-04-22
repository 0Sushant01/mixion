import uuid
from fastapi import HTTPException

class PourService:
    def __init__(self, db, mqtt):
        self.db = db
        self.mqtt = mqtt

    def calculate_duration(self, amount_ml, flow_rate):
        duration = (amount_ml / flow_rate) + 0.3
        return round(duration, 2)

    def apply_calibration(self, amount_ml: float, calibration_type: str, calibration_value: float) -> float:
        if calibration_type == "percentage":
            adjusted = amount_ml + (amount_ml * calibration_value / 100.0)
        elif calibration_type == "volume":
            adjusted = amount_ml + calibration_value
        else:
            adjusted = amount_ml

        # Ensure final amount is never negative
        return max(0.0, adjusted)

    def prepare_jobs(self, drink_id):
        bottles = self.db.get_recipe_bottles(drink_id)
        if not bottles:
            raise HTTPException(status_code=404, detail="No recipe found for this drink, or missing physical bottles")

        jobs = []
        for b in bottles:
            if not b["enabled"]:
                raise HTTPException(status_code=409, detail=f"Bottle '{b['name']}' is disabled")
            
            # Apply hardware line calibration (percentage or volume)
            calibrated_amount = self.apply_calibration(
                amount_ml=b["amount_ml"],
                calibration_type=b.get("calibration_type", "none"),
                calibration_value=b.get("calibration_value", 0.0)
            )

            duration = self.calculate_duration(calibrated_amount, b["flow_rate"])
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
