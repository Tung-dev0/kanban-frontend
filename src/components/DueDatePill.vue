<script setup>
import { computed } from 'vue'

/**
 * DueDatePill — relative-time pill with .amber / .overdue styling
 * Props:
 *   dueAt: string | null (ISO timestamp)
 */
const props = defineProps({
  dueAt: {
    type: String,
    default: null,
  },
})

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR   = 60 * MINUTE
const DAY    = 24 * HOUR

function relativeTime(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = then - now // positive = future, negative = past

  const absDiff = Math.abs(diff)
  const past = diff < 0

  if (absDiff < MINUTE) return past ? 'just now' : 'in a moment'
  if (absDiff < HOUR) {
    const m = Math.round(absDiff / MINUTE)
    return past ? `${m}m ago` : `in ${m}m`
  }
  if (absDiff < DAY) {
    const h = Math.round(absDiff / HOUR)
    return past ? `${h}h ago` : `in ${h}h`
  }
  const d = Math.round(absDiff / DAY)
  return past ? `${d}d ago` : `in ${d}d`
}

const state = computed(() => {
  if (!props.dueAt) return null
  const now = Date.now()
  const then = new Date(props.dueAt).getTime()
  const diff = then - now

  const text = relativeTime(props.dueAt)

  if (diff < 0) return { text, cls: 'overdue' }
  if (diff <= 2 * DAY) return { text, cls: 'amber' }
  return { text, cls: '' }
})
</script>

<template>
  <span
    v-if="state"
    class="due-pill"
    :class="state.cls"
    :title="dueAt"
    :aria-label="`Due ${state.text}`"
  >
    {{ state.text }}
  </span>
</template>
