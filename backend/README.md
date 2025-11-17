# Mixion Backend (Django)

Quick start (development)

Prerequisites
- Python 3.10+ (use virtualenv)
- SQLite for local development (default)

Install dependencies
```powershell
cd backend
python -m pip install -r requirements.txt
```

Create migrations and run
```powershell
python manage.py makemigrations
python manage.py migrate
```

Create superuser
```powershell
python manage.py createsuperuser
```

Run server
```powershell
python manage.py runserver
```

Environment variables
- `SECRET_KEY` — production secret
- `DATABASE_URL` — if using Postgres
- `REDIS_URL` — if using Channels/Celery

Notes
- This project uses Django REST Framework and token auth for device/front-end integration.
- If you change the `AUTH_USER_MODEL`, be careful when migrating existing databases.
