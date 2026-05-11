<script setup>
import { computed } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const today = computed(() => {
  const d = new Date()
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`
})

const initials = computed(() => {
  const u = auth.user?.username || '?'
  return u.slice(0, 2)
})

async function onLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="masthead">
    <div class="masthead-inner">
      <router-link to="/board" class="brand">
        <span class="dot" />
        <span>Journal</span>
      </router-link>

      <div v-if="auth.isAuthenticated" class="masthead-right">
        <span class="meta">{{ today }}</span>
        <span class="vrule" />
        <span class="who-chip">
          <span class="who-avatar">{{ initials }}</span>
          <span>{{ auth.user?.username }}</span>
        </span>
        <button class="btn-ghost" @click="onLogout" aria-label="Sign out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
      <div v-else class="masthead-right">
        <span class="meta">{{ today }}</span>
      </div>
    </div>
  </header>

  <main class="page" style="display: flex; flex-direction: column; flex: 1;">
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
  </main>
</template>
