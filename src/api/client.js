const BASE = '/api'

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  let data = null
  const text = await res.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = { raw: text } }
  }

  if (!res.ok) {
    const msg = data?.error || `request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  register: (username, password) =>
    request('POST', '/auth/register', { body: { username, password } }),
  login: (username, password) =>
    request('POST', '/auth/login', { body: { username, password } }),
  logout: (token) => request('POST', '/auth/logout', { token }),
  me: (token) => request('GET', '/auth/me', { token }),

  // ---- Kanban board ----
  getBoard: (token) =>
    request('GET', '/board', { token }),

  // ---- Columns ----
  createColumn: (token, name) =>
    request('POST', '/columns', { token, body: { name } }),
  updateColumn: (token, id, patch) =>
    request('PUT', `/columns/${id}`, { token, body: patch }),
  deleteColumn: (token, id) =>
    request('DELETE', `/columns/${id}`, { token }),
  reorderColumns: (token, orderedIds) =>
    request('PUT', '/columns/reorder', { token, body: { order: orderedIds } }),

  // ---- Cards ----
  createCard: (token, columnId, title) =>
    request('POST', '/cards', { token, body: { column_id: columnId, title } }),
  updateCard: (token, id, patch) =>
    request('PUT', `/cards/${id}`, { token, body: patch }),
  deleteCard: (token, id) =>
    request('DELETE', `/cards/${id}`, { token }),
  setCardLabels: (token, cardId, colors) =>
    request('PUT', `/cards/${cardId}/labels`, { token, body: { colors } }),
}
