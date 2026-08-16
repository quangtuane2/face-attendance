import { useEffect, useState } from 'react'
import { taskApi, employeeApi, departmentApi } from '../services/api'

// Types
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED' | 'OVERDUE'

interface Task {
  id: number
  title: string
  description?: string
  priority: Priority
  status: TaskStatus
  progress: number
  dueDate?: string
  creator?: { id: number; fullName: string }
  assignee?: { id: number; fullName: string }
  department?: { id: number; name: string }
  createdAt: string
}

interface Comment {
  id: number
  content: string
  author: { id: number; fullName: string }
  createdAt: string
}

//  Helpers 
const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'NEW', label: 'Mới', color: '#6366f1' },
  { key: 'IN_PROGRESS', label: 'Đang làm', color: '#f59e0b' },
  { key: 'REVIEW', label: 'Chờ duyệt', color: '#8b5cf6' },
  { key: 'DONE', label: 'Hoàn thành', color: '#10b981' },
]

const PRIORITY_MAP: Record<Priority, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Thấp', color: '#64748b', bg: '#f1f5f9' },
  MEDIUM: { label: 'Trung bình', color: '#d97706', bg: '#fef3c7' },
  HIGH: { label: 'Cao', color: '#dc2626', bg: '#fee2e2' },
  URGENT: { label: 'Khẩn cấp', color: '#7c3aed', bg: '#ede9fe' },
}

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
const isOverdue = (t: Task) =>
  t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELLED'
    ? new Date(t.dueDate) < new Date()
    : false

// Empty form state
const emptyForm = () => ({
  title: '', description: '', priority: 'MEDIUM' as Priority,
  status: 'NEW' as TaskStatus, creatorId: '', assigneeId: '',
  departmentId: '', startDate: '', dueDate: '', progress: 0,
})

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')

  // Modal – tạo / sửa task
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  // Detail panel – xem chi tiết + bình luận
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingCmt, setLoadingCmt] = useState(false)

  // Bộ lọc
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  // Load
  const load = async () => {
    setLoading(true)
    try {
      const [tRes, eRes, dRes] = await Promise.all([
        taskApi.getAll({
          status: filterStatus || undefined,
          priority: filterPriority || undefined,
        }),
        employeeApi.getAll(),
        departmentApi.getAll(),
      ])
      setTasks(tRes.data as Task[])
      setEmployees(eRes.data as any[])
      setDepartments(dRes.data as any[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterStatus, filterPriority])

  // Open modal 
  const openCreate = () => {
    setEditTask(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEdit = (t: Task) => {
    setEditTask(t)
    setForm({
      title: t.title,
      description: t.description || '',
      priority: t.priority,
      status: t.status,
      creatorId: String(t.creator?.id || ''),
      assigneeId: String(t.assignee?.id || ''),
      departmentId: String(t.department?.id || ''),
      startDate: '',
      dueDate: t.dueDate || '',
      progress: t.progress,
    })
    setShowModal(true)
  }

  //Save 
  const handleSave = async () => {
    if (!form.title.trim()) { alert('Vui lòng nhập tiêu đề'); return }
    if (!form.creatorId) { alert('Vui lòng chọn người giao'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        creatorId: Number(form.creatorId) || undefined,
        assigneeId: Number(form.assigneeId) || undefined,
        departmentId: Number(form.departmentId) || undefined,
        dueDate: form.dueDate || undefined,
        startDate: form.startDate || undefined,
      }
      if (editTask) await taskApi.update(editTask.id, payload)
      else await taskApi.create(payload)
      setShowModal(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  // Delete
  const handleDelete = async (id: number) => {
    if (!confirm('Xóa task này?')) return
    await taskApi.delete(id)
    if (detailTask?.id === id) setDetailTask(null)
    load()
  }

  // Quick status change (Kanban)
  const moveStatus = async (id: number, status: TaskStatus) => {
    await taskApi.updateStatus(id, status)
    load()
  }

  // Detail panel
  const openDetail = async (t: Task) => {
    setDetailTask(t)
    setLoadingCmt(true)
    try {
      const res = await taskApi.getComments(t.id)
      setComments(res.data as Comment[])
    } finally {
      setLoadingCmt(false)
    }
  }

  const submitComment = async () => {
    if (!newComment.trim() || !detailTask) return
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    // Tìm employee theo username/fullName (đơn giản dùng employee đầu tiên làm demo)
    const emp = employees.find(e => e.fullName === user.fullName) || employees[0]
    if (!emp) { alert('Không tìm thấy nhân viên để bình luận'); return }
    await taskApi.addComment(detailTask.id, emp.id, newComment)
    setNewComment('')
    const res = await taskApi.getComments(detailTask.id)
    setComments(res.data as Comment[])
  }

  // Grouped tasks for Kanban
  const grouped = (key: TaskStatus) => tasks.filter(t => t.status === key)

  // RENDER
  return (
    <div style={{ padding: '24px', height: '100%', boxSizing: 'border-box' }}>

      {/*  Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📋 Quản lý Công việc</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Giao việc, theo dõi tiến độ giữa các phòng ban
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Filter status */}
          <select
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 13 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="NEW">Mới</option>
            <option value="IN_PROGRESS">Đang làm</option>
            <option value="REVIEW">Chờ duyệt</option>
            <option value="DONE">Hoàn thành</option>
          </select>
          {/* Filter priority */}
          <select
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 13 }}
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="">Tất cả mức độ</option>
            <option value="LOW">Thấp</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HIGH">Cao</option>
            <option value="URGENT">Khẩn cấp</option>
          </select>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              className={`btn ${view === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 0, border: 'none' }}
              onClick={() => setView('kanban')}
            >📊 Kanban</button>
            <button
              className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 0, border: 'none' }}
              onClick={() => setView('list')}
            >☰ Danh sách</button>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ Tạo công việc</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          ⏳ Đang tải...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 180px)' }}>

          {/* Main area */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {view === 'kanban' ? (
              /* KANBAN VIEW */
              <div style={{ display: 'flex', gap: 16, minWidth: 900 }}>
                {COLUMNS.map(col => (
                  <div key={col.key} style={{
                    flex: 1, minWidth: 220,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}>
                    {/* Column header */}
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: '2px solid ' + col.color,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: col.color, flexShrink: 0,
                      }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{col.label}</span>
                      <span style={{
                        marginLeft: 'auto', background: col.color + '22',
                        color: col.color, borderRadius: 20,
                        fontSize: 12, fontWeight: 700,
                        padding: '2px 8px',
                      }}>{grouped(col.key).length}</span>
                    </div>

                    {/* Cards */}
                    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 }}>
                      {grouped(col.key).map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onOpen={() => openDetail(task)}
                          onEdit={() => openEdit(task)}
                          onDelete={() => handleDelete(task.id)}
                          onMove={moveStatus}
                          columns={COLUMNS}
                        />
                      ))}
                      {grouped(col.key).length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                          Chưa có công việc
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', fontSize: 13, color: 'var(--text-muted)' }}>
                      {['Tiêu đề', 'Phòng ban', 'Người nhận', 'Ưu tiên', 'Tiến độ', 'Deadline', 'Trạng thái', ''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t, i) => {
                      const p = PRIORITY_MAP[t.priority]
                      const over = isOverdue(t)
                      return (
                        <tr key={t.id} style={{
                          borderTop: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                          cursor: 'pointer',
                        }}
                          onClick={() => openDetail(t)}
                        >
                          <td style={{ padding: '10px 14px', fontWeight: 500, maxWidth: 240 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {over && <span title="Quá hạn">⚠️ </span>}{t.title}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                            {t.department?.name || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13 }}>
                            {t.assignee?.fullName || '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                              color: p.color, background: p.bg,
                            }}>{p.label}</span>
                          </td>
                          <td style={{ padding: '10px 14px', minWidth: 100 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: t.progress + '%', height: '100%', background: '#10b981', transition: 'width .3s' }} />
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 28 }}>{t.progress}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: over ? '#dc2626' : 'var(--text-muted)' }}>
                            {fmtDate(t.dueDate)}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <StatusBadge status={t.status} />
                          </td>
                          <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-secondary btn-icon btn-sm" title="Sửa" onClick={() => openEdit(t)}>✏️</button>
                              <button className="btn btn-secondary btn-icon btn-sm" title="Xóa" onClick={() => handleDelete(t.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {tasks.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        Chưa có công việc nào
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {detailTask && (
            <div style={{
              width: 360, flexShrink: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Panel header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>{detailTask.title}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <StatusBadge status={detailTask.status} />
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                      color: PRIORITY_MAP[detailTask.priority].color,
                      background: PRIORITY_MAP[detailTask.priority].bg,
                    }}>{PRIORITY_MAP[detailTask.priority].label}</span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setDetailTask(null)}>✕</button>
              </div>

              {/* Panel body */}
              <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 13 }}>
                  <InfoRow icon="👤" label="Người giao" value={detailTask.creator?.fullName} />
                  <InfoRow icon="🙋" label="Người nhận" value={detailTask.assignee?.fullName} />
                  <InfoRow icon="🏢" label="Phòng ban" value={detailTask.department?.name} />
                  <InfoRow icon="📅" label="Deadline" value={fmtDate(detailTask.dueDate)} />
                </div>

                {/* Progress */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tiến độ: {detailTask.progress}%</div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: detailTask.progress + '%', height: '100%', background: '#10b981', transition: 'width .3s' }} />
                  </div>
                </div>

                {/* Description */}
                {detailTask.description && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Mô tả</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{detailTask.description}</div>
                  </div>
                )}

                {/* Quick move status */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Chuyển trạng thái</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {COLUMNS.filter(c => c.key !== detailTask.status).map(c => (
                      <button key={c.key}
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '4px 10px', borderColor: c.color, color: c.color }}
                        onClick={async () => {
                          await moveStatus(detailTask.id, c.key)
                          setDetailTask({ ...detailTask, status: c.key })
                        }}
                      >→ {c.label}</button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={() => openEdit(detailTask)}>✏️ Chỉnh sửa</button>
                  <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={() => handleDelete(detailTask.id)}>🗑️</button>
                </div>

                {/* Comments */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    💬 Bình luận {comments.length > 0 && `(${comments.length})`}
                  </div>
                  {loadingCmt ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang tải...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {comments.map(c => (
                        <div key={c.id} style={{
                          background: 'var(--surface-2)',
                          borderRadius: 8, padding: '8px 10px',
                          fontSize: 13,
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{c.author.fullName}</div>
                          <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.content}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {new Date(c.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      ))}
                      {comments.length === 0 && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Chưa có bình luận</div>
                      )}
                    </div>
                  )}

                  {/* Add comment */}
                  <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                    <input
                      style={{
                        flex: 1, padding: '7px 10px', fontSize: 13,
                        border: '1px solid var(--border)', borderRadius: 8,
                        background: 'var(--surface-2)', color: 'var(--text)',
                        outline: 'none',
                      }}
                      placeholder="Thêm bình luận..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitComment()}
                    />
                    <button className="btn btn-primary" style={{ fontSize: 13, padding: '7px 12px' }} onClick={submitComment}>Gửi</button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL TẠO / SỬA TASK */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16,
            padding: '28px 32px', width: '100%', maxWidth: 540,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
              {editTask ? '✏️ Chỉnh sửa công việc' : '➕ Tạo công việc mới'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Tiêu đề */}
              <div>
                <label className="form-label">Tiêu đề <span style={{ color: '#dc2626' }}>*</span></label>
                <input className="form-control" placeholder="Nhập tiêu đề công việc..."
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              {/* Mô tả */}
              <div>
                <label className="form-label">Mô tả</label>
                <textarea className="form-control" placeholder="Mô tả chi tiết công việc..." rows={3}
                  style={{ resize: 'vertical' }}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              {/* Row: Ưu tiên + Trạng thái */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Mức độ ưu tiên</label>
                  <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Trạng thái</label>
                  <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}>
                    <option value="NEW">Mới</option>
                    <option value="IN_PROGRESS">Đang làm</option>
                    <option value="REVIEW">Chờ duyệt</option>
                    <option value="DONE">Hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
              </div>

              {/* Row: Người giao + Người nhận */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Người giao <span style={{ color: '#dc2626' }}>*</span></label>
                  <select className="form-control" value={form.creatorId} onChange={e => setForm({ ...form, creatorId: e.target.value })}>
                    <option value="">— Chọn —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Người nhận</label>
                  <select className="form-control" value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })}>
                    <option value="">— Chọn —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                </div>
              </div>

              {/* Phòng ban */}
              <div>
                <label className="form-label">Phòng ban</label>
                <select className="form-control" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">— Chọn phòng ban —</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Row: Ngày bắt đầu + Deadline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Ngày bắt đầu</label>
                  <input type="date" className="form-control"
                    value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Deadline</label>
                  <input type="date" className="form-control"
                    value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>

              {/* Tiến độ */}
              <div>
                <label className="form-label">Tiến độ: {form.progress}%</label>
                <input type="range" min={0} max={100} step={5}
                  style={{ width: '100%', cursor: 'pointer' }}
                  value={form.progress} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} />
              </div>

            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Đang lưu...' : (editTask ? '💾 Cập nhật' : '✅ Tạo công việc')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-components

function TaskCard({ task, onOpen, onEdit, onDelete, onMove, columns }: {
  task: Task
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onMove: (id: number, s: TaskStatus) => void
  columns: typeof COLUMNS
}) {
  const p = PRIORITY_MAP[task.priority]
  const over = isOverdue(task)

  return (
    <div
      style={{
        background: 'var(--bg)',
        border: `1px solid ${over ? '#fca5a5' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'box-shadow .2s, transform .2s',
      }}
      onClick={onOpen}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.12)'
          ; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
          ; (e.currentTarget as HTMLElement).style.transform = 'none'
      }}
    >
      {/* Priority + overdue */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
          color: p.color, background: p.bg,
        }}>{p.label}</span>
        {over && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>⚠️ Quá hạn</span>}
      </div>

      {/* Title */}
      <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.4, marginBottom: 8 }}>
        {task.title}
      </div>

      {/* Progress bar */}
      {task.progress > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: task.progress + '%', height: '100%', background: '#10b981' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textAlign: 'right' }}>{task.progress}%</div>
        </div>
      )}

      {/* Meta */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>🙋 {task.assignee?.fullName || 'Chưa giao'}</span>
        {task.dueDate && <span style={{ color: over ? '#dc2626' : undefined }}>📅 {fmtDate(task.dueDate)}</span>}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
        <button className="btn btn-secondary btn-icon btn-sm" title="Sửa" onClick={onEdit}>✏️</button>
        <button className="btn btn-secondary btn-icon btn-sm" title="Xóa" onClick={onDelete}>🗑️</button>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, { label: string; color: string; bg: string }> = {
    NEW: { label: 'Mới', color: '#6366f1', bg: '#eef2ff' },
    IN_PROGRESS: { label: 'Đang làm', color: '#d97706', bg: '#fef3c7' },
    REVIEW: { label: 'Chờ duyệt', color: '#7c3aed', bg: '#ede9fe' },
    DONE: { label: 'Hoàn thành', color: '#059669', bg: '#d1fae5' },
    CANCELLED: { label: 'Đã hủy', color: '#64748b', bg: '#f1f5f9' },
    OVERDUE: { label: 'Quá hạn', color: '#dc2626', bg: '#fee2e2' },
  }
  const s = map[status] || map.NEW
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{icon} {label}</div>
      <div style={{ fontWeight: 500, fontSize: 13 }}>{value || '—'}</div>
    </div>
  )
}
