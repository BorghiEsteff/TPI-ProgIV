# ==============================================================================
# Microservicio de Inteligencia Artificial (FastAPI + Groq)
# ==============================================================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8002

# Utilidad de salud
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Seguridad: Usuario no privilegiado (non-root)
RUN useradd -m -u 1001 aiuser
USER aiuser
WORKDIR /home/aiuser/app

COPY --chown=aiuser:aiuser requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

ENV PATH="/home/aiuser/.local/bin:$PATH"

COPY --chown=aiuser:aiuser . .

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]

