# AI-Assisted Collaborative Learning Platform using Cloud Computing

A unified cloud-based platform for students to collaborate in study groups, receive AI-assisted learning support (Google Gemini API), generate PDF summaries and quizzes, track study goals, and monitor learning analytics.

---

## 🛠️ Technology Stack

- **Frontend**: React.js (Vite + Tailwind CSS + Lucide Icons)
- **Backend**: Python (FastAPI + SQLAlchemy ORM)
- **Database**: PostgreSQL 16
- **Cloud**: AWS (EC2 / ECS / RDS / S3 readiness)
- **Containerization**: Docker & Docker Compose
- **AI Engine**: Google Gemini API
- **Real-Time Communication**: WebSockets & WebRTC

---

## 📁 Repository Structure

```
.
├── docker-compose.yml       # Docker Compose multi-container configuration
├── .env.example             # Root environment configuration template
├── README.md                # Project documentation & setup instructions
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application entrypoint & CORS setup
│   │   ├── api/v1/health.py # Health check endpoint (/health & /api/v1/health)
│   │   ├── core/            # Configuration & Database connection
│   │   ├── models/          # SQLAlchemy Database Models
│   │   ├── schemas/         # Pydantic Schemas
│   │   └── services/        # Business logic services
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Backend container build instructions
│   └── .env.example         # Backend environment variables
└── frontend/
    ├── src/
    │   ├── components/      # React UI components (LandingPage, etc.)
    │   ├── services/        # API client modules
    │   ├── App.jsx          # Root application component
    │   └── main.jsx         # React DOM entrypoint
    ├── package.json         # Node dependencies & scripts
    ├── vite.config.js       # Vite server & proxy configuration
    └── Dockerfile           # Frontend container build instructions
```

---

## 🚀 Getting Started Locally

### Prerequisites
- **Python**: 3.9+ installed
- **Node.js**: v18+ & `npm` installed
- **PostgreSQL**: PostgreSQL 16 installed & running on port 5432

---

### Step 1: PostgreSQL Database Setup

Ensure PostgreSQL is running locally on port `5432` with a database named `learning_platform`.

```bash
# macOS (Homebrew)
brew services start postgresql@16
createdb learning_platform
psql -d learning_platform -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';"
```

---

### Step 2: Backend Setup (FastAPI)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create & activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create environment file:
   ```bash
   cp .env.example .env
   ```

5. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Backend will be running at `http://localhost:8000`.  
   Interactive API documentation available at `http://localhost:8000/docs`.

---

### Step 3: Frontend Setup (React + Vite)

1. Open a new terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Frontend will be running at `http://localhost:5173`.

---

### Step 4: Running via Docker Compose (Optional)

To start PostgreSQL, FastAPI backend, and React frontend simultaneously with Docker:

```bash
docker-compose up --build
```

---

## 🧪 Verification & Testing

- **Backend Health Check**: Open `http://localhost:8000/health` in your browser or run:
  ```bash
  curl http://localhost:8000/health
  ```
  Expected Output:
  ```json
  {
    "status": "online",
    "project": "AI-Assisted Collaborative Learning Platform",
    "database": "connected"
  }
  ```

- **Frontend Landing Page**: Visit `http://localhost:5173` to see the live system status card verifying connection to the FastAPI backend and PostgreSQL database.
