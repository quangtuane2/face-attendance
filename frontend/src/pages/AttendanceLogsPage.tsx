import { useEffect, useState } from 'react'
import { attendanceApi } from '../services/api'
import { format } from 'date-fns'

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [to, setTo]   = useState(format(new Date(), 'yyyy-MM-dd'))

  const load = () => {
    setLoading(true)
    attendanceApi.getLogs({
      from: from + 'T00:00:00',
      to: to + 'T23:59:59',
    }).then(r => setLogs(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const statusBadge = (s: string) => {
    if (s === 'ON_TIME')    return <span className="badge badge-success">✅ Đúng giờ</span>
    if (s === 'LATE')       return <span className="badge badge-warning">⚠️ Trễ</span>
    if (s === 'EARLY_LEAVE')return <span className="badge badge-warning">⚠️ Về sớm</span>
    return <span className="badge badge-muted">—</span>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch sử chấm công</h1>
          <p className="page-subtitle">{logs.length} bản ghi</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-4">
        <div className="flex gap-4 items-center">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Từ ngày</label>
            <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Đến ngày</label>
            <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div style={{ marginTop: 24 }}>
            <button id="btn-filter-logs" className="btn btn-primary" onClick={load}>🔍 Lọc</button>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th><th>Phòng ban</th><th>Loại</th>
              <th>Thời gian</th><th>Trạng thái</th><th>Độ chính xác AI</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>Đang tải...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>Không có dữ liệu</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="avatar-circle" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                      {log.employee?.fullName?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{log.employee?.fullName}</div>
                      <div className="text-xs text-muted">{log.employee?.employeeCode}</div>
                    </div>
                  </div>
                </td>
                <td className="text-sm text-muted">{log.employee?.department?.name || '—'}</td>
                <td>
                  <span className={`badge ${log.checkType === 'IN' ? 'badge-success' : 'badge-accent'}`}>
                    {log.checkType === 'IN' ? '🟢 Vào làm' : '🔴 Ra về'}
                  </span>
                </td>
                <td className="text-sm">
                  {log.checkTime ? format(new Date(log.checkTime), 'HH:mm — dd/MM/yyyy') : '—'}
                </td>
                <td>{statusBadge(log.status)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: 60, height: 6,
                      background: 'var(--bg-secondary)',
                      borderRadius: 99, overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(log.confidenceScore || 0) * 100}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        borderRadius: 99,
                      }} />
                    </div>
                    <span className="text-xs text-muted">
                      {log.confidenceScore ? `${(log.confidenceScore * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
