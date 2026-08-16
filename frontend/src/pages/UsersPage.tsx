import { useEffect, useState } from 'react'
import { userApi, employeeApi } from '../services/api'

interface UserAccount {
  id: number
  username: string
  fullName: string
  role: 'ADMIN' | 'TRUONG_PHONG' | 'PHO_PHONG' | 'CHUYEN_VIEN'
  active: boolean
  employee?: { id: number; fullName: string; employeeCode: string }
  createdAt: string
}

const ROLE_MAP = {
  ADMIN:        { label: 'Quản trị viên', color: '#7c3aed', bg: '#ede9fe' },
  TRUONG_PHONG: { label: 'Trưởng phòng',  color: '#0369a1', bg: '#e0f2fe' },
  PHO_PHONG:    { label: 'Phó phòng',     color: '#0891b2', bg: '#cffafe' },
  CHUYEN_VIEN:  { label: 'Chuyên viên',   color: '#059669', bg: '#d1fae5' },
}

const emptyForm = () => ({
  username: '', password: '', fullName: '', role: 'EMPLOYEE',
  employeeId: '', active: true,
})

export default function UsersPage() {
  const [users,     setUsers]     = useState<UserAccount[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser,  setEditUser]  = useState<UserAccount | null>(null)
  const [form,      setForm]      = useState(emptyForm())
  const [saving,    setSaving]    = useState(false)

  // Modal tạo nhanh cho nhân viên
  const [showQuickModal, setShowQuickModal] = useState(false)
  const [quickEmpId,     setQuickEmpId]     = useState<number | null>(null)
  const [quickUsername,  setQuickUsername]  = useState('')
  const [quickPassword,  setQuickPassword]  = useState('123456')
  const [quickResult,    setQuickResult]    = useState<{ username: string; password: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [uRes, eRes] = await Promise.all([userApi.getAll(), employeeApi.getAll()])
      setUsers(uRes.data as UserAccount[])
      setEmployees(eRes.data as any[])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Lấy danh sách nhân viên chưa có tài khoản
  const empWithoutAccount = employees.filter(e =>
    !users.some(u => u.employee?.id === e.id)
  )

  const openCreate = () => {
    setEditUser(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEdit = (u: UserAccount) => {
    setEditUser(u)
    setForm({
      username:   u.username,
      password:   '',
      fullName:   u.fullName,
      role:       u.role,
      employeeId: String(u.employee?.id || ''),
      active:     u.active,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.username.trim()) { alert('Vui lòng nhập username'); return }
    if (!editUser && form.password.length < 6) { alert('Password tối thiểu 6 ký tự'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        employeeId: form.employeeId ? Number(form.employeeId) : undefined,
      }
      if (editUser) await userApi.update(editUser.id, payload)
      else          await userApi.create(payload)
      setShowModal(false)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi lưu')
    } finally { setSaving(false) }
  }

  const handleToggle = async (id: number) => {
    await userApi.toggle(id)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa tài khoản này?')) return
    await userApi.delete(id)
    load()
  }

  // Tạo nhanh account cho nhân viên
  const openQuick = (emp: any) => {
    setQuickEmpId(emp.id)
    setQuickUsername(emp.employeeCode.toLowerCase())
    setQuickPassword('123456')
    setQuickResult(null)
    setShowQuickModal(true)
  }

  const handleQuickCreate = async () => {
    if (!quickEmpId) return
    try {
      const res = await userApi.createForEmployee(quickEmpId, quickUsername, quickPassword)
      setQuickResult({ username: res.data.username, password: res.data.password })
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi tạo tài khoản')
    }
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🔐 Quản lý Tài khoản</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Tạo và quản lý tài khoản đăng nhập cho cán bộ, nhân viên
          </p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreate}>
          + Tạo tài khoản
        </button>
      </div>

      {/* Thẻ nhân viên chưa có tài khoản */}
      {empWithoutAccount.length > 0 && (
        <div style={{
          background: '#fef9c3', border: '1px solid #fde047',
          borderRadius: 12, padding: '14px 18px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: '#92400e' }}>
            ⚠️ {empWithoutAccount.length} nhân viên chưa có tài khoản đăng nhập:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {empWithoutAccount.map(e => (
              <button key={e.id}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '4px 10px', borderColor: '#d97706', color: '#92400e' }}
                onClick={() => openQuick(e)}
              >
                👤 {e.fullName} ({e.employeeCode}) → Tạo acc
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bảng tài khoản */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>⏳ Đang tải...</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', fontSize: 13, color: 'var(--text-muted)' }}>
                {['Username', 'Họ tên', 'Vai trò', 'Nhân viên liên kết', 'Trạng thái', 'Ngày tạo', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const role = ROLE_MAP[u.role] || { label: u.role, color: '#64748b', bg: '#f1f5f9' }
                return (
                  <tr key={u.id} style={{
                    borderTop: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                  }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontFamily: 'monospace' }}>
                      {u.username}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{u.fullName || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        color: role.color, background: role.bg,
                      }}>{role.label}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {u.employee
                        ? <span>👤 {u.employee.fullName} <span style={{ fontFamily: 'monospace', fontSize: 11 }}>({u.employee.employeeCode})</span></span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => handleToggle(u.id)}
                        style={{
                          border: 'none', borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: u.active ? '#d1fae5' : '#fee2e2',
                          color: u.active ? '#059669' : '#dc2626',
                        }}
                      >
                        {u.active ? '✅ Hoạt động' : '🔴 Tắt'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-icon btn-sm" title="Sửa" onClick={() => openEdit(u)}>✏️</button>
                        <button className="btn btn-secondary btn-icon btn-sm" title="Xóa" onClick={() => handleDelete(u.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Chưa có tài khoản nào
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ MODAL TẠO / SỬA TÀI KHOẢN ══ */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: '28px 32px',
            width: '100%', maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
              {editUser ? '✏️ Chỉnh sửa tài khoản' : '➕ Tạo tài khoản mới'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Username <span style={{ color: '#dc2626' }}>*</span></label>
                <input className="form-control" placeholder="vd: nv001"
                  value={form.username} disabled={!!editUser}
                  onChange={e => setForm({ ...form, username: e.target.value })} />
              </div>

              <div>
                <label className="form-label">
                  {editUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}
                </label>
                <input className="form-control" type="password" placeholder="Tối thiểu 6 ký tự"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>

              <div>
                <label className="form-label">Họ tên</label>
                <input className="form-control" placeholder="Tên hiển thị"
                  value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
              </div>

              <div>
                <label className="form-label">Vai trò</label>
                <select className="form-control" value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="CHUYEN_VIEN">Chuyên viên</option>
                  <option value="TRUONG_PHONG">Trưởng phòng</option>
                  <option value="PHO_PHONG">Phó phòng</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </div>

              {form.role === 'EMPLOYEE' && (
                <div>
                  <label className="form-label">Liên kết nhân viên</label>
                  <select className="form-control" value={form.employeeId}
                    onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                    <option value="">— Chọn nhân viên —</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeCode})
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Nhân viên này sẽ thấy công việc được giao cho họ
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Đang lưu...' : (editUser ? '💾 Cập nhật' : '✅ Tạo tài khoản')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL TẠO NHANH ══ */}
      {showQuickModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: '28px 32px',
            width: '100%', maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>⚡ Tạo nhanh tài khoản</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              {employees.find(e => e.id === quickEmpId)?.fullName}
            </p>

            {!quickResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Username</label>
                  <input className="form-control" value={quickUsername}
                    onChange={e => setQuickUsername(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Mật khẩu mặc định</label>
                  <input className="form-control" value={quickPassword}
                    onChange={e => setQuickPassword(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setShowQuickModal(false)}>Hủy</button>
                  <button className="btn btn-primary" onClick={handleQuickCreate}>✅ Tạo ngay</button>
                </div>
              </div>
            ) : (
              // Kết quả tạo thành công
              <div>
                <div style={{
                  background: '#d1fae5', border: '1px solid #6ee7b7',
                  borderRadius: 10, padding: 16, marginBottom: 16,
                }}>
                  <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 8 }}>✅ Tạo thành công!</div>
                  <div style={{ fontSize: 13 }}>
                    <div>👤 <strong>Username:</strong> <code style={{ background: '#f0fdf4', padding: '2px 6px', borderRadius: 4 }}>{quickResult.username}</code></div>
                    <div style={{ marginTop: 6 }}>🔑 <strong>Password:</strong> <code style={{ background: '#f0fdf4', padding: '2px 6px', borderRadius: 4 }}>{quickResult.password}</code></div>
                  </div>
                  <div style={{ fontSize: 12, color: '#065f46', marginTop: 8 }}>
                    📋 Thông báo thông tin đăng nhập này cho nhân viên
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowQuickModal(false)}>
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
