from fastapi import APIRouter

from app.utils.responses import success_response

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return success_response({"status": "ok"})
