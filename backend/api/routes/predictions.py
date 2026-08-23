from fastapi import APIRouter

router = APIRouter()


@router.post("/")
async def base():
    return {"message": "predictions endpoint"}