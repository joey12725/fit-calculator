from fastapi import APIRouter, status
from pydantic import BaseModel, EmailStr
import uuid

router = APIRouter(prefix="/user")

class StartPayload(BaseModel):
    email: EmailStr

@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_user(payload: StartPayload):
    return {"userId": str(uuid.uuid4())}
