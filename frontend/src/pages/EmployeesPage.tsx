import { useEffect, useState } from 'react'
import { employeeApi, departmentApi, shiftApi } from '../services/api'
import toast from 'react-hot-toast'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [filterDept, setFilterDept] = useState('')
  const [search, setSearch] = useState('')
  const [nextCode, setNextCode] = useState('')  // mã NV tự động

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    departmentId: '', shiftId: ''
  })

  const load = () => {
    setLoading(true)
    Promise.all([
      employeeApi.getAll(),
      departmentApi.getAll(),
      shiftApi.getAll(),
    ]).then(([e, d, s]) => {
      setEmployees(e.data)
      setDepartments(d.data)
      setShifts(s.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ fullName: '', email: '', phone: '', departmentId: '', shiftId: '' })
    // Fetch mã NV tiếp theo
    employeeApi.getNextCode()
      .then(r => setNextCode(r.data.code))
      .catch(() => setNextCode('NV???'))
    setShowModal(true)
  }

  const openEdit = (emp: any) => {
    setEditTarget(emp)
    setForm({
      fullName: emp.fullName,
      email: emp.email || '',
      phone: emp.phone || '',
      departmentId: emp.department?.id || '',
      shiftId: emp.shift?.id || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên')
      return
    }
    const payload = {
      // Khi tạo mới: employeeCode để trống → backend tự sinh
      // Khi sửa: không thay đổi mã
      employeeCode: editTarget ? editTarget.employeeCode : '',
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      department: form.departmentId ? { id: Number(form.departmentId) } : null,
      shift: form.shiftId ? { id: Number(form.shiftId) } : null,
    }
    try {
      if (editTarget) {
        await employeeApi.update(editTarget.id, payload)
        toast.success('Cập nhật thành công')
      } else {
        const res = await employeeApi.create(payload)
        toast.success(`Đã thêm nhân viên — Mã: ${res.data.employeeCode}`)
      }
      setShowModal(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Có lỗi xảy ra')
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Xóa nhân viên "${name}"?`)) return
    try {
      await employeeApi.delete(id)
      toast.success('Đã xóa nhân viên')
      load()
    } catch { toast.error('Không thể xóa') }
  }

  const filtered = employees.filter(e =>
    (filterDept === '' || e.department?.id === Number(filterDept)) &&
    (search === '' || e.fullName.toLowerCase().includes(search.toLowerCase()) ||
     e.employeeCode.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý nhân viên</h1>
          <p className="page-subtitle">{employees.length} nhân viên trong hệ thống</p>
        </div>
        <button id="btn-add-employee" className="btn btn-primary" onClick={openCreate}>
          ➕ Thêm nhân viên
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          className="form-input"
          placeholder="🔍 Tìm theo tên, mã nhân viên..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <select className="form-input" style={{ maxWidth: 200 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">Tất cả phòng ban</option>
          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã NV</th><th>Họ tên</th><th>Email</th>
              <th>Phòng ban</th><th>Ca làm</th><th>Khuôn mặt</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>Không có dữ liệu</td></tr>
            ) : filtered.map((emp: any) => (
              <tr key={emp.id}>
                <td><span className="badge badge-accent">{emp.employeeCode}</span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
                      {emp.fullName.charAt(0)}
                    </div>
                    <span className="font-semibold">{emp.fullName}</span>
                  </div>
                </td>
                <td className="text-muted text-sm">{emp.email || '—'}</td>
                <td>{emp.department?.name || '—'}</td>
                <td>{emp.shift?.name || '—'}</td>
                <td>
                  <span className={`badge ${emp.faceEnrolled ? 'badge-success' : 'badge-muted'}`}>
                    {emp.faceEnrolled ? '✅ Đã đăng ký' : '⚪ Chưa đăng ký'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <a href={`/employees/${emp.id}/enroll`} className="btn btn-sm btn-accent" style={{ textDecoration: 'none', background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                      📷
                    </a>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(emp)}>✏️</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(emp.id, emp.fullName)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editTarget ? '✏️ Sửa nhân viên' : '➕ Thêm nhân viên'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="flex flex-col gap-4">
              {/* Mã NV: tự động khi tạo mới, chỉ đọc khi sửa */}
              <div className="flex gap-4 items-center" style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
              }}>
                <span style={{ fontSize: '1.1rem' }}>🪪</span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                    {editTarget ? 'Mã nhân viên' : 'Mã nhân viên (tự động)'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', letterSpacing: 1 }}>
                    {editTarget ? editTarget.employeeCode : (nextCode || '...')}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input className="form-input" placeholder="Nguyễn Văn A" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="email@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input className="form-input" placeholder="0901234567" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Phòng ban</label>
                  <select className="form-input" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                    <option value="">— Chọn phòng ban —</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ca làm việc</label>
                  <select className="form-input" value={form.shiftId} onChange={e => setForm(f => ({ ...f, shiftId: e.target.value }))}>
                    <option value="">— Chọn ca —</option>
                    {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-2" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button id="btn-save-employee" className="btn btn-primary" onClick={handleSubmit}>
                  {editTarget ? '💾 Lưu thay đổi' : '➕ Thêm mới'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
