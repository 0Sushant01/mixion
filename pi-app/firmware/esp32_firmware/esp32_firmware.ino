/*
  ==============================================================================
  🍹 MIXION ESP32 PUMP CONTROLLER FIRMWARE
  ==============================================================================
  Target Board : ESP32 (WROOM-32 / DevModule / NodeMCU-32S)
  Baud Rate    : 115200 baud
  Transport    : USB Serial (Newline-Delimited JSON / NDJSON)
  Channel Count: EXACTLY 3 PUMPS (Pump 1, Pump 2, Pump 3)
  Checksum     : NONE (Pure JSON framing, NO CRC32)
  Protocol     : 2-Stage Handshake (CMD -> ACK -> VERIFIED -> STARTED -> DONE)

  WIRING & HARDWARE NOTES:
  ------------------------------------------------------------------------------
  Supplied Wire Connections:
    - Black : Ground (GND - Common ground between ESP32, Relay Board & PSU)
    - Red   : 5V Power (VCC for Relay Board / Module)
    - Blue  : GPIO 21 (Default ESP32 I2C SDA / Direct GPIO)
    - Green : GPIO 22 (Default ESP32 I2C SCL / Direct GPIO)

  Module Identification note ("12C PW 535IC"):
    GPIO 21 and 22 are the hardware I2C bus (SDA/SCL) on standard ESP32 boards.
    If using an I2C Relay Module (e.g., PCF8574/PCA9685), set:
      #define HARDWARE_MODE MODE_I2C_EXPANDER
    If using a standard discrete 3-Channel 5V Relay Board, set:
      #define HARDWARE_MODE MODE_DIRECT_GPIO
    (Default is MODE_DIRECT_GPIO with safe default pins for Pump 1, 2, 3)

  SAFETY FEATURES:
    - All relays initialize to confirmed OFF state before Serial or timers start.
    - Max duration safety limit (default 60s) prevents overflow.
    - Non-blocking execution using millis().
  ==============================================================================
*/

#include <Arduino.h>
#include <ArduinoJson.h>
#include <Wire.h>

// ── Hardware Mode Configuration ──────────────────────────────────────────────
#define MODE_DIRECT_GPIO       1  // Discrete GPIO control per pump
#define MODE_I2C_EXPANDER      2  // I2C bus control on GPIO 21 (SDA) & GPIO 22 (SCL)

// Select your hardware mode here:
#define HARDWARE_MODE MODE_I2C_EXPANDER

// ── Relay Logic Level ────────────────────────────────────────────────────────
// PCA9535 relay boards with ULN2803 driver turn ON with HIGH (1) and OFF with LOW (0).
#define RELAY_ACTIVE_LOW false

#if RELAY_ACTIVE_LOW
  #define RELAY_STATE_ON   LOW
  #define RELAY_STATE_OFF  HIGH
#else
  #define RELAY_STATE_ON   HIGH
  #define RELAY_STATE_OFF  LOW
#endif

// ── Direct GPIO Pin Mapping (Strictly 3 Pumps) ──────────────────────────────
#define PIN_PUMP_1 16  // Channel 1 (Pump 1)
#define PIN_PUMP_2 17  // Channel 2 (Pump 2)
#define PIN_PUMP_3 18  // Channel 3 (Pump 3)

// ── I2C Configuration (PCA9535PW / PCF8575 / PCF8574 Expander) ───────────────
#define I2C_SDA_PIN 21       // Blue wire (GPIO 21 SDA)
#define I2C_SCL_PIN 22       // Green wire (GPIO 22 SCL)
uint8_t detectedI2cAddress = 0x20;   // Auto-detected on boot (default 0x20)
static uint16_t i2cOutputMask = 0x0000; // All relays OFF at startup (0x0000 = all OFF)

// ── Safety & Timing Limits ───────────────────────────────────────────────────
#define SERIAL_BAUD_RATE      115200
#define HEARTBEAT_INTERVAL_MS 3000
#define MAX_POUR_DURATION_SEC 60.0
#define JSON_BUFFER_SIZE      1024
#define SERIAL_RX_BUFFER_SIZE 512

// ── Pump State Structures ───────────────────────────────────────────────────
struct PumpJob {
  int channel;            // 1, 2, or 3
  String relayName;       // Original relay identifier from Pi (e.g. "Pump 1")
  unsigned long durationMs;
  unsigned long startTimeMs;
  bool active;
  bool completed;
};

// Machine State
enum ControllerState {
  STATE_IDLE,
  STATE_PENDING_VERIFICATION,
  STATE_POURING
};

ControllerState currentState = STATE_IDLE;

// Pending & Active Command
String pendingMsgId = "";
PumpJob currentJobs[3];
int currentJobCount = 0;
unsigned long verificationTimeoutMs = 5000;
unsigned long pendingTimestamp = 0;

String lastCompletedMsgId = "";
unsigned long lastHeartbeatTime = 0;

// Serial Buffer
char rxBuffer[SERIAL_RX_BUFFER_SIZE];
int rxIndex = 0;

// ── Low-Level Hardware Control (PCA9535PW / PCF8575 / PCF8574) ───────────────
void writeI2CExpander(uint16_t state) {
  // 1. PCA9535PW: Write Command byte 0x02 (Output Port 0), then Port 0 and Port 1
  Wire.beginTransmission(detectedI2cAddress);
  Wire.write(0x02); // Output Port 0 register
  Wire.write((uint8_t)(state & 0xFF));        // Pumps 1, 2, 3 on lower bits (P0_0, P0_1, P0_2)
  Wire.write((uint8_t)((state >> 8) & 0xFF)); // Port 1
  Wire.endTransmission();

  // 2. PCF8575 / PCF8574 direct raw write (fallback for quasi-bidirectional expanders)
  Wire.beginTransmission(detectedI2cAddress);
  Wire.write((uint8_t)(state & 0xFF));
  Wire.write((uint8_t)((state >> 8) & 0xFF));
  Wire.endTransmission();
}

void setPhysicalPump(int channel, bool turnOn) {
  int bit = channel - 1; // Channel 1 -> bit 0, Channel 2 -> bit 1, Channel 3 -> bit 2
  if (turnOn) {
    #if RELAY_ACTIVE_LOW
      i2cOutputMask &= ~(1 << bit); // Active LOW: 0 turns relay ON
    #else
      i2cOutputMask |= (1 << bit);
    #endif
  } else {
    #if RELAY_ACTIVE_LOW
      i2cOutputMask |= (1 << bit);  // Active LOW: 1 turns relay OFF
    #else
      i2cOutputMask &= ~(1 << bit);
    #endif
  }
  writeI2CExpander(i2cOutputMask);
}

void allPumpsOff() {
  #if RELAY_ACTIVE_LOW
    i2cOutputMask = 0xFFFF; // All outputs HIGH (OFF)
  #else
    i2cOutputMask = 0x0000;
  #endif
  writeI2CExpander(i2cOutputMask);
}

// ── Relay Identifier Normalizer ─────────────────────────────────────────────
int parseRelayChannel(const String& name) {
  String s = name;
  s.toLowerCase();
  s.trim();

  if (s == "1" || s == "pump 1" || s == "line 1" || s == "pump1" || s == "line1" || s == "relay_1" || s == "relay1") {
    return 1;
  }
  if (s == "2" || s == "pump 2" || s == "line 2" || s == "pump2" || s == "line2" || s == "relay_2" || s == "relay2") {
    return 2;
  }
  if (s == "3" || s == "pump 3" || s == "line 3" || s == "pump3" || s == "line3" || s == "relay_3" || s == "relay3") {
    return 3;
  }
  return -1; // Unsupported
}

// ── Outgoing Protocol Messages (NDJSON) ──────────────────────────────────────
void sendJson(const JsonDocument& doc) {
  serializeJson(doc, Serial);
  Serial.print("\n");
}

void sendHeartbeat() {
  StaticJsonDocument<64> doc;
  doc["type"] = "LIVE";
  sendJson(doc);
}

void sendError(const String& msgId, const String& reason) {
  StaticJsonDocument<128> doc;
  doc["type"] = "ERROR";
  if (msgId.length() > 0) doc["msg_id"] = msgId;
  doc["reason"] = reason;
  sendJson(doc);
}

void sendAck(const String& msgId, JsonArrayConst jobs) {
  StaticJsonDocument<512> doc;
  doc["type"] = "ACK";
  doc["msg_id"] = msgId;
  doc["jobs"] = jobs;
  sendJson(doc);
}

void sendStarted(const String& msgId) {
  StaticJsonDocument<128> doc;
  doc["type"] = "STARTED";
  doc["msg_id"] = msgId;
  sendJson(doc);
}

void sendStepDone(const String& relayName) {
  StaticJsonDocument<128> doc;
  doc["type"] = "STEP_DONE";
  doc["relay"] = relayName;
  sendJson(doc);
}

void sendDone(const String& msgId) {
  StaticJsonDocument<128> doc;
  doc["type"] = "DONE";
  doc["msg_id"] = msgId;
  sendJson(doc);
}

void sendDiscarded(const String& msgId, const String& reason) {
  StaticJsonDocument<128> doc;
  doc["type"] = "DISCARDED";
  if (msgId.length() > 0) doc["msg_id"] = msgId;
  doc["reason"] = reason;
  sendJson(doc);
}

// ── Command Handlers ────────────────────────────────────────────────────────
void handleCommand(JsonObjectConst root) {
  String msgId = root["msg_id"].as<String>();
  if (msgId.length() == 0) {
    sendError("", "Missing msg_id");
    return;
  }

  // Duplicate check
  if (msgId == lastCompletedMsgId) {
    sendDiscarded(msgId, "Duplicate command already completed");
    return;
  }

  if (currentState == STATE_POURING) {
    sendError(msgId, "Machine currently dispensing another order");
    return;
  }

  JsonArrayConst jobs = root["jobs"].as<JsonArrayConst>();
  if (jobs.isNull() || jobs.size() == 0) {
    sendError(msgId, "Empty jobs array");
    return;
  }

  // STRICT 3-PUMP LIMIT: Max 3 jobs per recipe
  if (jobs.size() > 3) {
    sendError(msgId, "Exceeds maximum physical pump limit of 3");
    return;
  }

  // Parse and validate each job
  currentJobCount = 0;
  for (JsonObjectConst job : jobs) {
    String relayName = job["relay"].as<String>();
    float durationSec = job["duration"].as<float>();

    int channel = parseRelayChannel(relayName);
    if (channel < 1 || channel > 3) {
      sendError(msgId, "Unsupported relay channel: " + relayName);
      return;
    }

    if (durationSec <= 0.0 || durationSec > MAX_POUR_DURATION_SEC) {
      sendError(msgId, "Invalid duration (must be between 0.1s and " + String(MAX_POUR_DURATION_SEC) + "s)");
      return;
    }

    currentJobs[currentJobCount].channel = channel;
    currentJobs[currentJobCount].relayName = relayName;
    currentJobs[currentJobCount].durationMs = (unsigned long)(durationSec * 1000.0);
    currentJobs[currentJobCount].startTimeMs = 0;
    currentJobs[currentJobCount].active = false;
    currentJobs[currentJobCount].completed = false;
    currentJobCount++;
  }

  // Validated! Store pending authorization
  pendingMsgId = msgId;
  pendingTimestamp = millis();
  currentState = STATE_PENDING_VERIFICATION;

  // Send ACK back to Pi
  sendAck(msgId, jobs);
}

void handleVerified(JsonObjectConst root) {
  String msgId = root["msg_id"].as<String>();

  if (currentState != STATE_PENDING_VERIFICATION || msgId != pendingMsgId) {
    sendError(msgId, "Unexpected or expired VERIFIED message");
    return;
  }

  // Authorization confirmed! Begin physical dispensing
  currentState = STATE_POURING;
  sendStarted(msgId);

  unsigned long now = millis();
  for (int i = 0; i < currentJobCount; i++) {
    currentJobs[i].startTimeMs = now;
    currentJobs[i].active = true;
    currentJobs[i].completed = false;
    setPhysicalPump(currentJobs[i].channel, true);
  }
}

// ── Inbound Message Router ──────────────────────────────────────────────────
void processIncomingJson(const char* jsonStr) {
  StaticJsonDocument<JSON_BUFFER_SIZE> doc;
  DeserializationError err = deserializeJson(doc, jsonStr);

  if (err) {
    sendError("", "JSON parse error");
    return;
  }

  const char* type = doc["type"];
  if (!type) {
    sendError("", "Missing message type");
    return;
  }

  if (strcmp(type, "CMD") == 0) {
    handleCommand(doc.as<JsonObjectConst>());
  } else if (strcmp(type, "VERIFIED") == 0) {
    handleVerified(doc.as<JsonObjectConst>());
  }
}

// ── Setup & Loop ────────────────────────────────────────────────────────────
void setup() {
  // Step 1: Initialize I2C Bus on GPIO 21 (SDA) and GPIO 22 (SCL)
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(100000); // 100 kHz standard mode

  // Auto-scan A0/A1/A2 address (0x20 to 0x27)
  detectedI2cAddress = 0x20;
  for (uint8_t addr = 0x20; addr <= 0x27; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      detectedI2cAddress = addr;
      break;
    }
  }

  // PCA9535PW Initialization: Configure Port 0 and Port 1 as OUTPUTS (0x00)
  Wire.beginTransmission(detectedI2cAddress);
  Wire.write(0x06); // Configuration register 0 (Port 0)
  Wire.write(0x00); // 0 = all pins outputs (P0_0 to P0_7)
  Wire.write(0x00); // Configuration register 1 (Port 1): all pins outputs (P1_0 to P1_7)
  Wire.endTransmission();

  // Ensure all relays are OFF at boot
  allPumpsOff();

  // Step 2: Initialize USB Serial communication at 115200 baud
  Serial.begin(SERIAL_BAUD_RATE);
  delay(100);

  // Send immediate heartbeat on boot
  sendHeartbeat();
  lastHeartbeatTime = millis();
}

void loop() {
  unsigned long now = millis();

  // 1. Periodic Heartbeat
  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = now;
    sendHeartbeat();
  }

  // 2. Verification Handshake Timeout Check
  if (currentState == STATE_PENDING_VERIFICATION) {
    if (now - pendingTimestamp > verificationTimeoutMs) {
      sendError(pendingMsgId, "Verification timeout (no VERIFIED received from Pi)");
      currentState = STATE_IDLE;
      pendingMsgId = "";
    }
  }

  // 3. Active Pouring Execution & Timing
  if (currentState == STATE_POURING) {
    bool anyActive = false;

    for (int i = 0; i < currentJobCount; i++) {
      if (currentJobs[i].active && !currentJobs[i].completed) {
        if (now - currentJobs[i].startTimeMs >= currentJobs[i].durationMs) {
          // Turn off this specific pump output
          setPhysicalPump(currentJobs[i].channel, false);
          currentJobs[i].active = false;
          currentJobs[i].completed = true;

          // Notify Pi that this step completed
          sendStepDone(currentJobs[i].relayName);
        } else {
          anyActive = true;
        }
      }
    }

    // When all active jobs finish:
    if (!anyActive) {
      allPumpsOff();
      currentState = STATE_IDLE;
      lastCompletedMsgId = pendingMsgId;
      sendDone(pendingMsgId);
      pendingMsgId = "";
    }
  }

  // 4. Read Inbound Serial Data (NDJSON: newline-delimited)
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      if (rxIndex > 0) {
        rxBuffer[rxIndex] = '\0';
        processIncomingJson(rxBuffer);
        rxIndex = 0;
      }
    } else {
      if (rxIndex < SERIAL_RX_BUFFER_SIZE - 1) {
        rxBuffer[rxIndex++] = c;
      } else {
        // Buffer overflow protection: reset and reject
        rxIndex = 0;
        sendError("", "Incoming serial buffer overflow");
      }
    }
  }
}
