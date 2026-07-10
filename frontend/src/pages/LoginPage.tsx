import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { toast.error('Vui lòng nhập đầy đủ thông tin'); return }
    setLoading(true)
    try {
      const res = await authApi.login(username, password)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data))
      toast.success(`Xin chào, ${res.data.fullName}!`)
      navigate('/')
    } catch {
      toast.error('Sai tên đăng nhập hoặc mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card card animate-glow" style={{ border: '1px solid var(--border)' }}>
        {/* Logo */}
        <div className="text-center mb-6">
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 1rem',
            boxShadow: '0 0 30px var(--accent-glow)'
          }}>👁️</div>
          <h1 className="page-title" style={{ fontSize: '1.75rem' }}>FaceAttend</h1>
          <p className="text-muted text-sm mt-1">Hệ thống chấm công nhận diện khuôn mặt</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">👤 Tên đăng nhập</label>
            <input
              id="login-username"
              className="form-input"
              placeholder="admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">🔒 Mật khẩu</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button id="login-submit" type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={loading}>
            {loading ? <><span className="loading-spinner" /> Đang đăng nhập...</> : '🚀 Đăng nhập'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          Mặc định: admin / Admin@123
        </p>
      </div>
    </div>
  )
}
