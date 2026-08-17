import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { meetingApi } from '../services/api'

declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

interface Meeting {
  id: number
  title: string
  roomCode: string
  status: string
  organizer: { id: number; fullName: string }
  scheduledAt: string
  durationMinutes: number
  participants: { id: number; employee: { id: number; fullName: string } }[]
}

export default function MeetingRoomPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const jitsiRef  = useRef<HTMLDivElement>(null)
  const apiRef    = useRef<any>(null)

  const [meeting,   setMeeting]   = useState<Meeting | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [jitsiReady, setJitsiReady] = useState(false)
  const [error,     setError]     = useState('')

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Tải thông tin cuộc họp
  useEffect(() => {
    if (!id) return
    meetingApi.getById(Number(id))
      .then(res => {
        setMeeting(res.data as Meeting)
        setLoading(false)
      })
      .catch(() => {
        setError('Không tìm thấy cuộc họp')
        setLoading(false)
      })
  }, [id])

  // Tải Jitsi script và khởi tạo phòng họp
  useEffect(() => {
    if (!meeting || !jitsiRef.current) return

    // Cập nhật trạng thái cuộc họp thành ONGOING
    if (meeting.status === 'SCHEDULED') {
      meetingApi.updateStatus(meeting.id, 'ONGOING').catch(() => {})
    }

    const loadJitsi = () => {
      if (window.JitsiMeetExternalAPI) {
        initJitsi()
        return
      }
      const script = document.createElement('script')
      script.src = 'https://meet.jit.si/external_api.js'
      script.async = true
      script.onload = () => initJitsi()
      script.onerror = () => setError('Không tải được Jitsi. Kiểm tra kết nối internet.')
      document.head.appendChild(script)
    }

    const initJitsi = () => {
      if (!jitsiRef.current) return

      const roomName = meeting.roomCode.replace(/-/g, '').toLowerCase()

      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: jitsiRef.current,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: user.fullName || 'Người dùng',
          email: '',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          prejoinPageEnabled: false,   // Không hiện trang chờ, vào thẳng
          startAudioOnly: false,
          toolbarButtons: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'fullscreen', 'fodeviceselection', 'hangup', 'chat',
            'recording', 'raisehand', 'videoquality', 'filmstrip',
            'tileview', 'invite', 'stats', 'shortcuts', 'mute-everyone',
          ],
        },
        interfaceConfigOverwrite: {
          TOOLBAR_ALWAYS_VISIBLE: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#1e293b',
          APP_NAME: 'Phòng họp cơ quan',
        },
      })

      // Sự kiện khi người dùng rời phòng
      apiRef.current.on('videoConferenceLeft', () => {
        handleLeave()
      })

      apiRef.current.on('readyToClose', () => {
        handleLeave()
      })

      setJitsiReady(true)
    }

    loadJitsi()

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  }, [meeting])

  const handleLeave = () => {
    navigate('/meetings')
  }

  const handleEndMeeting = async () => {
    if (!meeting) return
    if (!confirm('Kết thúc cuộc họp cho tất cả mọi người?')) return
    await meetingApi.updateStatus(meeting.id, 'ENDED')
    if (apiRef.current) apiRef.current.executeCommand('hangup')
    navigate('/meetings')
  }

  if (loading) return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', color: '#fff', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>📅</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Đang kết nối phòng họp...</div>
    </div>
  )

  if (error) return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', color: '#fff', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>❌</div>
      <div style={{ fontSize: 18 }}>{error}</div>
      <button
        onClick={() => navigate('/meetings')}
        style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 24px', cursor: 'pointer', fontWeight: 600,
        }}
      >← Quay lại</button>
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0f172a', display: 'flex', flexDirection: 'column',
    }}>
      {/* Thanh thông tin phòng họp */}
      <div style={{
        height: 52, background: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex', alignItems: 'center', paddingInline: 20, gap: 16,
        flexShrink: 0,
      }}>
        {/* Logo + tên phòng */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏛️</span>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              {meeting?.title}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>
              {meeting?.roomCode} · {meeting?.participants.length} người tham dự
            </div>
          </div>
        </div>

        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#dc2626', borderRadius: 20, padding: '3px 10px',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#fff',
            animation: 'pulse 1.5s infinite',
          }} />
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>LIVE</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* Nút kết thúc cuộc họp (cho organizer/admin) */}
          {['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG'].includes(user.role) && (
            <button
              onClick={handleEndMeeting}
              style={{
                background: '#dc2626', color: '#fff', border: 'none',
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
              }}
            >
              ⏹ Kết thúc cuộc họp
            </button>
          )}
          {/* Nút rời phòng */}
          <button
            onClick={handleLeave}
            style={{
              background: '#334155', color: '#f1f5f9', border: 'none',
              borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
            }}
          >
            ← Rời phòng
          </button>
        </div>
      </div>

      {/* Jitsi container */}
      <div ref={jitsiRef} style={{ flex: 1, position: 'relative' }}>
        {!jitsiReady && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 16, color: '#94a3b8',
          }}>
            <div style={{ fontSize: 40 }}>🎥</div>
            <div style={{ fontSize: 16 }}>Đang tải phòng họp...</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Mã phòng: <strong style={{ fontFamily: 'monospace', color: '#818cf8' }}>{meeting?.roomCode}</strong>
            </div>
          </div>
        )}
      </div>

      {/* CSS animation cho live badge */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
