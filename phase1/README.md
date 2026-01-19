# Mixion - Phase 1

Mixion is a full-stack bottle management and drink mixing application. It consists of a Django backend (with a REST API and ESP32 integration) and a React frontend (Vite).

## Project Structure

```
mixion/phase1/
├── backend/                # Django Project
│   ├── app/                # 'Bottle' management logic
│   ├── esp32/              # Mixing logic & Hardware integration
│   ├── project/            # Django settings & configuration
│   └── manage.py
└── frontend/               # React (Vite) Project
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.jsx  # Video Loop & Touch to Start
    │   │   └── BottlePage.jsx   # Drink Selection & Logic
    │   └── App.jsx
    └── public/             # Static assets (idle.mp4)
```

## Features

### Backend (Django)
1.  **Bottle Management**:
    - Custom Model (`Bottle`) with `b1, b2, ...` auto-generated IDs.
    - Fields: `bottle_type`, `ingredient`.
    - Admin Interface: Manage bottles via `/admin/`.
2.  **REST API**:
    - `GET /api/bottles/`: List all available bottles.
    - `POST /api/bottles/`: Add new bottles.
3.  **ESP32 Integration**:
    - `POST /api/esp32/mix/`: Receives a list of `{id, quantity}` pairs to trigger the mixing process.
    - Currently logs the mix instructions to the console (ready for hardware implementation).

### Frontend (React + Vite)
1.  **Landing Page**:
    - Displays a full-screen looping video (`idle.mp4`) with audio.
    - "Touch Touch to Start" overlay.
    - Tapping anywhere navigates to the selection screen.
2.  **Bottle Selection Page**:
    - Fetches available bottles from the backend.
    - Allows users to select quantity (ml) for each bottle.
    - **"Mix It!" Button**: Sends the selection to the backend ESP32 API.
3.  **Idle Timeout**:
    - If no interaction (touch, click, scroll) occurs for **90 seconds**, the app automatically resets to the Landing Page.

## Setup & Running

### Prerequisites
- Python 3.x
- Node.js & npm

### 1. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```

Create and activate a virtual environment (optional but recommended):
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```
*(Dependencies: `django`, `djangorestframework`, `django-cors-headers`)*

Run Migrations:
```bash
python manage.py migrate
```

Start the Server:
```bash
python manage.py runserver
```
The backend will run at `http://127.0.0.1:8000/`.

### 2. Frontend Setup
Open a new terminal and navigate to the `frontend` directory:
```bash
cd frontend
```

Install Dependencies:
```bash
npm install
```

Start the Development Server:
```bash
npm run dev
```
The frontend will run at `http://localhost:5173/`.

### 3. Usage
1.  Open `http://localhost:5173/` in your browser (or Kiosk mode).
2.  Tap the screen to enter.
3.  Select quantities for your drinks.
4.  Click "Mix It!".
5.  Check the Backend terminal to see the "Pouring..." logs.
