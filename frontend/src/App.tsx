import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import LoginPage          from './pages/LoginPage'
import DashboardPage      from './pages/DashboardPage'
import CheckInPage        from './pages/CheckInPage'
import EmployeesPage      from './pages/EmployeesPage'
import EnrollFacePage     from './pages/EnrollFacePage'
import DepartmentsPage    from './pages/DepartmentsPage'
import ShiftsPage         from './pages/ShiftsPage'
import AttendanceLogsPage from './pages/AttendanceLogsPage'
import TasksPage          from './pages/TasksPage'
import UsersPage          from './pages/UsersPage'

// ─── Helpers ──────────────────────────────────────────────────────────────────
type Role = 'ADMIN' | 'TRUONG_PHONG' | 'PHO_PHONG' | 'CHUYEN_VIEN'

const getUser  = () => JSON.parse(localStorage.getItem('user') || '{}')
const getRole  = (): Role => getUser().role || 'CHUYEN_VIEN'
const isLogged = () => !!localStorage.getItem('token')

// Tên hiển thị vai trò
const ROLE_LABEL: Record<string, string> = {
  ADMIN:        '⭐ Quản trị viên',
  TRUONG_PHONG: '👑 Trưởng phòng',
  PHO_PHONG:    '🏅 Phó phòng',
  CHUYEN_VIEN:  '👤 Chuyên viên',
}

// ─── Route guard theo role ────────────────────────────────────────────────────
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles?: Role[]
}) {
  if (!isLogged()) return <Navigate to="/login" replace />
  const role = getRole()
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Chuyên viên vào trang không được phép → redirect về /tasks
    return <Navigate to="/tasks" replace />
  }
  return <AppShell>{children}</AppShell>
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const user = getUser()
  const role = getRole()

  const logout = () => {
    localStorage.clear()
    navigate('/login')
  }

  // Cấu hình menu theo role
  const allNavItems = [
    // TỔNG QUAN – chỉ ADMIN
    {
      to: '/', label: 'Dashboard', icon: '📊', section: 'TỔNG QUAN',
      roles: ['ADMIN'] as Role[],
    },
    // Lịch sử chấm công – ADMIN + TRUONG_PHONG + PHO_PHONG
    {
      to: '/attendance', label: 'Lịch sử chấm công', icon: '📋', section: 'TỔNG QUAN',
      roles: ['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG'] as Role[],
    },
    // QUẢN LÝ – ADMIN + TRUONG_PHONG + PHO_PHONG
    {
      to: '/employees', label: 'Nhân viên', icon: '👥', section: 'QUẢN LÝ',
      roles: ['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG'] as Role[],
    },
    {
      to: '/departments', label: 'Phòng ban', icon: '🏢', section: 'QUẢN LÝ',
      roles: ['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG'] as Role[],
    },
    {
      to: '/shifts', label: 'Ca làm việc', icon: '⏰', section: 'QUẢN LÝ',
      roles: ['ADMIN'] as Role[],
    },
    // CÔNG VIỆC – tất cả role
    {
      to: '/tasks', label: 'Công việc', icon: '✅', section: 'CÔNG VIỆC',
      roles: ['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG', 'CHUYEN_VIEN'] as Role[],
    },
    // HỆ THỐNG – chỉ ADMIN
    {
      to: '/users', label: 'Tài khoản', icon: '🔐', section: 'HỆ THỐNG',
      roles: ['ADMIN'] as Role[],
    },
  ]

  // Lọc menu theo role hiện tại
  const visibleItems = allNavItems.filter(item => item.roles.includes(role))

  // Lấy các section có ít nhất 1 item hiển thị
  const visibleSections = ['TỔNG QUAN', 'QUẢN LÝ', 'CÔNG VIỆC', 'HỆ THỐNG'].filter(sec =>
    visibleItems.some(item => item.section === sec)
  )

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏛️</div>
          <div>
            <div className="sidebar-logo-text">CQ Quản lý</div>
            <div className="sidebar-logo-sub">Hệ thống thông minh</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleSections.map(section => (
            <div key={section}>
              <div className="nav-section-title">{section}</div>
              {visibleItems.filter(n => n.section === section).map(item => (
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
            <div className="avatar-circle">{user.fullName?.charAt(0) || 'U'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="font-semibold truncate text-sm">{user.fullName || 'Người dùng'}</div>
              <div className="text-xs text-muted">{ROLE_LABEL[role] || role}</div>
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

// ─── App Routes ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Public – không cần đăng nhập */}
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/checkin" element={<CheckInPage />} />  {/* Kiosk chấm công */}

      {/* ADMIN only */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/shifts" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <ShiftsPage />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <UsersPage />
        </ProtectedRoute>
      } />

      {/* ADMIN + TRUONG_PHONG + PHO_PHONG */}
      <Route path="/employees" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG']}>
          <EmployeesPage />
        </ProtectedRoute>
      } />
      <Route path="/employees/:id/enroll" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG']}>
          <EnrollFacePage />
        </ProtectedRoute>
      } />
      <Route path="/departments" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG']}>
          <DepartmentsPage />
        </ProtectedRoute>
      } />
      <Route path="/attendance" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'TRUONG_PHONG', 'PHO_PHONG']}>
          <AttendanceLogsPage />
        </ProtectedRoute>
      } />

      {/* Tất cả role đã đăng nhập */}
      <Route path="/tasks" element={
        <ProtectedRoute>
          <TasksPage />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

