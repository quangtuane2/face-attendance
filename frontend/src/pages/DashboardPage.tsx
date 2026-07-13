import { useEffect, useRef, useState } from 'react'
import { attendanceApi } from '../services/api'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

interface Stats {
  totalEmployees: number
  presentOnTime: number
  presentLate: number
  absent: number
}

interface WeekDay {
  date: string
  day: string
  onTime: number
  late: number
  total: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [weekData, setWeekData] = useState<WeekDay[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportFrom, setExportFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [exportTo, setExportTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const now = new Date()

  useEffect(() => {
    Promise.all([
      attendanceApi.getDashboardStats(),
      attendanceApi.getWeeklyStats(),
      attendanceApi.getRecentLogs(8),
    ]).then(([s, w, r]) => {
      setStats(s.data)
      setWeekData(w.data)
      setRecentLogs(r.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh mỗi 30 giây
  useEffect(() => {
    const timer = setInterval(() => {
      attendanceApi.getDashboardStats().then(r => setStats(r.data)).catch(console.error)
      attendanceApi.getRecentLogs(8).then(r => setRecentLogs(r.data)).catch(console.error)
    }, 30_000)
    return () => clearInterval(timer)
  }, [])

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const res = await attendanceApi.exportCsv({ from: exportFrom, to: exportTo })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chamcong_${exportFrom}_${exportTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Xuất báo cáo thất bại!')
    } finally {
      setExporting(false)
    }
  }

  const statCards = [
    { label: 'Tổng nhân viên', value: stats?.totalEmployees ?? '—', icon: '👥', color: 'accent' },
    { label: 'Đúng giờ hôm nay', value: stats?.presentOnTime ?? '—', icon: '✅', color: 'success' },
    { label: 'Đi trễ hôm nay', value: stats?.presentLate ?? '—', icon: '⚠️', color: 'warning' },
    { label: 'Vắng mặt', value: stats?.absent ?? '—', icon: '❌', color: 'danger' },
  ]

  const attendanceRate = stats
    ? stats.totalEmployees > 0
      ? Math.round(((stats.presentOnTime + stats.presentLate) / stats.totalEmployees) * 100)
      : 0
    : null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Export CSV panel */}
          <div style={{
            display: 'flex', gap: '0.5rem', alignItems: 'center',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '0.4rem 0.75rem',
          }}>
            <input
              type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
              className="form-input" style={{ width: 130, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              id="export-from"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
            <input
              type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
              className="form-input" style={{ width: 130, padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              id="export-to"
            />
            <button
              id="btn-export-csv" className="btn btn-primary"
              onClick={handleExportCsv} disabled={exporting}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
            >
              {exporting ? '⏳ Đang xuất...' : '⬇️ Xuất CSV'}
            </button>
          </div>
          <a href="/checkin" className="btn btn-primary" id="goto-checkin">
            📷 Mở màn hình chấm công
          </a>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div>
              <div className="stat-value">{loading ? '...' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tỷ lệ có mặt hôm nay */}
      {!loading && attendanceRate !== null && (
        <div className="card mb-6" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📈 Tỷ lệ có mặt hôm nay</span>
            <span style={{ fontWeight: 700, color: attendanceRate >= 80 ? 'var(--success)' : 'var(--warning)' }}>
              {attendanceRate}%
            </span>
          </div>
          <div style={{
            height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden'
          }}>
            <div style={{
              width: `${attendanceRate}%`, height: '100%',
              background: attendanceRate >= 80 ? 'var(--success)' : 'var(--warning)',
              borderRadius: 99, transition: 'width 0.6s ease'
            }} />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {(stats?.presentOnTime ?? 0) + (stats?.presentLate ?? 0)} / {stats?.totalEmployees ?? 0} nhân viên có mặt
          </p>
        </div>
      )}

      {/* Chart + Recent */}
      <div className="grid-2">
        {/* Biểu đồ 7 ngày — DATA THẬT */}
        <div className="card">
          <h2 className="font-bold mb-4" style={{ fontSize: '1rem' }}>📊 Chấm công 7 ngày qua</h2>
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Đang tải...
            </div>
          ) : weekData.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Chưa có dữ liệu chấm công
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value: any, name: string) => [value, name === 'onTime' ? 'Đúng giờ' : 'Trễ']}
                />
                <Legend
                  formatter={(value) => value === 'onTime' ? 'Đúng giờ' : 'Trễ'}
                  wrapperStyle={{ fontSize: '0.78rem' }}
                />
                <Bar dataKey="onTime" name="onTime" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="late" fill="var(--warning)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Log gần đây — DATA THẬT */}
        <div className="card">
          <h2 className="font-bold mb-4" style={{ fontSize: '1rem' }}>⚡ Chấm công gần đây</h2>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Đang tải...</p>
          ) : recentLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              Chưa có dữ liệu chấm công hôm nay
            </p>
          ) : (
            <div className="flex flex-col gap-3" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between" style={{
                  padding: '0.625rem 0.875rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div className="flex items-center gap-3">
                    <div className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
                      {log.employee?.fullName?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{log.employee?.fullName ?? '—'}</div>
                      <div className="text-xs text-muted">
                        {log.checkType === 'IN' ? '🟢 Vào làm' : '🔴 Ra về'}
                        {' • '}
                        {log.checkTime ? format(new Date(log.checkTime), 'HH:mm') : '—'}
                        {log.employee?.department?.name ? ` • ${log.employee.department.name}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`badge badge-${log.status === 'ON_TIME' ? 'success' : log.status === 'LATE' ? 'warning' : 'muted'}`}>
                      {log.status === 'ON_TIME' ? 'Đúng giờ' : log.status === 'LATE' ? 'Trễ' : log.status === 'EARLY_LEAVE' ? 'Về sớm' : '—'}
                    </span>
                    {log.confidenceScore && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        AI: {(log.confidenceScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && recentLogs.length > 0 && (
            <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
              <a href="/logs" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>
                Xem tất cả →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
