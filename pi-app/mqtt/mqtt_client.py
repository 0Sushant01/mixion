import json
import os

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
        self.topic = "mixion/dispense"
        self.status_topic = "mixion/status"
        self.client = None
        self.device_online = False

        # Load configuration
        config_path = os.path.join(os.path.dirname(__file__), "..", "config.json")
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
                self.use_real_mqtt = config.get("use_real_mqtt", False)
                self.broker = config.get("mqtt_broker", "localhost")
                self.port = config.get("mqtt_port", 1883)
                self.topic = config.get("mqtt_topic", "mixion/dispense")
                self.status_topic = config.get("mqtt_status_topic", "mixion/status")
        except Exception as e:
            print(f"⚠️ Could not load config.json: {e}")

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
            except ImportError:
                print("❌ paho-mqtt not installed. Run: pip install paho-mqtt")
                self.use_real_mqtt = False
                self.device_online = False
            except Exception as e:
                print(f"❌ Failed to connect to MQTT broker: {e}")
                self.device_online = False

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"🔌 Connected to MQTT Broker. Subscribing to {self.status_topic}")
            client.subscribe(self.status_topic)
        else:
            print(f"⚠️ MQTT Connect failed with code {rc}")

    def _on_message(self, client, userdata, msg):
        payload = msg.payload.decode('utf-8').strip().lower()
        print(f"📨 MQTT MSG [{msg.topic}]: {payload}")
        if msg.topic == self.status_topic:
            if payload == "online":
                self.device_online = True
            elif payload == "offline":
                self.device_online = False

    def publish(self, payload):
        import json
        payload_str = json.dumps(payload)
        
        if self.use_real_mqtt and self.client:
            try:
                self.client.publish(self.topic, payload_str)
                print(f"📡 Real MQTT PUBLISH [{self.topic}]: {payload_str}")
            except Exception as e:
                print(f"❌ Real MQTT publish failed: {e}")
        else:
            print(f"📡 MQTT MOCK PUBLISH [{self.topic}]: {payload_str}")
