<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  if (route.query.oauth_error) {
    error.value = String(route.query.oauth_error)
  }
})

async function onSubmit() {
  error.value = ''
  submitting.value = true
  try {
    await auth.login(username.value, password.value)
    router.push('/board')
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="auth">
    <div class="panel-left reveal-slow">
      <div class="eyebrow">Welcome back</div>
      <h1 class="display" style="margin-top: 1.25rem">
        Pick up<br />where you<br />left <span class="accent">off.</span>
      </h1>
      <p class="lede" style="margin-top: 1.5rem">
        A fast, private place for the things you said you would do.
        Sign in to see your list.
      </p>

      <ul class="feature-list">
        <li><span class="pip">⌘</span><span><strong>Keyboard-first.</strong> Add with <span class="kbd">Enter</span>, toggle with <span class="kbd">Space</span>.</span></li>
        <li><span class="pip">◐</span><span><strong>Live progress.</strong> Track completion at a glance with stats and progress bar.</span></li>
        <li><span class="pip">⎘</span><span><strong>Filter &amp; sort.</strong> All, Active, Done — one tap.</span></li>
      </ul>
    </div>

    <div class="panel-right">
      <div class="form-wrap reveal">
        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 1.5rem">
          <h2 class="section">Sign in</h2>
          <RouterLink class="linkcaps" to="/register">Create account →</RouterLink>
        </div>

        <form @submit.prevent="onSubmit">
          <div v-if="error" class="error">{{ error }}</div>

          <div class="field">
            <label for="u">Username</label>
            <input
              id="u"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="your handle"
              required
            />
          </div>

          <div class="field">
            <label for="p">Password</label>
            <input
              id="p"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="•••••••"
              required
            />
          </div>

          <button class="btn-primary" type="submit" :disabled="submitting">
            <span v-if="!submitting">Sign in</span>
            <span v-else>Signing in…</span>
            <svg v-if="!submitting" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                 width="14" height="14">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>

        <div class="divider"><span>or</span></div>

        <a class="btn-google" :href="auth.googleSignInURL()">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#EA4335" d="M9 3.48c1.69 0 2.84.73 3.49 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"/>
            <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
            <path fill="#FBBC05" d="M3.87 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.91-2.26z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.13-3.74L.96 13.04C2.44 15.98 5.48 18 9 18z"/>
          </svg>
          Continue with Google
        </a>

        <div style="margin-top: 1.25rem; display: flex; align-items: center; gap: 0.5rem; justify-content: center">
          <span class="smallcaps">Tip</span>
          <span style="font-size: 13px; color: var(--text-soft)">use <span class="kbd">Tab</span> to move between fields</span>
        </div>
      </div>
    </div>
  </section>
</template>
