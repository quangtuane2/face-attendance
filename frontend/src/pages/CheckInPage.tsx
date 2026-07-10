import { useRef, useState, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { attendanceApi } from '../services/api'

type ResultState = {
  success: boolean
  message: string
  checkType?: string
  status?: string
  checkTime?: string
  employee?: { fullName: string; department: string; employeeCode: string }
  confidence?: number
} | null

export default function CheckInPage() {
  const webcamRef = useRef<Webcam>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ResultState>(null)
  const [autoScan, setAutoScan] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const now = new Date()

  // Chụp và gửi lên server
  const captureAndRecognize = useCallback(async () => {
    if (scanning) return
    const imageSrc = webcamRef.current?.getScreenshot()
    if (!imageSrc) return

    setScanning(true)
    setResult(null)

    try {
      // Chuyển base64 → Blob
      const res = await fetch(imageSrc)
      const blob = await res.blob()
      const apiRes = await attendanceApi.checkIn(blob)
      setResult(apiRes.data)
    } catch (err: any) {
      setResult({ success: false, message: 'Lỗi kết nối server' })
    } finally {
      setScanning(false)
      // Xóa kết quả sau 4 giây
      setTimeout(() => setResult(null), 4000)
    }
  }, [scanning])

  // Auto scan mode
  useEffect(() => {
    if (autoScan) {
      intervalRef.current = setInterval(captureAndRecognize, 2000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoScan, captureAndRecognize])

  const statusLabel = (s?: string) => {
    if (s === 'ON_TIME') return '✅ Đúng giờ'
    if (s === 'LATE') return '⚠️ Đi trễ'
    if (s === 'EARLY_LEAVE') return '⚠️ Về sớm'
    return ''
  }

  const webcamState = result
    ? result.success ? 'success' : 'error'
    : autoScan ? 'scanning' : ''

  return (
    <div className="checkin-screen">
      {/* Header */}
      <div className="text-center mb-6">
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          {now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>👁️ Chấm công khuôn mặt</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Nhìn thẳng vào camera để chấm công
        </p>
      </div>

      {/* Webcam */}
      <div className={`webcam-container ${webcamState}`} style={{ position: 'relative' }}>
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={600}
          height={450}
          videoConstraints={{ width: 600, height: 450, facingMode: 'user' }}
          style={{ display: 'block' }}
        />
        {/* Scan animation */}
        {autoScan && !result && <div className="scan-line" />}

        {/* Corner brackets */}
        {['top-left','top-right','bottom-left','bottom-right'].map(pos => (
          <div key={pos} style={{
            position: 'absolute',
            width: 40, height: 40,
            borderColor: result?.success ? 'var(--success)' : autoScan ? 'var(--accent)' : 'var(--border)',
            borderStyle: 'solid',
            ...(pos === 'top-left'     ? { top: 16, left: 16, borderWidth: '3px 0 0 3px', borderRadius: '8px 0 0 0' } :
                pos === 'top-right'    ? { top: 16, right: 16, borderWidth: '3px 3px 0 0', borderRadius: '0 8px 0 0' } :
                pos === 'bottom-left'  ? { bottom: 16, left: 16, borderWidth: '0 0 3px 3px', borderRadius: '0 0 0 8px' } :
                                        { bottom: 16, right: 16, borderWidth: '0 3px 3px 0', borderRadius: '0 0 8px 0' }),
            transition: 'border-color 0.3s',
          }} />
        ))}

        {/* Result overlay */}
        {result && (
          <div className="result-overlay">
            {result.success ? (
              <>
                <div className="result-icon">
                  {result.checkType === 'IN' ? '👋' : '👏'}
                </div>
                <div className="result-name">{result.employee?.fullName}</div>
                <div className="result-info">{result.employee?.department}</div>
                <div className="result-info" style={{ marginTop: 8 }}>
                  {result.checkType === 'IN' ? '🟢 Vào làm' : '🔴 Ra về'} — {statusLabel(result.status)}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--success)' }}>
                  {result.checkTime?.substring(11, 16)}
                </div>
              </>
            ) : (
              <>
                <div className="result-icon">❓</div>
                <div className="result-name" style={{ color: 'var(--danger)' }}>Không nhận diện được</div>
                <div className="result-info">{result.message}</div>
              </>
            )}
          </div>
        )}

        {/* Scanning indicator */}
        {scanning && !result && (
          <div className="result-overlay">
            <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            <div style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Đang nhận diện...</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-6 items-center">
        <button
          id="btn-capture"
          className="btn btn-primary btn-lg"
          onClick={captureAndRecognize}
          disabled={scanning || autoScan}
        >
          📷 Chấm công thủ công
        </button>

        <button
          id="btn-auto-scan"
          className={`btn btn-lg ${autoScan ? 'btn-danger' : 'btn-secondary'}`}
          onClick={() => setAutoScan(v => !v)}
        >
          {autoScan ? '⏹ Dừng tự động' : '▶ Quét tự động'}
        </button>
      </div>

      {/* Back */}
      <div style={{ marginTop: 24 }}>
        <a href="/" className="text-sm text-muted" style={{ textDecoration: 'none' }}>
          ← Về Dashboard
        </a>
      </div>
    </div>
  )
}
