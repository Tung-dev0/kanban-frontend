<script setup>
import { ref, nextTick } from 'vue'

const emit = defineEmits(['add'])

const expanded = ref(false)
const inputValue = ref('')
const inputRef = ref(null)

async function expand() {
  expanded.value = true
  await nextTick()
  inputRef.value?.focus()
}

function collapse() {
  expanded.value = false
  inputValue.value = ''
}

function submit() {
  const name = inputValue.value.trim()
  if (!name) return
  emit('add', name)
  collapse()
}

function onKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); submit() }
  if (e.key === 'Escape') { e.preventDefault(); collapse() }
}
</script>

<template>
  <!-- Ghost button (collapsed state) -->
  <button
    v-if="!expanded"
    class="add-column-btn"
    type="button"
    aria-label="Add a new column"
    @click="expand"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
    Column
  </button>

  <!-- Inline form (expanded state) -->
  <div v-else class="add-column-form" role="group" aria-label="New column">
    <input
      ref="inputRef"
      v-model="inputValue"
      type="text"
      placeholder="Column name…"
      maxlength="60"
      aria-label="Column name"
      @keydown="onKeydown"
    />
    <div class="form-actions">
      <button class="btn-primary" type="button" style="width: auto; padding: 0.5rem 1rem;" @click="submit">
        Add
      </button>
      <button class="btn-ghost" type="button" @click="collapse">
        Cancel
      </button>
    </div>
  </div>
</template>
