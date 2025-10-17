FROM python:3.13-slim

# Install the application dependencies.
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y build-essential curl \
    libreoffice \
    libreoffice-writer \
    fonts-dejavu \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/* && \
    pip install --upgrade pip

# Copy pyproject.toml
COPY pyproject.toml .

# Install project dependencies (editable mode, assumes src layout)
RUN pip install -e .

COPY . .

# Expose backend port
EXPOSE 8000

# Run FastAPI with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]