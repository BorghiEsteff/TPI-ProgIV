# CineTrack - Media Tracker & Community Platform

Trabajo Práctico Integrador para la cátedra de **Programación IV** (Plan 2024).  
Universidad Tecnológica Nacional – Facultad Regional Resistencia (Extensión Áulica Goya).

**Docentes:**
- Ing. Juan Manuel Goya (Línea Python)
- Prof. Gerardo Ramírez (Línea JavaScript)

---

## 1. Declaración de Uso de Asistentes de IA
En cumplimiento con el reglamento de la cátedra, se declara el uso de asistentes de IA:
- **Herramienta utilizada:** Gemini Flash 3.8 Medium / Antigravity IDE.
- **Finalidad:** Asistencia en la generación de esqueletos de código y redacción de documentación técnica preliminar.
- **Responsabilidad:** Todo el código y arquitectura han sido revisados, comprendidos y son defendibles en su totalidad por los integrantes del equipo.

---

## 2. Arquitectura General y Tecnologías
- `backend-django/`: Django 5, DRF, PostgreSQL 16, SimpleJWT.
- `backend-node/`: Node.js 20, Express, Mongoose 8, MongoDB 7, Socket.IO 4.
- `service-ai/`: FastAPI, Pydantic v2, Ollama local (`llama3.2:1b`).
- `docs/`: Entregas oficiales de las Fases 0 a 5.

---

## 3. Instrucciones de Puesta en Marcha (Entorno Local)

### Requisitos previos
- Python 3.11+
- Node.js 20 LTS
- Git

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/BorghiEsteff/TPI-ProgIV.git
cd TPI-ProgIV
```

### Paso 2: Configurar variables de entorno
```bash
cp backend-django/.env.example backend-django/.env
cp backend-node/.env.example backend-node/.env
cp service-ai/.env.example service-ai/.env
```

### Paso 3: Inicializar Backend Django
```bash
cd backend-django
python -m venv venv
# En Windows:
.\venv\Scripts\activate
# En Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Paso 4: Inicializar Backend Node
```bash
cd ../backend-node
npm install
npm run dev
```

### Paso 5: Inicializar Microservicio de IA
```bash
cd ../service-ai
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```
