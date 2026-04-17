# 🍹 Mixion Pi App

The Raspberry Pi Edge application for the Mixion drink dispensing system. This module serves the local kiosk-mode user interface, handles hardware pumps via MQTT, and runs a standalone FastAPI web server.

## 🚀 Getting Started

The application is bundled into a single bash start script. To automatically set up your virtual environment, install requirements, and run the FastAPI server, simply execute:

```bash
chmod +x run.sh
./run.sh
```

By default, the Uvicorn server will bind to `http://0.0.0.0:8000` and the frontend web interface will be accessible across your local network or locally on the Raspberry Pi web browser.

## 📂 Project Structure

- `api/` — The FastAPI application (`app.py`) and API routing endpoints (`recipes.py`, `orders.py`).
- `web/` — The vanilla HTML, CSS, and JS frontend directly served via static mounts.
- `services/` — The core business logic, such as pour duration calculations and validation.
- `db/` — SQLite database connectors and setups.
- `mqtt/` — The MQTT client responsible for passing relay closure messages to the ESP32.
- `hardware/` — Direct hardware interactions (basic Raspberry Pi pump controllers).
- `data/` — Holds out local persistence data such as `mixion.db`.
- `run.py` — The core Python Uvicorn bootstrapper.
- `run.sh` — Automated startup and dependency installation script.

## 🛠️ Technology Stack

- **Backend:** Python 3, FastAPI, Uvicorn, SQLite
- **Frontend:** Vanilla JavaScript, HTML5 Local Web App
- **Hardware Communications:** MQTT (Paho-MQTT)

## 🎛️ Admin Dashboard & Smart Inventory

Mixion includes a robust administrative backend accessible at `/login` (default: `admin` / `admin123`). 
The Admin Dashboard enables you to:
- **Manage Drinks & Recipes:** Add new drinks and dynamically assign multiple ingredients per drink.
- **Track Inventory:** View real-time bottle capacities and perform one-click refills.
- **Hardware Limits:** Set precise min/max safe dispensing limits for each bottle.
- **Transactions:** Monitor a full history of all dispensed drinks, including timestamp and exact ingredient usage.

The system automatically manages **Drink Availability**. If an ingredient drops below the required amount, or if the hardware goes offline, the drink is automatically marked as "⚠️ Out of Stock" on the kiosk frontend.

## 📡 MQTT Configuration

The system uses MQTT to communicate with the hardware (e.g., an ESP32 or Arduino). 
Configuration is handled in `pi-app/config.json`:

```json
{
    "use_real_mqtt": true,
    "mqtt_broker": "localhost",
    "mqtt_port": 1883,
    "mqtt_topic": "mixion/dispense",
    "mqtt_status_topic": "mixion/status"
}
```

- If `use_real_mqtt` is `false`, the system runs in Mock mode (printing commands to the console).
- If the ESP unexpectedly disconnects, the system expects an `offline` message on the `mixion/status` topic (via Last Will and Testament), which will automatically disable all drinks on the kiosk.
