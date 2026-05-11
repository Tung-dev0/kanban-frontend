# kanban-frontend

Vue 3 SPA for the Kanban app — Vite + Pinia + Vue Router, dark editorial-modern theme.

> This repo is a **submodule** of [kanban-console-pane](https://github.com/Tung-dev0/kanban-console-pane) (control plane). Org-level CLAUDE.md, agents, slash commands, and MCP config live there.

## Quick start
```bash
npm install
npm run dev         # http://localhost:5173 (Vite dev)
```

Or via the parent compose (preferred — runs behind nginx with the backend): see `kanban-console-pane`.

## Stack
- Vue 3 + `<script setup>` Composition API
- Vite 5 · Pinia · Vue Router 4
- `marked` v18 + `DOMPurify` v3 (sanitized markdown rendering in card detail modal)
- `@vueuse/integrations/useSortable` + `sortablejs` (card DnD across columns)
- Bricolage Grotesque / Inter Tight / JetBrains Mono via Google Fonts

## Layout
```
src/
  api/client.js         single fetch wrapper
  stores/auth.js        Pinia auth — persists {token, user, expiresAt} + completeOAuth + googleSignInURL
  stores/board.js       columns + cards optimistic actions + debounced updateCard (800ms per card)
  router/index.js       routes + guard; /auth/callback bypasses
  views/                LoginView, RegisterView, AuthCallbackView, BoardView
  components/           LabelChip, DueDatePill, BoardCard, BoardColumn, CardDetailModal, AddColumnButton, ColumnMenu
  App.vue               masthead + <router-view/>
  styles.css            global dark theme + tokens
```
