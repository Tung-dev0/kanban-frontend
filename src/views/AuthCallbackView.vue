<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const status = ref('Completing sign-in…')
const auth = useAuthStore()
const router = useRouter()

function parseHash(hash) {
  const out = {}
  const clean = hash.startsWith('#') ? hash.slice(1) : hash
  for (const part of clean.split('&')) {
    if (!part) continue
    const [k, v] = part.split('=')
    out[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '))
  }
  return out
}

onMounted(async () => {
  const params = parseHash(window.location.hash)
  if (!params.token) {
    router.replace({ path: '/login', query: { oauth_error: 'missing token in callback' } })
    return
  }
  try {
    await auth.completeOAuth({
      token: params.token,
      expiresAt: params.expires || null,
    })
    // remove the fragment from the URL so the token isn't kept in history
    history.replaceState(null, '', '/auth/callback')
    router.replace('/board')
  } catch (e) {
    router.replace({ path: '/login', query: { oauth_error: e.message || 'oauth failed' } })
  }
})
</script>

<template>
  <section class="auth-callback">
    <div class="callback-card reveal">
      <div class="callback-spinner" aria-hidden="true" />
      <p class="callback-text">{{ status }}</p>
    </div>
  </section>
</template>

<style scoped>
.auth-callback {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 1.5rem;
}
.callback-card {
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: var(--r-3);
  padding: 2.5rem 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.callback-spinner {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 2px solid var(--stroke-2);
  border-top-color: var(--coral);
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.callback-text {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin: 0;
}
</style>
