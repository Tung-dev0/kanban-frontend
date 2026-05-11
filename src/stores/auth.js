import { defineStore } from 'pinia'
import { api } from '../api/client'

const STORAGE_KEY = 'todo-auth'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function save(state) {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  else localStorage.removeItem(STORAGE_KEY)
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const persisted = load()
    return {
      token: persisted?.token || null,
      user: persisted?.user || null,
      expiresAt: persisted?.expiresAt || null,
    }
  },
  getters: {
    isAuthenticated: (s) => {
      if (!s.token) return false
      if (s.expiresAt && new Date(s.expiresAt) < new Date()) return false
      return true
    },
  },
  actions: {
    async login(username, password) {
      const res = await api.login(username, password)
      this._set(res)
    },
    async register(username, password) {
      const res = await api.register(username, password)
      this._set(res)
    },
    async logout() {
      if (this.token) {
        try { await api.logout(this.token) } catch { /* ignore */ }
      }
      this._clear()
    },
    // completeOAuth is called by the /auth/callback view after a successful
    // Google sign-in redirect. It stores the token then fetches the user.
    async completeOAuth({ token, expiresAt }) {
      this.token = token
      this.expiresAt = expiresAt
      // persist token first so the next request includes it
      save({ token, user: null, expiresAt })
      try {
        const user = await api.me(token)
        this.user = user
        save({ token, user, expiresAt })
      } catch (e) {
        this._clear()
        throw e
      }
    },
    googleSignInURL() { return '/api/auth/google/start' },
    _set({ token, user, expires_at }) {
      this.token = token
      this.user = user
      this.expiresAt = expires_at
      save({ token, user, expiresAt: expires_at })
    },
    _clear() {
      this.token = null
      this.user = null
      this.expiresAt = null
      save(null)
    },
  },
})
