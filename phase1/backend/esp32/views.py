from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

class ProcessMixView(APIView):
    def post(self, request):
        """
        Receives mix data:
        [
            {"id": "b1", "quantity": 10},
            {"id": "b2", "quantity": 50}
        ]
        """
        mix_data = request.data
        if not isinstance(mix_data, list):
            return Response({"error": "Invalid data format. Expected a list."}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"Received mix request: {mix_data}")
        print(f"--- PROCESSING MIX ---")
        for item in mix_data:
            bottle_id = item.get('id')
            quantity = item.get('quantity')
            print(f"Pouring {quantity}ml from Bottle {bottle_id}")
        print(f"--- END MIX ---")

        # HERE: Add actual ESP32 communication logic (e.g., Serial, MQTT, HTTP request to ESP32 IP)
        
        return Response({"status": "success", "message": "Mix request processed", "data": mix_data}, status=status.HTTP_200_OK)
