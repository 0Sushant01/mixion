from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from api.routes import recipes, orders, admin

app = FastAPI(title="Mixion Pi API")

# ── No-Cache Middleware (dev mode) ───────────────────────────────────────────
class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        # Apply no-cache to HTML, JS and CSS so browser always fetches fresh
        if path.endswith(('.html', '.js', '.css')) or path in ('/', '/admin', '/login'):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

app.add_middleware(NoCacheMiddleware)

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

