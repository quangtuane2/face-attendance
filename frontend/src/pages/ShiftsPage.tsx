import { useEffect, useState } from 'react'
import { shiftApi } from '../services/api'
import toast from 'react-hot-toast'

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm] = useState({ name: '', checkInTime: '08:00', checkOutTime: '17:00', lateToleranceMinutes: 15 })

  const load = () => shiftApi.getAll().then(r => setShifts(r.data))
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', checkInTime: '08:00', checkOutTime: '17:00', lateToleranceMinutes: 15 })
    setShowModal(true)
  }
  const openEdit = (s: any) => {
    setEditTarget(s)
    setForm({ name: s.name, checkInTime: s.checkInTime, checkOutTime: s.checkOutTime, lateToleranceMinutes: s.lateToleranceMinutes })
    setShowModal(true)
  }
  const handleSubmit = async () => {
    try {
      if (editTarget) { await shiftApi.update(editTarget.id, form); toast.success('Cập nhật ca thành công') }
      else { await shiftApi.create(form); toast.success('Thêm ca mới thành công') }
      setShowModal(false); load()
    } catch { toast.error('Có lỗi xảy ra') }
  }
  const handleDelete = async (id: number) => {
    if (!confirm('Xóa ca làm việc này?')) return
    try { await shiftApi.delete(id); toast.success('Đã xóa'); load() }
    catch { toast.error('Không thể xóa (có nhân viên đang dùng ca này)') }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cấu hình ca làm việc</h1>
          <p className="page-subtitle">{shifts.length} ca đang hoạt động</p>
        </div>
        <button id="btn-add-shift" className="btn btn-primary" onClick={openCreate}>➕ Thêm ca mới</button>
      </div>

      <div className="grid-3">
        {shifts.map((s: any) => (
          <div key={s.id} className="card" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent), #8b5cf6)', borderRadius: '12px 12px 0 0' }} />
            <h3 className="font-bold" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>{s.name}</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">🟢 Giờ vào:</span>
                <span className="font-semibold text-success">{s.checkInTime?.substring(0,5)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">🔴 Giờ ra:</span>
                <span className="font-semibold text-danger">{s.checkOutTime?.substring(0,5)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">⏱ Cho phép trễ:</span>
                <span className="font-semibold">{s.lateToleranceMinutes} phút</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(s)}>✏️ Sửa</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editTarget ? '✏️ Sửa ca làm việc' : '➕ Thêm ca làm việc'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Tên ca *</label>
                <input className="form-input" placeholder="Ca hành chính" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Giờ vào *</label>
                  <input type="time" className="form-input" value={form.checkInTime} onChange={e => setForm(f => ({ ...f, checkInTime: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Giờ ra *</label>
                  <input type="time" className="form-input" value={form.checkOutTime} onChange={e => setForm(f => ({ ...f, checkOutTime: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Thời gian cho phép trễ (phút)</label>
                <input type="number" className="form-input" min={0} max={60} value={form.lateToleranceMinutes} onChange={e => setForm(f => ({ ...f, lateToleranceMinutes: Number(e.target.value) }))} />
              </div>
              <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button id="btn-save-shift" className="btn btn-primary" onClick={handleSubmit}>
                  {editTarget ? '💾 Lưu thay đổi' : '➕ Tạo ca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
