# 🍹 Mixion — College Presentation Setup & Firmware Upload Guide

**Target Date**: 22 October 2026  
**Environment**: Ubuntu Linux laptop  
**Application**: Existing Mixion Python/FastAPI `pi-app`  
**Microcontroller**: ESP32 connected via USB cable  
**Hardware Setup**: Exactly 3 Physical Pumps  
**Protocol**: Newline-delimited JSON (NDJSON) over USB Serial @ 115200 baud (No CRC32)

---

## 1. Starting the Application on Ubuntu

The existing application is configured to run locally on Ubuntu without requiring an active internet connection.

### Option A: Using the Automated Startup Script (Recommended)
From the `pi-app` root directory:
```bash
chmod +x run.sh
./run.sh
```
This script will:
1. Activate (or create) the Python virtual environment (`venv`).
2. Install dependencies from `requirements.txt`.
3. Run safe, idempotent database migrations (`python -m db.migrate`).
4. Ensure presentation drinks and 3-pump configuration are seeded (`python -m db.seed_college_demo`).
5. Launch Uvicorn on `http://0.0.0.0:8000`.

### Option B: Manual Startup
```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Run database migration and seed
python -m db.migrate
python -m db.seed_college_demo

# 3. Start the FastAPI server
python run.py
```

### Accessing the Interfaces
- **Kiosk Interface**: Open browser at `http://localhost:8000`
- **Admin Dashboard**: Open browser at `http://localhost:8000/login`
  - Default credentials: User: `admin` | Password: `admin123`

---

## 2. Identifying the Connected ESP32 Serial Device

When the ESP32 is plugged into the laptop via a data-capable micro-USB or USB-C cable:

1. List available serial ports:
   ```bash
   ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null
   ```
   Typically on Ubuntu, the device will appear as:
   - `/dev/ttyUSB0` (for CP2102 or CH340 USB-UART bridges)
   - `/dev/ttyACM0` (for ESP32 native USB or CDC ACM bridges)

2. Check kernel detection logs:
   ```bash
   dmesg | grep -i -E "tty|usb|cp210|ch341" | tail -n 15
   ```

3. Update `config.json` if your port differs from `/dev/ttyUSB0`:
   ```json
   {
       "use_mock_serial": false,
       "serial_port": "/dev/ttyUSB0",
       "serial_baudrate": 115200,
       "device_id": "esp32_1"
   }
   ```
   *(If testing without the physical ESP32, set `"use_mock_serial": true`)*.

---

## 3. Fixing Serial Port Permissions on Ubuntu

If you receive `Permission Denied` when connecting to `/dev/ttyUSB0` or uploading firmware:

1. Add your user account to the `dialout` group:
   ```bash
   sudo usermod -a -G dialout $USER
   ```
2. Apply the group change immediately (or log out and back in):
   ```bash
   newgrp dialout
   ```
3. Temporarily set read/write permissions if needed:
   ```bash
   sudo chmod 666 /dev/ttyUSB0
   ```

---

## 4. Compiling and Uploading ESP32 Firmware

The firmware source code is located at:
`firmware/esp32_firmware/esp32_firmware.ino`

### Method 1: Using Arduino IDE (GUI)
1. Open **Arduino IDE**.
2. Select your board under **Tools > Board > esp32 > ESP32 Dev Module**.
3. Install the required JSON library:
   - Open **Tools > Manage Libraries...**
   - Search for **ArduinoJson** (by Benoît Blanchon) and click **Install** (version 6.x or 7.x).
4. Open `firmware/esp32_firmware/esp32_firmware.ino`.
5. Select the port under **Tools > Port** (e.g. `/dev/ttyUSB0`).
6. Click **Upload** (Ctrl+U).

### Method 2: Using PlatformIO CLI
If PlatformIO Core is installed on your laptop:
```bash
cd firmware/esp32_firmware
pio run -t upload
```

---

## 5. Verifying Firmware Communication

1. Open the Serial Monitor at **115200 baud** (Arduino IDE Serial Monitor, `picocom`, or `minicom`):
   ```bash
   picocom -b 115200 /dev/ttyUSB0
   ```
   *(To exit picocom: press `Ctrl+A` then `Ctrl+X`)*.

2. **Heartbeat Check**:
   Within 3 seconds of boot, the ESP32 should print periodic JSON heartbeat lines:
   ```json
   {"type":"LIVE"}
   ```

3. **Handshake Verification**:
   When an order is placed from the Pi app, the communication will follow:
   - Pi $\to$ ESP: `{"type":"CMD","msg_id":"...","jobs":[{"relay":"Pump 1","duration":4.3}]}`
   - ESP $\to$ Pi: `{"type":"ACK","msg_id":"...","jobs":[...]}`
   - Pi $\to$ ESP: `{"type":"VERIFIED","msg_id":"...","jobs":[...]}`
   - ESP $\to$ Pi: `{"type":"STARTED","msg_id":"..."}`
   - ESP $\to$ Pi: `{"type":"STEP_DONE","relay":"Pump 1"}`
   - ESP $\to$ Pi: `{"type":"DONE","msg_id":"..."}`

---

## 6. Hardware Wiring & Pin Verification Before Activating Pumps

> ⚠️ **CRITICAL SAFETY NOTICE**: Keep all pump power supplies disconnected until wiring and pin polarity are physically verified.

### Supplied Wire Connections:
| Wire Color | Terminal | Connection Purpose |
| :--- | :--- | :--- |
| **Black** | Ground | **GND** (Common ground between ESP32, Relay Board, and Pump 12V PSU) |
| **Red** | 5V | **VCC** (5V Logic power for Relay Board) |
| **Blue** | GPIO 21 | Default ESP32 Hardware I2C SDA (or Direct Relay Input) |
| **Green** | GPIO 22 | Default ESP32 Hardware I2C SCL (or Direct Relay Input) |

### Module Note: `"12C PW 535IC"`
- Standard ESP32 boards use **GPIO 21 (SDA)** and **GPIO 22 (SCL)** for the I2C bus.
- **If using an I2C relay board** (e.g. PCF8574):
  In `esp32_firmware.ino`, ensure:
  ```cpp
  #define HARDWARE_MODE MODE_I2C_EXPANDER
  ```
- **If using a direct 3-channel relay board**:
  In `esp32_firmware.ino`, ensure:
  ```cpp
  #define HARDWARE_MODE MODE_DIRECT_GPIO
  #define PIN_PUMP_1 16
  #define PIN_PUMP_2 17
  #define PIN_PUMP_3 18
  ```
- **Relay Active State**:
  Most optocoupled relay modules trigger on **LOW**.
  If your relay module triggers on HIGH, set `#define RELAY_ACTIVE_LOW false` in `esp32_firmware.ino`.
- **Startup Protection**:
  The firmware unconditionally initializes all pump outputs to the **OFF** state on boot before establishing serial communication.

---

## 7. Presentation Drink Menu Summary

The presentation database is seeded with 8 non-alcoholic beverages:
1. **Classic Lemonade** — *Available* (Dispensed via Pump 1: Lemon Juice + Pump 2: Sugar Syrup)
2. **Orange Splash** — *Available* (Dispensed via Pump 3: Orange Juice + Pump 1: Lemon Juice + Pump 2: Sugar Syrup)
3. **Mint Lemonade** — *Unavailable* (Demonstrates Smart Inventory: missing Mint Syrup bottle)
4. **Mango Delight** — *Unavailable* (Demonstrates Smart Inventory: missing Mango Puree bottle)
5. **Sweet Lime Cooler** — *Unavailable* (Demonstrates Smart Inventory: missing Sweet Lime bottle)
6. **Green Apple Cooler** — *Unavailable* (Demonstrates Smart Inventory: missing Green Apple bottle)
7. **Berry Blast** — *Unavailable* (Demonstrates Smart Inventory: missing Berry Blend bottle)
8. **Tropical Sunrise** — *Unavailable* (Demonstrates Smart Inventory: missing Pineapple/Grenadine bottle)

All beverage images are stored locally under `web/static/images/` and will render immediately without internet access.
