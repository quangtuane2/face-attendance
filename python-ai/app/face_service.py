import os
import io
import logging
import numpy as np
from pathlib import Path
from typing import Optional
import cv2
from PIL import Image
import insightface
from insightface.app import FaceAnalysis

logger = logging.getLogger(__name__)

# Thư mục lưu embeddings
FACE_DATA_DIR = Path(__file__).parent.parent / "face_data"
FACE_DATA_DIR.mkdir(exist_ok=True)

# Ngưỡng cosine similarity để nhận diện thành công
RECOGNITION_THRESHOLD = 0.45


class FaceService:
    def __init__(self):
        self.app = None
        self._initialize_model()

    def _initialize_model(self):
        """Khởi tạo InsightFace với model buffalo_sc (nhẹ, chạy tốt trên CPU)"""
        try:
            logger.info("Loading InsightFace model buffalo_sc...")
            self.app = FaceAnalysis(
                name="buffalo_sc",
                providers=["CPUExecutionProvider"]  # Không cần GPU
            )
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load InsightFace model: {e}")
            raise

    def _decode_image(self, image_bytes: bytes) -> np.ndarray:
        """Chuyển bytes thành numpy array (BGR format cho OpenCV)"""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Không thể đọc ảnh, định dạng không hợp lệ")
        return img

    def _get_embedding_path(self, employee_id: str) -> Path:
        return FACE_DATA_DIR / f"{employee_id}.npy"

    def enroll_face(self, employee_id: str, image_bytes: bytes) -> dict:
        """
        Đăng ký khuôn mặt cho nhân viên.
        Trả về: {"success": bool, "message": str}
        """
        try:
            img = self._decode_image(image_bytes)
            faces = self.app.get(img)

            if len(faces) == 0:
                return {"success": False, "message": "Không phát hiện khuôn mặt trong ảnh"}

            if len(faces) > 1:
                return {"success": False, "message": f"Phát hiện {len(faces)} khuôn mặt. Chỉ được có 1 khuôn mặt trong ảnh"}

            # Lấy embedding từ khuôn mặt đầu tiên
            embedding = faces[0].normed_embedding  # đã chuẩn hóa L2

            # Lưu embedding
            embedding_path = self._get_embedding_path(employee_id)
            np.save(str(embedding_path), embedding)

            logger.info(f"Enrolled face for employee {employee_id}")
            return {"success": True, "message": "Đăng ký khuôn mặt thành công"}

        except Exception as e:
            logger.error(f"Error enrolling face for {employee_id}: {e}")
            return {"success": False, "message": f"Lỗi xử lý: {str(e)}"}

    def recognize_face(self, image_bytes: bytes) -> dict:
        """
        Nhận diện khuôn mặt từ ảnh.
        Trả về: {"recognized": bool, "employee_id": str|None, "confidence": float, "message": str}
        """
        try:
            img = self._decode_image(image_bytes)
            faces = self.app.get(img)

            if len(faces) == 0:
                return {
                    "recognized": False,
                    "employee_id": None,
                    "confidence": 0.0,
                    "message": "Không phát hiện khuôn mặt"
                }

            # Dùng khuôn mặt lớn nhất (gần camera nhất)
            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            query_embedding = face.normed_embedding

            # Load tất cả embeddings đã đăng ký
            best_employee_id = None
            best_similarity = -1.0

            embedding_files = list(FACE_DATA_DIR.glob("*.npy"))
            if not embedding_files:
                return {
                    "recognized": False,
                    "employee_id": None,
                    "confidence": 0.0,
                    "message": "Chưa có nhân viên nào đăng ký khuôn mặt"
                }

            for emb_file in embedding_files:
                stored_embedding = np.load(str(emb_file))
                # Cosine similarity (cả hai đã normalize)
                similarity = float(np.dot(query_embedding, stored_embedding))

                if similarity > best_similarity:
                    best_similarity = similarity
                    best_employee_id = emb_file.stem  # tên file = employee_id

            if best_similarity >= RECOGNITION_THRESHOLD:
                logger.info(f"Recognized employee {best_employee_id} with confidence {best_similarity:.3f}")
                return {
                    "recognized": True,
                    "employee_id": best_employee_id,
                    "confidence": round(best_similarity, 4),
                    "message": "Nhận diện thành công"
                }
            else:
                return {
                    "recognized": False,
                    "employee_id": None,
                    "confidence": round(best_similarity, 4),
                    "message": "Không tìm thấy khuôn mặt khớp trong hệ thống"
                }

        except Exception as e:
            logger.error(f"Error recognizing face: {e}")
            return {
                "recognized": False,
                "employee_id": None,
                "confidence": 0.0,
                "message": f"Lỗi xử lý: {str(e)}"
            }

    def delete_face(self, employee_id: str) -> dict:
        """Xóa embedding của nhân viên"""
        embedding_path = self._get_embedding_path(employee_id)
        if embedding_path.exists():
            embedding_path.unlink()
            logger.info(f"Deleted face embedding for employee {employee_id}")
            return {"success": True, "message": "Đã xóa dữ liệu khuôn mặt"}
        return {"success": False, "message": "Không tìm thấy dữ liệu khuôn mặt"}


# Singleton instance
_face_service: Optional[FaceService] = None


def get_face_service() -> FaceService:
    global _face_service
    if _face_service is None:
        _face_service = FaceService()
    return _face_service
