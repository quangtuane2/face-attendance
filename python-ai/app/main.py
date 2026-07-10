import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.face_service import get_face_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo model khi server start
    logger.info("Initializing Face Recognition Service...")
    get_face_service()
    logger.info("Face Recognition Service ready!")
    yield
    logger.info("Shutting down Face Recognition Service")


app = FastAPI(
    title="Face Recognition AI Service",
    description="Microservice nhận diện khuôn mặt dùng InsightFace buffalo_sc",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — chỉ cho phép Spring Boot gọi vào
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "Face Recognition AI", "model": "buffalo_sc"}


# Enroll face
@app.post("/enroll/{employee_id}", tags=["Face"])
async def enroll_face(
    employee_id: str,
    image: UploadFile = File(..., description="Ảnh khuôn mặt nhân viên (jpg/png)")
):
    """
    Đăng ký khuôn mặt cho nhân viên.
    Gọi từ Spring Boot khi admin chụp ảnh nhân viên mới.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File phải là ảnh (jpg, png, webp)")

    image_bytes = await image.read()
    service = get_face_service()
    result = service.enroll_face(employee_id, image_bytes)

    if not result["success"]:
        raise HTTPException(status_code=422, detail=result["message"])

    return result


# Recognize face (check-in)
@app.post("/recognize", tags=["Face"])
async def recognize_face(
    image: UploadFile = File(..., description="Frame ảnh từ webcam")
):
    """
    Nhận diện khuôn mặt từ frame webcam.
    Gọi từ Spring Boot khi nhân viên đứng trước camera chấm công.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File phải là ảnh")

    image_bytes = await image.read()
    service = get_face_service()
    result = service.recognize_face(image_bytes)

    return result


# Delete face embedding
@app.delete("/enroll/{employee_id}", tags=["Face"])
async def delete_face(employee_id: str):
    """
    Xóa embedding khuôn mặt của nhân viên.
    Gọi từ Spring Boot khi admin xóa nhân viên khỏi hệ thống.
    """
    service = get_face_service()
    result = service.delete_face(employee_id)
    return result


# Run
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
