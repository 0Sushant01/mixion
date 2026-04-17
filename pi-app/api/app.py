from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.routes import recipes, orders, admin

app = FastAPI(title="Mixion Pi API")

# Initialize DB on startup
from db.database import Database
_db = Database()

# Mount static frontend
app.mount("/static", StaticFiles(directory="web/static"), name="static")

app.include_router(recipes.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.get("/")
def serve_ui():
    return FileResponse("web/index.html")

@app.get("/login")
def serve_login():
    return FileResponse("web/login.html")

@app.get("/admin")
def serve_admin_page():
    return FileResponse("web/admin.html")
