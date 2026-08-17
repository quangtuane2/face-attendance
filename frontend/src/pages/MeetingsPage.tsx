import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { meetingApi, employeeApi } from '../services/api'

// Types
type MeetingStatus = 'SCHEDULED' | 'ONGOING' | 'ENDED' | 'CANCELLED'
type ParticipantStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'ATTENDED'

interface Meeting {
  id: number
  title: string
  description?: string
  organizer: { id: number; fullName: string }
  roomCode: string
  scheduledAt: string
  durationMinutes: number
  status: MeetingStatus
  meetingNotes?: string
  participants: Participant[]
  createdAt: string
}

interface Participant {
  id: number
  employee: { id: number; fullName: string }
  status: ParticipantStatus
  joinedAt?: string
}

const STATUS_MAP: Record<MeetingStatus, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: '🗓️ Đã lên lịch', color: '#6366f1', bg: '#eef2ff' },
  ONGOING:   { label: '🔴 Đang diễn ra', color: '#dc2626', bg: '#fee2e2' },
  ENDED:     { label: '✅ Kết thúc',     color: '#059669', bg: '#d1fae5' },
  CANCELLED: { label: '❌ Đã hủy',       color: '#64748b', bg: '#f1f5f9' },
}

const PARTICIPANT_MAP: Record<ParticipantStatus, { label: string; color: string }> = {
  INVITED:  { label: 'Chờ xác nhận', color: '#d97706' },
  ACCEPTED: { label: 'Đã chấp nhận', color: '#059669' },
  DECLINED: { label: 'Từ chối',      color: '#dc2626' },
  ATTENDED: { label: 'Đã tham dự',   color: '#6366f1' },
}

const fmtDateTime = (dt: string) =>
  new Date(dt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

const getCurrentUser = () => JSON.parse(localStorage.getItem('user') || '{}')
const isManager = () => ['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG'].includes(getCurrentUser().role)

const emptyForm = () => ({
  title: '', description: '', organizerId: '',
  scheduledAt: '', durationMinutes: 60, participantIds: [] as number[],
})

export default function MeetingsPage() {
  const [meetings,  setMeetings]  = useState<Meeting[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  // Modal tạo / sửa
  const [showModal, setShowModal] = useState(false)
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving,     setSaving]    = useState(false)

  const navigate = useNavigate()

  // Detail panel
  const [detail, setDetail] = useState<Meeting | null>(null)
  const [editNotes, setEditNotes] = useState(false)
  const [notesText, setNotesText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Filter
  const [filterStatus, setFilterStatus] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const user = getCurrentUser()
      const params: any = {}
      if (filterStatus) params.status = filterStatus
      if (!isManager() && user.employeeId) params.employeeId = user.employeeId

      const [mRes, eRes] = await Promise.all([
        meetingApi.getAll(params),
        isManager() ? employeeApi.getAll() : Promise.resolve({ data: [] }),
      ])
      setMeetings(mRes.data as Meeting[])
      setEmployees(eRes.data as any[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterStatus])

  const openCreate = () => {
    setEditMeeting(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEdit = (m: Meeting) => {
    setEditMeeting(m)
    setForm({
      title: m.title,
      description: m.description || '',
      organizerId: String(m.organizer.id),
      scheduledAt: m.scheduledAt.slice(0, 16), // datetime-local format
      durationMinutes: m.durationMinutes,
      participantIds: m.participants.map(p => p.employee.id),
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Vui lòng nhập tiêu đề'); return }
    if (!form.organizerId)  { alert('Vui lòng chọn người tổ chức'); return }
    if (!form.scheduledAt)  { alert('Vui lòng chọn thời gian họp'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        organizerId: Number(form.organizerId),
        scheduledAt: form.scheduledAt + ':00', // add seconds
      }
      if (editMeeting) await meetingApi.update(editMeeting.id, payload)
      else             await meetingApi.create(payload)
      setShowModal(false)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa cuộc họp này?')) return
    await meetingApi.delete(id)
    if (detail?.id === id) setDetail(null)
    load()
  }

  const handleStatusChange = async (id: number, status: string) => {
    await meetingApi.updateStatus(id, status)
    load()
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: status as MeetingStatus } : null)
  }

  const openDetail = (m: Meeting) => {
    setDetail(m)
    setNotesText(m.meetingNotes || '')
    setEditNotes(false)
  }

  const saveNotes = async () => {
    if (!detail) return
    setSavingNotes(true)
    await meetingApi.updateNotes(detail.id, notesText)
    setSavingNotes(false)
    setEditNotes(false)
    setDetail({ ...detail, meetingNotes: notesText })
    load()
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📅 Cuộc họp</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            {isManager() ? 'Lên lịch và quản lý cuộc họp nội bộ' : 'Cuộc họp bạn được mời tham dự'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: '6px 12px' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SCHEDULED">Đã lên lịch</option>
            <option value="ONGOING">Đang diễn ra</option>
            <option value="ENDED">Kết thúc</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
          {isManager() && (
            <button className="btn btn-primary" onClick={openCreate}>+ Tạo cuộc họp</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>⏳ Đang tải...</div>
      ) : (
        <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 180px)' }}>

          {/* Meeting list */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {meetings.length === 0 ? (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 60, textAlign: 'center', color: 'var(--text-muted)',
              }}>
                📅 Chưa có cuộc họp nào
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {meetings.map(m => {
                  const st = STATUS_MAP[m.status]
                  const isSelected = detail?.id === m.id
                  return (
                    <div
                      key={m.id}
                      onClick={() => openDetail(m)}
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid ${isSelected ? '#6366f1' : 'var(--border)'}`,
                        borderLeft: `4px solid ${st.color}`,
                        borderRadius: 12, padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'box-shadow .2s, transform .2s',
                        boxShadow: isSelected ? '0 4px 20px rgba(99,102,241,.15)' : 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = isSelected ? '0 4px 20px rgba(99,102,241,.15)' : 'none'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{m.title}</div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span>🕐 {fmtDateTime(m.scheduledAt)}</span>
                            <span>⏱️ {m.durationMinutes} phút</span>
                            <span>👤 {m.organizer.fullName}</span>
                            <span>👥 {m.participants.length} người</span>
                          </div>
                          {m.roomCode && (
                            <div style={{ marginTop: 6, fontSize: 12 }}>
                              <span style={{
                                fontFamily: 'monospace', background: 'var(--surface-2)',
                                border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 6,
                              }}>{m.roomCode}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                            color: st.color, background: st.bg, whiteSpace: 'nowrap',
                          }}>{st.label}</span>
                          {isManager() && (
                            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(m)}>✏️</button>
                              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => handleDelete(m.id)}>🗑️</button>
                            </div>
                          )}
                          {/* Nút vào phòng họp – hiện khi SCHEDULED hoặc ONGOING */}
                          {(m.status === 'SCHEDULED' || m.status === 'ONGOING') && (
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: 12, padding: '4px 12px' }}
                              onClick={e => { e.stopPropagation(); navigate(`/meetings/${m.id}/room`) }}
                            >
                              🎥 Vào phòng họp
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {detail && (
            <div style={{
              width: 380, flexShrink: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Panel header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{detail.title}</div>
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        color: STATUS_MAP[detail.status].color, background: STATUS_MAP[detail.status].bg,
                      }}>{STATUS_MAP[detail.status].label}</span>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setDetail(null)}>✕</button>
                </div>
              </div>

              {/* Nút vào phòng họp nổi bật */}
              {(detail.status === 'SCHEDULED' || detail.status === 'ONGOING') && (
                <div style={{ padding: '0 16px 12px' }}>
                  <button
                    onClick={() => navigate(`/meetings/${detail.id}/room`)}
                    style={{
                      width: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff', border: 'none', borderRadius: 10,
                      padding: '12px', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                      transition: 'transform .15s, box-shadow .15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = ''
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(99,102,241,0.4)'
                    }}
                  >
                    🎥 Vào phòng họp ngay
                  </button>
                </div>
              )}

              <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 13 }}>
                  <InfoRow icon="👤" label="Tổ chức" value={detail.organizer.fullName} />
                  <InfoRow icon="🕐" label="Thời gian" value={fmtDateTime(detail.scheduledAt)} />
                  <InfoRow icon="⏱️" label="Thời lượng" value={`${detail.durationMinutes} phút`} />
                  <InfoRow icon="🔑" label="Mã phòng" value={detail.roomCode} mono />
                </div>

                {detail.description && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Mô tả</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{detail.description}</div>
                  </div>
                )}

                {/* Đổi trạng thái (Manager) */}
                {isManager() && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Cập nhật trạng thái</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['SCHEDULED', 'ONGOING', 'ENDED', 'CANCELLED'] as MeetingStatus[])
                        .filter(s => s !== detail.status)
                        .map(s => (
                          <button key={s}
                            className="btn btn-secondary"
                            style={{ fontSize: 11, padding: '3px 8px', borderColor: STATUS_MAP[s].color, color: STATUS_MAP[s].color }}
                            onClick={() => handleStatusChange(detail.id, s)}
                          >→ {STATUS_MAP[s].label}</button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Danh sách tham dự */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    👥 Người tham dự ({detail.participants.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.participants.map(p => (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'var(--surface-2)', borderRadius: 8, padding: '6px 10px',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: '#6366f1', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600, flexShrink: 0,
                        }}>{p.employee.fullName.charAt(0)}</div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.employee.fullName}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: PARTICIPANT_MAP[p.status].color,
                        }}>{PARTICIPANT_MAP[p.status].label}</span>
                      </div>
                    ))}
                    {detail.participants.length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Chưa có người tham dự</div>
                    )}
                  </div>
                </div>

                {/* Biên bản cuộc họp */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>📝 Biên bản cuộc họp</span>
                    {isManager() && !editNotes && (
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => setEditNotes(true)}>Chỉnh sửa</button>
                    )}
                  </div>
                  {editNotes ? (
                    <div>
                      <textarea
                        style={{
                          width: '100%', minHeight: 120, padding: '8px 10px',
                          fontSize: 13, border: '1px solid var(--border)', borderRadius: 8,
                          background: 'var(--surface-2)', color: 'var(--text)',
                          resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                        }}
                        value={notesText}
                        onChange={e => setNotesText(e.target.value)}
                        placeholder="Ghi biên bản cuộc họp: nội dung thảo luận, kết luận, công việc giao từ cuộc họp..."
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditNotes(false)}>Hủy</button>
                        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={saveNotes} disabled={savingNotes}>
                          {savingNotes ? '⏳ Đang lưu...' : '💾 Lưu biên bản'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: 13, color: detail.meetingNotes ? 'var(--text)' : 'var(--text-muted)',
                      background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px',
                      lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 60,
                    }}>
                      {detail.meetingNotes || 'Chưa có biên bản...'}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal tạo / sửa */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: '28px 32px',
            width: '100%', maxWidth: 520,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
              {editMeeting ? '✏️ Chỉnh sửa cuộc họp' : '➕ Tạo cuộc họp mới'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Tiêu đề <span style={{ color: '#dc2626' }}>*</span></label>
                <input className="form-control" placeholder="Nhập tên cuộc họp..."
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              <div>
                <label className="form-label">Mô tả / Nội dung</label>
                <textarea className="form-control" rows={2} style={{ resize: 'vertical' }}
                  placeholder="Mục đích, nội dung cuộc họp..."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Người tổ chức <span style={{ color: '#dc2626' }}>*</span></label>
                  <select className="form-control" value={form.organizerId}
                    onChange={e => setForm({ ...form, organizerId: e.target.value })}>
                    <option value="">— Chọn —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Thời lượng (phút)</label>
                  <input type="number" className="form-control" min={15} step={15}
                    value={form.durationMinutes}
                    onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <label className="form-label">Thời gian họp <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="datetime-local" className="form-control"
                  value={form.scheduledAt}
                  onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>

              <div>
                <label className="form-label">Mời tham dự</label>
                <div style={{
                  border: '1px solid var(--border)', borderRadius: 8,
                  maxHeight: 160, overflowY: 'auto', padding: 8,
                  background: 'var(--surface-2)',
                }}>
                  {employees.map(e => (
                    <label key={e.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 6px', cursor: 'pointer', borderRadius: 6,
                      fontSize: 13,
                    }}>
                      <input
                        type="checkbox"
                        checked={form.participantIds.includes(e.id)}
                        onChange={ev => {
                          const ids = ev.target.checked
                            ? [...form.participantIds, e.id]
                            : form.participantIds.filter(id => id !== e.id)
                          setForm({ ...form, participantIds: ids })
                        }}
                      />
                      {e.fullName}
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Đã chọn: {form.participantIds.length} người
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Đang lưu...' : (editMeeting ? '💾 Cập nhật' : '✅ Tạo cuộc họp')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value, mono }: { icon: string; label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{icon} {label}</div>
      <div style={{
        fontWeight: 500, fontSize: 13,
        fontFamily: mono ? 'monospace' : undefined,
      }}>{value || '—'}</div>
    </div>
  )
}
