<script setup>
/**
 * ColumnMenu — ⋯ dropdown: Rename / Delete
 * Emits: rename, delete
 * If delete fails with 409, shows a blocked-delete dialog.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useBoardStore } from '../stores/board'

const props = defineProps({
  columnId: {
    type: [Number, String],
    required: true,
  },
  columnName: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['rename'])

const boardStore = useBoardStore()

const open = ref(false)
const blocked = ref(false)
const blockedMsg = ref('')
const menuBtn = ref(null)
const menuEl = ref(null)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onRename() {
  close()
  emit('rename')
}

async function onDelete() {
  close()
  try {
    await boardStore.deleteColumn(props.columnId)
  } catch (err) {
    if (err?.status === 409) {
      blockedMsg.value = err.message || 'This column still has cards. Move or delete them first.'
      blocked.value = true
    }
  }
}

function closeBlocked() {
  blocked.value = false
}

// Close dropdown on outside click
function onDocClick(e) {
  if (!menuEl.value?.contains(e.target)) close()
}

onMounted(() => document.addEventListener('click', onDocClick, true))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick, true))
</script>

<template>
  <div ref="menuEl" class="column-menu-wrap">
    <button
      ref="menuBtn"
      type="button"
      class="column-menu-btn"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="Column menu"
      @click.stop="toggle"
    >
      &#8943;
    </button>

    <div
      v-if="open"
      class="column-menu-dropdown"
      role="menu"
      @keydown.escape.prevent="close"
    >
      <button
        class="column-menu-item"
        role="menuitem"
        type="button"
        @click="onRename"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Rename
      </button>
      <button
        class="column-menu-item danger"
        role="menuitem"
        type="button"
        @click="onDelete"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        Delete
      </button>
    </div>

    <!-- Blocked-delete dialog -->
    <Teleport to="body">
      <div
        v-if="blocked"
        class="blocked-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-title"
        @click.self="closeBlocked"
        @keydown.escape.prevent="closeBlocked"
      >
        <div class="blocked-dialog-shell">
          <h3 id="blocked-title">Cannot delete column</h3>
          <p>{{ blockedMsg }}</p>
          <div class="blocked-dialog-actions">
            <button class="btn-primary" type="button" style="width: auto;" @click="closeBlocked">
              OK
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
