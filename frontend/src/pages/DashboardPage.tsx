import { useEffect, useState } from 'react'
import { attendanceApi } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Stats {
  totalEmployees: number
  presentOnTime: number
  presentLate: number
  absent: number
}

const mockWeekData = [
  { day: 'T2', onTime: 45, late: 3 },
  { day: 'T3', onTime: 48, late: 2 },
  { day: 'T4', onTime: 44, late: 5 },
  { day: 'T5', onTime: 47, late: 1 },
  { day: 'T6', onTime: 43, late: 4 },
  { day: 'T7', onTime: 20, late: 1 },
  { day: 'CN', onTime: 5,  late: 0 },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()

  useEffect(() => {
    attendanceApi.getDashboardStats()
      .then(r => setStats(r.data))
      .catch(() => setStats({ totalEmployees: 52, presentOnTime: 44, presentLate: 3, absent: 5 }))
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Tổng nhân viên', value: stats?.totalEmployees ?? '—', icon: '👥', color: 'accent' },
    { label: 'Đúng giờ hôm nay', value: stats?.presentOnTime ?? '—', icon: '✅', color: 'success' },
    { label: 'Đi trễ hôm nay', value: stats?.presentLate ?? '—', icon: '⚠️', color: 'warning' },
    { label: 'Vắng mặt', value: stats?.absent ?? '—', icon: '❌', color: 'danger' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <a href="/checkin" className="btn btn-primary" id="goto-checkin">
          📷 Mở màn hình chấm công
        </a>
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

      {/* Chart + Recent */}
      <div className="grid-2">
        <div className="card">
          <h2 className="font-bold mb-4" style={{ fontSize: '1rem' }}>📊 Chấm công 7 ngày qua</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockWeekData} barCategoryGap="35%">
              <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Bar dataKey="onTime" name="Đúng giờ" fill="var(--success)" radius={[4,4,0,0]} />
              <Bar dataKey="late" name="Trễ" fill="var(--warning)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-bold mb-4" style={{ fontSize: '1rem' }}>⚡ Chấm công gần đây</h2>
          <div className="flex flex-col gap-3">
            {[
              { name: 'Nguyễn Văn A', time: '08:02', type: 'IN', status: 'ON_TIME' },
              { name: 'Trần Thị B',   time: '08:19', type: 'IN', status: 'LATE' },
              { name: 'Lê Văn C',     time: '08:05', type: 'IN', status: 'ON_TIME' },
              { name: 'Phạm Thị D',   time: '17:01', type: 'OUT', status: 'ON_TIME' },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between" style={{
                padding: '0.625rem 0.875rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div className="flex items-center gap-3">
                  <div className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{r.name}</div>
                    <div className="text-xs text-muted">{r.type === 'IN' ? '🟢 Vào làm' : '🔴 Ra về'} • {r.time}</div>
                  </div>
                </div>
                <span className={`badge badge-${r.status === 'ON_TIME' ? 'success' : 'warning'}`}>
                  {r.status === 'ON_TIME' ? 'Đúng giờ' : 'Trễ'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
