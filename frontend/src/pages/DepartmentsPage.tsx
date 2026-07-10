import { useEffect, useState } from 'react'
import { departmentApi } from '../services/api'
import toast from 'react-hot-toast'

interface Department {
  id: number
  name: string
  description: string
  children?: Department[]
  manager?: { fullName: string }
  parent?: { id: number }
}

function DeptNode({ dept, level = 0, onEdit, onDelete }: {
  dept: Department
  level?: number
  onEdit: (d: Department) => void
  onDelete: (d: Department) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = (dept.children?.length ?? 0) > 0

  return (
    <div style={{ marginLeft: level * 24 }}>
      <div className="flex items-center gap-3" style={{
        padding: '0.75rem 1rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 8,
        transition: 'all 0.2s',
      }}>
        {hasChildren && (
          <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>
            {expanded ? '▾' : '▸'}
          </button>
        )}
        {!hasChildren && <div style={{ width: 20 }} />}

        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `hsl(${(dept.id * 47) % 360}, 70%, 50%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', flexShrink: 0, opacity: 0.85,
        }}>
          {level === 0 ? '🏢' : level === 1 ? '📂' : '👥'}
        </div>

        <div style={{ flex: 1 }}>
          <div className="font-semibold" style={{ fontSize: '0.9rem' }}>{dept.name}</div>
          {dept.description && <div className="text-xs text-muted">{dept.description}</div>}
          {dept.manager && <div className="text-xs" style={{ color: 'var(--accent)' }}>👤 {dept.manager.fullName}</div>}
        </div>

        <div className="flex gap-2">
          <button className="btn btn-sm btn-secondary" onClick={() => onEdit(dept)}>✏️</button>
          <button className="btn btn-sm btn-danger" onClick={() => onDelete(dept)}>🗑️</button>
        </div>
      </div>
      {expanded && hasChildren && dept.children!.map(child => (
        <DeptNode key={child.id} dept={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}

export default function DepartmentsPage() {
  const [tree, setTree] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [allDepts, setAllDepts] = useState<Department[]>([])
  const [form, setForm] = useState({ name: '', description: '', parentId: '' })

  const load = () => {
    setLoading(true)
    Promise.all([departmentApi.getTree(), departmentApi.getAll()])
      .then(([t, a]) => { setTree(t.data); setAllDepts(a.data) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', description: '', parentId: '' })
    setShowModal(true)
  }
  const openEdit = (d: Department) => {
    setEditTarget(d)
    setForm({ name: d.name, description: d.description || '', parentId: d.parent?.id?.toString() || '' })
    setShowModal(true)
  }
  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      description: form.description,
      parent: form.parentId ? { id: Number(form.parentId) } : null,
    }
    try {
      if (editTarget) { await departmentApi.update(editTarget.id, payload); toast.success('Cập nhật thành công') }
      else { await departmentApi.create(payload); toast.success('Thêm phòng ban thành công') }
      setShowModal(false); load()
    } catch { toast.error('Có lỗi xảy ra') }
  }
  const handleDelete = async (d: Department) => {
    if (!confirm(`Xóa phòng ban "${d.name}"?`)) return
    try { await departmentApi.delete(d.id); toast.success('Đã xóa'); load() }
    catch { toast.error('Không thể xóa (có nhân viên đang thuộc phòng ban này)') }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sơ đồ phòng ban</h1>
          <p className="page-subtitle">Cây phân cấp tổ chức</p>
        </div>
        <button id="btn-add-dept" className="btn btn-primary" onClick={openCreate}>➕ Thêm phòng ban</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center text-muted" style={{ padding: '2rem' }}>Đang tải...</div>
        ) : tree.length === 0 ? (
          <div className="text-center text-muted" style={{ padding: '2rem' }}>Chưa có phòng ban nào</div>
        ) : tree.map(dept => (
          <DeptNode key={dept.id} dept={dept} onEdit={openEdit} onDelete={handleDelete} />
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editTarget ? '✏️ Sửa phòng ban' : '➕ Thêm phòng ban'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Tên phòng ban *</label>
                <input className="form-input" placeholder="Phòng Kỹ Thuật" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <input className="form-input" placeholder="Mô tả ngắn..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phòng ban cấp cha (nếu có)</label>
                <select className="form-input" value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}>
                  <option value="">— Không có (cấp gốc) —</option>
                  {allDepts.filter(d => !editTarget || d.id !== editTarget.id)
                    .map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button id="btn-save-dept" className="btn btn-primary" onClick={handleSubmit}>
                  {editTarget ? '💾 Lưu' : '➕ Tạo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
