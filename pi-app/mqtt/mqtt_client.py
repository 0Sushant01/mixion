import json
import os
import time
import threading

class MQTTClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MQTTClient, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        self.use_real_mqtt = False
        self.broker = "localhost"
        self.port = 1883
        self.device_id = "esp32_1"
        self.client = None
        self.device_online = False
        
        # Heartbeat tracking
        self.last_heartbeat = 0.0
        self.heartbeat_timeout_sec = 6.0
        self.polling_interval_sec = 2.0

        # Load configuration
        config_path = os.path.join(os.path.dirname(__file__), "..", "config.json")
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
                self.use_real_mqtt = config.get("use_real_mqtt", False)
                self.broker = config.get("mqtt_broker", "localhost")
                self.port = config.get("mqtt_port", 1883)
                self.device_id = config.get("device_id", "esp32_1")
        except Exception as e:
            print(f"⚠️ Could not load config.json: {e}")

        # Dynamic Topics
        self.topic_command = f"mixion/command/{self.device_id}"
        self.topic_status = f"mixion/status/{self.device_id}"
        self.topic_status_get = f"mixion/status/{self.device_id}/get"

        if not self.use_real_mqtt:
            self.device_online = True  # Mock is always online
            print("🔧 Mock MQTT Client Initialized (use_real_mqtt is false)")
        else:
            try:
                import paho.mqtt.client as mqtt
                self.client = mqtt.Client()
                self.client.on_connect = self._on_connect
                self.client.on_message = self._on_message
                self.client.connect(self.broker, self.port, 60)
                self.client.loop_start()
                print(f"🔧 Real MQTT Client Initialized (Broker: {self.broker}:{self.port})")
                
                # Start active polling loop
                self.polling_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
                self.polling_thread.start()
                
            except ImportError:
                print("❌ paho-mqtt not installed. Run: pip install paho-mqtt")
                self.use_real_mqtt = False
                self.device_online = False
            except Exception as e:
                print(f"❌ Failed to connect to MQTT broker: {e}")
                self.device_online = False

    def _heartbeat_loop(self):
        while True:
            if self.client and self.client.is_connected():
                # Publish status request
                try:
                    self.client.publish(self.topic_status_get, json.dumps({"cmd": "status"}))
                except Exception as e:
                    print(f"⚠️ Heartbeat publish failed: {e}")

                # Check timeout
                if time.time() - self.last_heartbeat > self.heartbeat_timeout_sec:
                    if self.device_online:
                        print("⚠️ ESP32 Heartbeat timeout. Marking device OFFLINE.")
                        self.device_online = False
                else:
                    if not self.device_online:
                        print("✅ ESP32 Heartbeat received. Marking device ONLINE.")
                        self.device_online = True
            
            time.sleep(self.polling_interval_sec)

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"🔌 Connected to MQTT Broker. Subscribing to {self.topic_status}")
            client.subscribe(self.topic_status)
        else:
            print(f"⚠️ MQTT Connect failed with code {rc}")

    def _on_message(self, client, userdata, msg):
        payload = msg.payload.decode('utf-8').strip().lower()
        if msg.topic == self.topic_status:
            # We assume any valid activity on the status topic resets the heartbeat
            # The ESP32 might send "online" or a JSON payload containing {"status": "online"}
            self.last_heartbeat = time.time()

    def publish(self, payload):
        payload_str = json.dumps(payload)
        
        if self.use_real_mqtt and self.client:
            try:
                self.client.publish(self.topic_command, payload_str)
                print(f"📡 Real MQTT PUBLISH [{self.topic_command}]: {payload_str}")
            except Exception as e:
                print(f"❌ Real MQTT publish failed: {e}")
        else:
            print(f"📡 MQTT MOCK PUBLISH [{self.topic_command}]: {payload_str}")
