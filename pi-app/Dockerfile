FROM python:3.11-slim

# Set environment variables for production
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Create a non-root user
RUN useradd -m -r appuser

# Set working directory
WORKDIR /app

# Install system dependencies (including curl for healthcheck and gosu for permissions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    curl \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip --no-cache-dir \
    && pip install --no-cache-dir -r requirements.txt

# Copy all project files into the container with correct ownership
COPY --chown=appuser:appuser . .

# Ensure data directory exists
RUN mkdir -p /app/data

# Make the entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Expose the API port
EXPOSE 8000

# Healthcheck to verify the FastAPI server is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:8000/health || exit 1

# Set the entrypoint to handle permissions before dropping to appuser
ENTRYPOINT ["/app/entrypoint.sh"]

# Start by running migrations, then start the FastAPI server
CMD ["sh", "-c", "python -m db.migrate && uvicorn api.app:app --host 0.0.0.0 --port 8000"]
