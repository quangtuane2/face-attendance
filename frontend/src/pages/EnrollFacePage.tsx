import { useRef, useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { employeeApi } from '../services/api'
import toast from 'react-hot-toast'

export default function EnrollFacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const webcamRef = useRef<Webcam>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState(false)

  useEffect(() => {
    if (!id) return
    employeeApi.getById(Number(id)).then(r => setEmployee(r.data)).finally(() => setLoading(false))
  }, [id])

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) setCapturedImage(imageSrc)
  }, [])

  const handleEnroll = async () => {
    if (!capturedImage || !id) return
    setEnrolling(true)
    try {
      const res = await fetch(capturedImage)
      const blob = await res.blob()
      const result = await employeeApi.enrollFaceBlob(Number(id), blob)
      if (result.data.success) {
        toast.success('Đăng ký khuôn mặt thành công! 🎉')
        setEnrolled(true)
        setTimeout(() => navigate('/employees'), 2000)
      } else {
        toast.error(result.data.message)
        setCapturedImage(null)
      }
    } catch {
      toast.error('Lỗi kết nối server')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) return <div className="text-center text-muted" style={{ padding: '4rem' }}>Đang tải...</div>
  if (!employee) return <div className="text-center text-muted" style={{ padding: '4rem' }}>Không tìm thấy nhân viên</div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Back */}
      <button className="btn btn-secondary btn-sm mb-4" onClick={() => navigate('/employees')}>
        ← Quay lại
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">📷 Đăng ký khuôn mặt</h1>
          <p className="page-subtitle">
            {employee.fullName} — {employee.employeeCode}
          </p>
        </div>
      </div>

      {enrolled ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '4rem' }}>✅</div>
          <h2 className="font-bold mt-4" style={{ fontSize: '1.3rem', color: 'var(--success)' }}>
            Đăng ký thành công!
          </h2>
          <p className="text-muted mt-2">Đang chuyển hướng về trang nhân viên...</p>
        </div>
      ) : (
        <div className="card">
          {/* Instructions */}
          <div style={{
            background: 'var(--accent-glow)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.875rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}>
            💡 <strong>Hướng dẫn:</strong> Nhìn thẳng vào camera, đảm bảo ánh sáng tốt, 
            chỉ có 1 khuôn mặt trong khung hình. Chụp → kiểm tra → Xác nhận đăng ký.
          </div>

          <div className="grid-2" style={{ alignItems: 'start' }}>
            {/* Webcam */}
            <div>
              <p className="form-label mb-2">📸 Camera trực tiếp</p>
              <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '2px solid var(--border)' }}>
                {!capturedImage ? (
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width={320} height={240}
                    videoConstraints={{ width: 320, height: 240, facingMode: 'user' }}
                    style={{ display: 'block' }}
                  />
                ) : (
                  <div style={{ width: 320, height: 240, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Camera đã tắt
                  </div>
                )}
              </div>
              <button id="btn-capture-face" className="btn btn-primary w-full mt-3" onClick={capture} disabled={!!capturedImage}>
                📷 Chụp ảnh
              </button>
            </div>

            {/* Preview */}
            <div>
              <p className="form-label mb-2">🖼️ Ảnh đã chụp</p>
              <div style={{
                width: '100%', height: 240,
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                background: 'var(--bg-secondary)',
              }}>
                {capturedImage ? (
                  <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="text-center text-muted">
                    <div style={{ fontSize: '2rem' }}>📷</div>
                    <div className="text-sm mt-2">Chưa có ảnh</div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCapturedImage(null)} disabled={!capturedImage}>
                  🔄 Chụp lại
                </button>
                <button id="btn-confirm-enroll" className="btn btn-success" style={{ flex: 1 }} onClick={handleEnroll} disabled={!capturedImage || enrolling}>
                  {enrolling ? <><span className="loading-spinner" /> Đang xử lý...</> : '✅ Xác nhận đăng ký'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
