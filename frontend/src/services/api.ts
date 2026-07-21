
// API service — axios instance + typed calls
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// Gắn JWT token vào mỗi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect về login nếu 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

//  Auth 
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; username: string; fullName: string; role: string }>(
      '/auth/login', { username, password }
    ),
}

// Employees 
export const employeeApi = {
  getAll: (params?: { departmentId?: number; shiftId?: number }) =>
    api.get('/employees', { params }),
  getById: (id: number) => api.get(`/employees/${id}`),
  getNextCode: () => api.get<{ code: string }>('/employees/next-code'),
  create: (data: any) => api.post('/employees', data),
  update: (id: number, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
  enrollFace: (id: number, imageFile: File) => {
    const form = new FormData()
    form.append('image', imageFile)
    return api.post(`/employees/${id}/enroll`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  enrollFaceBlob: (id: number, blob: Blob) => {
    const form = new FormData()
    form.append('image', blob, 'face.jpg')
    return api.post(`/employees/${id}/enroll`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

// Departments 
export const departmentApi = {
  getAll: () => api.get('/departments'),
  getTree: () => api.get('/departments/tree'),
  create: (data: any) => api.post('/departments', data),
  update: (id: number, data: any) => api.put(`/departments/${id}`, data),
  delete: (id: number) => api.delete(`/departments/${id}`),
}

//  Shifts 
export const shiftApi = {
  getAll: () => api.get('/shifts'),
  create: (data: any) => api.post('/shifts', data),
  update: (id: number, data: any) => api.put(`/shifts/${id}`, data),
  delete: (id: number) => api.delete(`/shifts/${id}`),
}

// Attendance
export const attendanceApi = {
  checkIn: (imageBlob: Blob) => {
    const form = new FormData()
    form.append('image', imageBlob, 'frame.jpg')
    return api.post('/attendance/check-in', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getLogs: (params?: { employeeId?: number; from?: string; to?: string }) =>
    api.get('/attendance/logs', { params }),
  getDashboardStats: () => api.get<{
    totalEmployees: number
    presentOnTime: number
    presentLate: number
    absent: number
  }>('/attendance/dashboard/stats'),
  getWeeklyStats: () => api.get<Array<{
    date: string
    day: string
    onTime: number
    late: number
    total: number
  }>>('/attendance/dashboard/weekly'),
  getRecentLogs: (limit = 8) => api.get<any[]>(`/attendance/dashboard/recent?limit=${limit}`),
  exportCsv: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams()
    if (params?.from) q.append('from', params.from + 'T00:00:00')
    if (params?.to) q.append('to', params.to + 'T23:59:59')
    return api.get(`/attendance/export/csv?${q}`, { responseType: 'blob' })
  },
}
