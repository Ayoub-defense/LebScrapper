const BASE = '/api'

export function getToken() { return localStorage.getItem('token') }
export function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}') }
  catch { return {} }
}
export function isLoggedIn() { return !!getToken() }
export function saveAuth(token, user) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user || {}))
}
export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

async function request(method, path, body, isForm = false) {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isForm && body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : (body ? JSON.stringify(body) : undefined),
  })

  if (res.status === 401) { logout(); return }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }))
    throw new Error(err.detail || 'Erreur inconnue')
  }
  return res.json().catch(() => null)
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  postForm: (path, form) => request('POST', path, form, true),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
}
