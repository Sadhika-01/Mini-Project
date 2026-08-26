from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.groups import router as groups_router
from app.api.v1.eshelf import router as eshelf_router
from app.api.v1.ai_assistant import router as ai_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.leaderboard import router as leaderboard_router
from app.api.v1.planner import router as planner_router
from app.api.v1.chat import router as chat_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.flashcards import router as flashcards_router
from app.api.v1.meeting import router as meeting_router

# Auto-create database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router, tags=["Health"])
app.include_router(health_router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(groups_router, prefix=f"{settings.API_V1_STR}/groups", tags=["Groups"])
app.include_router(eshelf_router, prefix=settings.API_V1_STR, tags=["E-Shelf"])
app.include_router(ai_router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Assistant"])
app.include_router(analytics_router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])
app.include_router(leaderboard_router, prefix=f"{settings.API_V1_STR}/leaderboard", tags=["Leaderboard"])
app.include_router(planner_router, prefix=f"{settings.API_V1_STR}/planner", tags=["Planner"])
app.include_router(chat_router, prefix=settings.API_V1_STR, tags=["Realtime Chat"])
app.include_router(quizzes_router, prefix=f"{settings.API_V1_STR}/quizzes", tags=["Quizzes"])
app.include_router(flashcards_router, prefix=f"{settings.API_V1_STR}/flashcards", tags=["Flashcards"])
app.include_router(meeting_router, prefix=settings.API_V1_STR, tags=["Virtual Study Meetings"])

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "health": "/health"
    }
