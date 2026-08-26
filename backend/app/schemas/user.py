from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, example="Vasudev Dasari")
    email: EmailStr = Field(..., example="vasudev@example.com")
    password: str = Field(..., min_length=6, max_length=100, example="secret123")

class UserLogin(BaseModel):
    email: EmailStr = Field(..., example="vasudev@example.com")
    password: str = Field(..., example="secret123")

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
