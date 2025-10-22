FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        libreoffice \
        libreoffice-writer \
        fonts-dejavu \
        fonts-liberation && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --upgrade pip

# Copy dependency file
COPY pyproject.toml .

# Install Python project (editable mode)
RUN pip install -e .

# Copy source code
COPY . .

# Expose ports for both FastAPI and MCP
EXPOSE 8000
EXPOSE 8080

# Environment toggle: default = backend
ENV RUN_MODE=api

# Entry command - auto-select between backend or MCP
CMD ["sh", "-c", "\
if [ \"$RUN_MODE\" = 'mcp' ]; then \
    echo 'Starting MCP Server...'; \
    python mcp_server.py; \
else \
    echo 'Starting FastAPI Backend...'; \
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload; \
fi"]