import { defineStore } from 'pinia'
import { api } from '../api/client'
import { useAuthStore } from './auth'

const DEBOUNCE_MS = 800

export const useBoardStore = defineStore('board', {
  state: () => ({
    columns: [],       // [{ id, name, position, cards: [{ id, title, description, due_at, labels, created_at, updated_at }] }]
    loading: false,
    error: null,
    _dirtyTimers: {},  // Map-like: cardId -> timeoutHandle (plain object for reactivity compat)
    _errorTimer: null,
  }),

  getters: {
    totalCards(state) {
      return state.columns.reduce((sum, col) => sum + col.cards.length, 0)
    },
    overdueCount(state) {
      const now = new Date()
      return state.columns.reduce((sum, col) => {
        return sum + col.cards.filter(c => c.due_at && new Date(c.due_at) < now).length
      }, 0)
    },
    byColumnId: (state) => (id) => state.columns.find(c => c.id === id),
  },

  actions: {
    // ---- Internal helpers ----

    _token() {
      return useAuthStore().token
    },

    _handle401(err) {
      if (err?.status === 401) {
        useAuthStore()._clear()
      }
    },

    _setError(msg) {
      if (this._errorTimer) clearTimeout(this._errorTimer)
      this.error = msg
      this._errorTimer = setTimeout(() => { this.error = null }, 5000)
    },

    // ---- Board ----

    async fetchBoard() {
      this.loading = true
      this.error = null
      try {
        const data = await api.getBoard(this._token())
        this.columns = data.columns || []
      } catch (err) {
        this._handle401(err)
        this._setError(err.message)
      } finally {
        this.loading = false
      }
    },

    // ---- Columns ----

    async createColumn(name) {
      // Optimistic: add temporary entry
      const tempId = `tmp-${Date.now()}`
      const tempCol = { id: tempId, name, position: this.columns.length + 1, cards: [] }
      this.columns.push(tempCol)
      try {
        const data = await api.createColumn(this._token(), name)
        const col = data.column || data
        const idx = this.columns.findIndex(c => c.id === tempId)
        if (idx !== -1) {
          this.columns[idx] = { ...col, cards: [] }
        }
      } catch (err) {
        this._handle401(err)
        this.columns = this.columns.filter(c => c.id !== tempId)
        this._setError(err.message)
      }
    },

    async updateColumn(id, patch) {
      const col = this.columns.find(c => c.id === id)
      if (!col) return
      const snapshot = { ...col }
      Object.assign(col, patch)
      try {
        const data = await api.updateColumn(this._token(), id, patch)
        const updated = data.column || data
        Object.assign(col, updated)
      } catch (err) {
        this._handle401(err)
        Object.assign(col, snapshot)
        this._setError(err.message)
      }
    },

    async deleteColumn(id) {
      const idx = this.columns.findIndex(c => c.id === id)
      if (idx === -1) return
      const snapshot = this.columns[idx]
      this.columns.splice(idx, 1)
      try {
        await api.deleteColumn(this._token(), id)
      } catch (err) {
        this._handle401(err)
        this.columns.splice(idx, 0, snapshot)
        this._setError(err.message)
        // Re-throw so caller (ColumnMenu) can handle 409 specially
        throw err
      }
    },

    async reorderColumns(orderedIds) {
      const snapshot = [...this.columns]
      // Rearrange optimistically
      const sorted = orderedIds.map(id => this.columns.find(c => c.id === id)).filter(Boolean)
      this.columns = sorted
      try {
        await api.reorderColumns(this._token(), orderedIds)
      } catch (err) {
        this._handle401(err)
        this.columns = snapshot
        this._setError(err.message)
      }
    },

    // ---- Cards ----

    async createCard(columnId, title) {
      const col = this.columns.find(c => c.id === columnId)
      if (!col) return
      const tempId = `tmp-${Date.now()}`
      const tempCard = {
        id: tempId, column_id: columnId, title, description: '',
        due_at: null, labels: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      col.cards.unshift(tempCard)
      try {
        const data = await api.createCard(this._token(), columnId, title)
        const card = data.card || data
        const cardIdx = col.cards.findIndex(c => c.id === tempId)
        if (cardIdx !== -1) {
          col.cards[cardIdx] = card
        }
      } catch (err) {
        this._handle401(err)
        col.cards = col.cards.filter(c => c.id !== tempId)
        this._setError(err.message)
      }
    },

    // updateCard is debounced 800ms per card via _dirtyTimers map
    updateCard(id, patch) {
      // Apply immediately to UI
      for (const col of this.columns) {
        const card = col.cards.find(c => c.id === id)
        if (card) {
          Object.assign(card, patch)
          break
        }
      }

      // Cancel any pending timer for this card
      if (this._dirtyTimers[id]) {
        clearTimeout(this._dirtyTimers[id])
      }

      // Schedule API call
      this._dirtyTimers[id] = setTimeout(async () => {
        delete this._dirtyTimers[id]
        // Capture snapshot for revert
        let snapshot = null
        let targetCard = null
        for (const col of this.columns) {
          const card = col.cards.find(c => c.id === id)
          if (card) { snapshot = { ...card }; targetCard = card; break }
        }
        if (!targetCard) return
        try {
          const data = await api.updateCard(this._token(), id, patch)
          const updated = data.card || data
          if (targetCard) Object.assign(targetCard, updated)
        } catch (err) {
          this._handle401(err)
          if (snapshot && targetCard) Object.assign(targetCard, snapshot)
          this._setError(err.message)
        }
      }, DEBOUNCE_MS)
    },

    // Immediate (non-debounced) card update used for moves and label changes
    async updateCardImmediate(id, patch) {
      let snapshot = null
      let targetCard = null
      let sourceCol = null

      for (const col of this.columns) {
        const card = col.cards.find(c => c.id === id)
        if (card) { snapshot = { ...card }; targetCard = card; sourceCol = col; break }
      }
      if (!targetCard) return

      Object.assign(targetCard, patch)

      try {
        const data = await api.updateCard(this._token(), id, patch)
        const updated = data.card || data
        if (targetCard) Object.assign(targetCard, updated)
      } catch (err) {
        this._handle401(err)
        if (snapshot && targetCard) Object.assign(targetCard, snapshot)
        this._setError(err.message)
        throw err
      }
    },

    async deleteCard(id) {
      let cardSnapshot = null
      let sourceColIdx = -1
      let cardIdx = -1

      for (let i = 0; i < this.columns.length; i++) {
        const ci = this.columns[i].cards.findIndex(c => c.id === id)
        if (ci !== -1) {
          sourceColIdx = i
          cardIdx = ci
          cardSnapshot = this.columns[i].cards[ci]
          break
        }
      }
      if (sourceColIdx === -1) return

      this.columns[sourceColIdx].cards.splice(cardIdx, 1)
      try {
        await api.deleteCard(this._token(), id)
      } catch (err) {
        this._handle401(err)
        this.columns[sourceColIdx].cards.splice(cardIdx, 0, cardSnapshot)
        this._setError(err.message)
      }
    },

    // moveCard: splice card from source column, prepend into target column
    async moveCard(id, toColumnId) {
      // Cancel any pending debounced save for this card
      if (this._dirtyTimers[id]) {
        clearTimeout(this._dirtyTimers[id])
        delete this._dirtyTimers[id]
      }

      let card = null
      let fromColIdx = -1
      let cardIdx = -1

      for (let i = 0; i < this.columns.length; i++) {
        const ci = this.columns[i].cards.findIndex(c => c.id === id)
        if (ci !== -1) {
          fromColIdx = i
          cardIdx = ci
          card = { ...this.columns[i].cards[ci] }
          break
        }
      }
      if (!card) return

      const toColIdx = this.columns.findIndex(c => c.id === toColumnId)
      if (toColIdx === -1) return

      // Same column — no-op
      if (fromColIdx === toColIdx) return

      // Optimistic move
      this.columns[fromColIdx].cards.splice(cardIdx, 1)
      this.columns[toColIdx].cards.unshift({ ...card, column_id: toColumnId })

      try {
        const data = await api.updateCard(this._token(), id, { column_id: toColumnId })
        const updated = data.card || data
        const newCardIdx = this.columns[toColIdx].cards.findIndex(c => c.id === id)
        if (newCardIdx !== -1) {
          this.columns[toColIdx].cards[newCardIdx] = updated
        }
      } catch (err) {
        this._handle401(err)
        // Revert
        this.columns[toColIdx].cards = this.columns[toColIdx].cards.filter(c => c.id !== id)
        this.columns[fromColIdx].cards.splice(cardIdx, 0, card)
        this._setError(err.message)
      }
    },

    async setCardLabels(cardId, colors) {
      let targetCard = null
      let snapshot = null

      for (const col of this.columns) {
        const card = col.cards.find(c => c.id === cardId)
        if (card) { snapshot = { ...card }; targetCard = card; break }
      }
      if (!targetCard) return

      // Optimistic
      targetCard.labels = [...new Set(colors)]

      try {
        const data = await api.setCardLabels(this._token(), cardId, colors)
        targetCard.labels = data.labels || []
      } catch (err) {
        this._handle401(err)
        if (snapshot && targetCard) Object.assign(targetCard, snapshot)
        this._setError(err.message)
      }
    },
  },
})
