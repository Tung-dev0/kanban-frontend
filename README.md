# todo-frontend

Vue 3 SPA for the Todo backend.

## Stack
- Vue 3 (Composition API, `<script setup>`)
- Vite, Vue Router, Pinia
- Plain `fetch`, no extra HTTP lib

## Quick start
```bash
npm install
npm run dev    # http://localhost:5173
```

The dev server proxies `/api/*` to `http://localhost:8080` (see `vite.config.js`).
Make sure `todo-backend` is running on `:8080` (its default).

## Build
```bash
npm run build
npm run preview
```

## Auth model
- `POST /api/auth/login` and `/register` return `{ token, expires_at, user }`.
- The token is kept in `localStorage` (`todo-auth`) and put on every authenticated request as `Authorization: Bearer <token>`.
- Logout calls `POST /api/auth/logout` then clears localStorage. Because JWT is stateless, the server endpoint just acknowledges; the actual sign-out is the client dropping the token.
- The router guard (`src/router/index.js`) redirects `/todos` → `/login` if there's no valid token, and `/login` → `/todos` if there is one.

## Layout
```
src/
  api/client.js       fetch wrapper, all calls go through here
  stores/auth.js      Pinia store + localStorage persistence
  stores/todos.js     Pinia store for the todo list
  router/index.js     routes + auth guard
  views/              LoginView, RegisterView, TodosView
  components/         TodoItem
  App.vue             nav shell + <router-view/>
  styles.css          global styles (dark theme)
```
