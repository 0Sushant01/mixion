# mixion
Automated beverage dispensing & measurement system — device control, bottle tracking, refrigeration management, and smart analytics.

**mixion** is a kiosk-style beverage dispensing demo built with Django (backend) and Next.js (frontend). It includes an owner dashboard for managing recipes and bottle slots, and a customer-facing flow for selecting, previewing, and "buying" drinks. Videos for recipes are stored as URLs in the database and are played in the UI.

**Key Features**
- Backend API (Django + DRF) with models: `Owner`, `Customer`, `DailyCount`, `BottleSlot`, `Recipe`.
- Frontend (Next.js + Tailwind) customer flow: `products` → `confirm` → `payment` → `ask`.
- Owner dashboard with CRUD for recipes and bottles, analytics, and optimistic delete/undo.
- Video previews: `Recipe.video_url` is stored in the DB and the frontend plays the MP4 / video URL dynamically.
- Auto-logout idle timer (15s) on customer pages.

**Quickstart (Windows / PowerShell)**

Prerequisites:
- Python 3.10+ (or your project Python version)
- Node.js 16+ and npm

Backend (Django)

1. Open a PowerShell terminal and move to the backend folder:

```
cd backend
```

2. (Recommended) Create and activate a virtual environment, then install dependencies:

```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

3. Run migrations and start the dev server:

```
python manage.py migrate
python manage.py runserver
```

The API will be available at `http://localhost:8000/api` by default.

Frontend (Next.js)

1. Open a new PowerShell terminal and move to the frontend folder:

```
cd frontend
```

2. Install dependencies and run the dev server:

```
npm install
npm run dev
```

3. Open the app in the browser (default Next dev port):

```
http://localhost:3000
```

Environment notes:
- The frontend reads `NEXT_PUBLIC_API_BASE` to point to the backend API (defaults to `http://localhost:8000/api`).
- Recipe videos come from `Recipe.video_url` in the database — update that field in the owner dashboard and the frontend will pick up the new URL (the products page polls every 10s for updates).
- Session state for the demo is stored in `localStorage` (key: `current_customer`) and `sessionStorage` (key: `selected_recipe`). This is a demo-only approach and not production-safe.

Troubleshooting
- If the frontend can't reach the API, confirm `NEXT_PUBLIC_API_BASE` or run both servers on the default ports.
- If migrations are missing, run `python manage.py makemigrations` then `python manage.py migrate`.

Contributing
- Make changes in a feature branch and open a pull request. Keep changes focused and follow the existing code style.

License
- This repository does not contain a formal license file. Add one if you intend to publish the project.

Enjoy the demo — ask if you want me to add automated tests, a production-ready authentication flow, or realtime recipe updates via websockets.
