import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import LoginPage         from './pages/LoginPage'
import DashboardPage     from './pages/DashboardPage'
import CheckInPage       from './pages/CheckInPage'
import EmployeesPage     from './pages/EmployeesPage'
import EnrollFacePage    from './pages/EnrollFacePage'
import DepartmentsPage   from './pages/DepartmentsPage'
import ShiftsPage        from './pages/ShiftsPage'
import AttendanceLogsPage from './pages/AttendanceLogsPage'

const isLoggedIn = () => !!localStorage.getItem('token')

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
}

function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const logout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const navItems = [
    { to: '/',            label: 'Dashboard',        icon: '📊', section: 'TỔNG QUAN' },
    { to: '/checkin',     label: 'Chấm công',         icon: '👁️', section: 'TỔNG QUAN' },
    { to: '/attendance',  label: 'Lịch sử chấm công', icon: '📋', section: 'TỔNG QUAN' },
    { to: '/employees',   label: 'Nhân viên',          icon: '👥', section: 'QUẢN LÝ' },
    { to: '/departments', label: 'Phòng ban',           icon: '🏢', section: 'QUẢN LÝ' },
    { to: '/shifts',      label: 'Ca làm việc',         icon: '⏰', section: 'QUẢN LÝ' },
  ]

  const sections = ['TỔNG QUAN', 'QUẢN LÝ']

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">👁️</div>
          <div>
            <div className="sidebar-logo-text">FaceAttend</div>
            <div className="sidebar-logo-sub">Chấm công thông minh</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section}>
              <div className="nav-section-title">{section}</div>
              {navItems.filter(n => n.section === section).map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  id={`nav-${item.to.replace('/', '') || 'dashboard'}`}
                >
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar-circle">{user.fullName?.charAt(0) || 'A'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="font-semibold truncate text-sm">{user.fullName || 'Admin'}</div>
              <div className="text-xs text-muted">{user.role || 'ADMIN'}</div>
            </div>
            <button
              id="btn-logout"
              className="btn btn-icon btn-secondary"
              onClick={logout}
              title="Đăng xuất"
              style={{ flexShrink: 0 }}
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/checkin" element={<CheckInPage />} />
      <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/employees" element={<ProtectedLayout><EmployeesPage /></ProtectedLayout>} />
      <Route path="/employees/:id/enroll" element={<ProtectedLayout><EnrollFacePage /></ProtectedLayout>} />
      <Route path="/departments" element={<ProtectedLayout><DepartmentsPage /></ProtectedLayout>} />
      <Route path="/shifts" element={<ProtectedLayout><ShiftsPage /></ProtectedLayout>} />
      <Route path="/attendance" element={<ProtectedLayout><AttendanceLogsPage /></ProtectedLayout>} />
    </Routes>
  )
}
