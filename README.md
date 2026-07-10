# Face Attendance System 👁️

Hệ thống chấm công nhận diện khuôn mặt — Microservices Architecture

## Kiến trúc
- **Frontend**: React + TypeScript + Vite (port 5173)
- **Backend Java**: Spring Boot 3.3 (port 8080) — nghiệp vụ, auth, báo cáo
- **Backend Python**: FastAPI + InsightFace (port 8000) — AI nhận diện
- **Database**: MySQL

## Cài đặt & Chạy

### 1. Database
```sql
-- Tạo database và import schema
mysql -u root -p < database.sql
```

### 2. Python AI Service
```bash
cd python-ai
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Spring Boot Backend
```bash
cd backend-java
# Cập nhật application.properties: DB password
mvn spring-boot:run
```

### 4. React Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tài khoản mặc định
- URL: http://localhost:5173
- Username: `admin`
- Password: `Admin@123`

## Luồng sử dụng
1. Đăng nhập → Admin dashboard
2. **Thêm phòng ban** (Departments)
3. **Cấu hình ca làm việc** (Shifts)
4. **Thêm nhân viên** → gán phòng ban + ca (Employees)
5. **Đăng ký khuôn mặt** → click 📷 trên từng nhân viên → chụp ảnh
6. **Chấm công**: vào http://localhost:5173/checkin → bật quét tự động
