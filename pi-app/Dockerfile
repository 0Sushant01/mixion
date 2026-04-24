FROM python:3.11-slim

# -------------------------------
# Environment
# -------------------------------
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# -------------------------------
# Create non-root user
# -------------------------------
RUN useradd -m -u 1000 appuser

# -------------------------------
# Set working directory
# -------------------------------
WORKDIR /app

# -------------------------------
# Install system dependencies
# -------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    curl \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# -------------------------------
# Install Python dependencies
# -------------------------------
COPY requirements.txt .
RUN pip install --upgrade pip --no-cache-dir \
    && pip install --no-cache-dir -r requirements.txt

# -------------------------------
# Copy project files
# -------------------------------
COPY . .

# -------------------------------
# Create data directory (will be overridden by volume)
# -------------------------------
RUN mkdir -p /app/data

# -------------------------------
# Add entrypoint script
# -------------------------------
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# -------------------------------
# Expose port
# -------------------------------
EXPOSE 8000

# -------------------------------
# Healthcheck
# -------------------------------
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:8000/health || exit 1

# -------------------------------
# Entrypoint
# -------------------------------
ENTRYPOINT ["/app/entrypoint.sh"]

# -------------------------------
# Start app
# -------------------------------
CMD ["sh", "-c", "python -m db.migrate && uvicorn api.app:app --host 0.0.0.0 --port 8000"]