import json
import os
import time
import threading

class SerialClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SerialClient, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        self.use_mock_serial = False
        self.serial_port = "/dev/ttyUSB0"
        self.serial_baudrate = 115200
        self.device_id = "esp32_1"
        self.ser = None
        self.device_online = False
        self.running = False
        
        # Handshake tracking
        self.current_cmd = None
        
        # Heartbeat tracking
        self.last_heartbeat = time.time()
        self.heartbeat_timeout_sec = 25.0 # Allow 2 missed 12-sec heartbeats
        self.polling_interval_sec = 2.0

        # Load configuration
        config_path = os.path.join(os.path.dirname(__file__), "..", "config.json")
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
                self.use_mock_serial = config.get("use_mock_serial", False)
                self.serial_port = config.get("serial_port", "/dev/ttyUSB0")
                self.serial_baudrate = config.get("serial_baudrate", 115200)
                self.device_id = config.get("device_id", "esp32_1")
        except Exception as e:
            print(f"⚠️ Could not load config.json: {e}")

        if self.use_mock_serial:
            self.device_online = True  # Mock is always online
            print("🔧 Mock Serial Client Initialized (use_mock_serial is true)")
        else:
            try:
                import serial
                self.ser = serial.Serial(self.serial_port, self.serial_baudrate, timeout=1)
                time.sleep(2) # ESP RESET FIX
                
                self.running = True
                
                # Start serial read loop
                self.read_thread = threading.Thread(target=self._read_serial_loop, daemon=True)
                self.read_thread.start()
                
                # Start heartbeat loop
                self.heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
                self.heartbeat_thread.start()
                
                print(f"🔧 Real Serial Client Initialized (Port: {self.serial_port}@{self.serial_baudrate})")
                
            except ImportError:
                print("❌ pyserial not installed. Run: pip install pyserial")
                self.use_mock_serial = True
                self.device_online = True
            except Exception as e:
                print(f"❌ Failed to connect to Serial port: {e}")
                self.device_online = False

    def _heartbeat_loop(self):
        while self.running:
            # Check timeout
            if time.time() - self.last_heartbeat > self.heartbeat_timeout_sec:
                if self.device_online:
                    print("⚠️ ESP32 Heartbeat timeout. Marking device OFFLINE.")
                    self.device_online = False
            
            time.sleep(self.polling_interval_sec)

    def _read_serial_loop(self):
        buffer = ""
        while self.running:
            try:
                if not self.ser or not self.ser.is_open:
                    break
                    
                data = self.ser.read(self.ser.in_waiting or 1).decode(errors='ignore')
                
                if not data:
                    continue

                buffer += data

                # Process complete lines
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()

                    if not line:
                        continue

                    print("ESP → PI : " + line)

                    # --- Auto-fix malformed JSON from ESP ---
                    # Extract JSON object if there's garbage around it
                    start_idx = line.find('{')
                    end_idx = line.rfind('}')
                    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                        line = line[start_idx:end_idx+1]
                    
                    # Fix unquoted keys (e.g., {type:"LIVE"} -> {"type":"LIVE"})
                    import re
                    line = re.sub(r'([{,])\s*([a-zA-Z0-9_]+)\s*:', r'\1"\2":', line)
                    # ----------------------------------------

                    try:
                        parsed = json.loads(line)
                        self._handle_response(parsed)
                    except Exception as e:
                        print(f"JSON ERROR → {line}")

            except Exception as e:
                print(f"READ ERROR: {e}")
                break
                
    def _handle_response(self, resp):
        self.last_heartbeat = time.time()
        if not self.device_online:
            print("✅ ESP32 Activity received. Marking device ONLINE.")
            self.device_online = True

        rtype = resp.get("type")

        if rtype == "ACK":
            print("ACK received")
            if self.current_cmd and resp.get("jobs") == self.current_cmd["jobs"] and str(resp.get("msg_id")) == self.current_cmd["msg_id"]:
                print("ACK valid → sending VERIFIED")
                verified = {
                    "type": "VERIFIED",
                    "msg_id": self.current_cmd["msg_id"],
                    "jobs": self.current_cmd["jobs"]
                }
                self.send(verified)
            else:
                print("ACK INVALID → sending ERROR")
                error = {
                    "type": "ERROR",
                    "msg_id": resp.get("msg_id", self.current_cmd["msg_id"] if self.current_cmd else "")
                }
                self.send(error)

        elif rtype == "STARTED":
            print("STARTED")

        elif rtype == "STEP_DONE":
            print(f"STEP DONE Relay {resp.get('relay')}")

        elif rtype == "DONE":
            print("DONE")

        elif rtype == "DISCARDED":
            print("DISCARDED")

        elif rtype == "ERROR":
            print(f"ERROR: {resp.get('reason')}")

        elif rtype == "LIVE":
            print("HEARTBEAT")

    def send(self, payload):
        """Used internally for handshake responses or directly by external services for CMD."""
        if payload.get("type") == "CMD":
            self.current_cmd = payload
            
        payload_str = json.dumps(payload)
        
        if not self.use_mock_serial and self.ser and self.ser.is_open:
            try:
                print(f"📡 PI → ESP : {payload_str}")
                self.ser.write((payload_str + "\n").encode("utf-8"))
                self.ser.flush()
            except Exception as e:
                print(f"❌ Serial send failed: {e}")
        else:
            print(f"📡 SERIAL MOCK SEND: {payload_str}")
            # Mock immediately sending ACK and STARTED if it's a CMD
            if self.use_mock_serial and payload.get("type") == "CMD":
                threading.Timer(0.1, lambda: self._handle_response({"type": "ACK", "msg_id": payload.get("msg_id"), "jobs": payload.get("jobs")})).start()
                threading.Timer(0.5, lambda: self._handle_response({"type": "STARTED", "msg_id": payload.get("msg_id")})).start()
