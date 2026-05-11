<script setup>
/**
 * CardDetailModal — full card detail overlay
 * Props: card (Object), columns (Array)
 * Emits: close
 *
 * Features:
 * - Editable title (contenteditable)
 * - Column selector + date input + label toggles
 * - Markdown editor with toolbar + Edit/Preview toggle
 * - Auto-save with debounce (uses boardStore.updateCard)
 * - Focus trap + Esc/click-outside close
 * - Restore focus to invoking element on close
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import LabelChip from './LabelChip.vue'
import DueDatePill from './DueDatePill.vue'
import { useBoardStore } from '../stores/board'

const LABEL_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  columns: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['close'])

const boardStore = useBoardStore()

// ---- Local editable state (mirrors the card prop, edited locally) ----
const localTitle = ref(props.card.title)
const localDesc = ref(props.card.description || '')
const localDueAt = ref(props.card.due_at ? props.card.due_at.split('T')[0] : '')
const localColumnId = ref(props.card.column_id)
const localLabels = ref([...(props.card.labels || [])])

// ---- Save badge ----
const saveBadgeState = ref('hidden') // 'hidden' | 'saving' | 'saved'
let saveBadgeTimer = null

function showSaving() {
  clearTimeout(saveBadgeTimer)
  saveBadgeState.value = 'saving'
}

function showSaved() {
  saveBadgeState.value = 'saved'
  saveBadgeTimer = setTimeout(() => { saveBadgeState.value = 'hidden' }, 2000)
}

// ---- Auto-save: title & description (debounced via boardStore) ----
watch(localTitle, (val) => {
  if (val === props.card.title) return
  showSaving()
  boardStore.updateCard(props.card.id, { title: val })
  // Listen for the debounce to complete — show saved after delay
  clearTimeout(saveBadgeTimer)
  saveBadgeTimer = setTimeout(() => { showSaved() }, 900)
})

watch(localDesc, (val) => {
  if (val === (props.card.description || '')) return
  showSaving()
  boardStore.updateCard(props.card.id, { description: val })
  clearTimeout(saveBadgeTimer)
  saveBadgeTimer = setTimeout(() => { showSaved() }, 900)
})

// ---- Due date change ----
async function onDueDateChange() {
  const duePatch = localDueAt.value
    ? { due_at: new Date(localDueAt.value).toISOString() }
    : { due_at: null }
  showSaving()
  try {
    await boardStore.updateCardImmediate(props.card.id, duePatch)
    showSaved()
  } catch {
    saveBadgeState.value = 'hidden'
  }
}

// ---- Column move ----
async function onColumnChange() {
  if (localColumnId.value === props.card.column_id) return
  showSaving()
  try {
    await boardStore.moveCard(props.card.id, localColumnId.value)
    showSaved()
  } catch {
    saveBadgeState.value = 'hidden'
  }
}

// ---- Labels ----
function isLabelActive(color) {
  return localLabels.value.includes(color)
}

async function toggleLabel(color) {
  const idx = localLabels.value.indexOf(color)
  if (idx === -1) {
    localLabels.value.push(color)
  } else {
    localLabels.value.splice(idx, 1)
  }
  showSaving()
  try {
    await boardStore.setCardLabels(props.card.id, localLabels.value)
    showSaved()
  } catch {
    saveBadgeState.value = 'hidden'
  }
}

// ---- Markdown preview ----
const previewMode = ref(false)

const renderedHtml = computed(() => {
  if (!previewMode.value) return ''
  const raw = marked.parse(localDesc.value || '')
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'del',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote',
      'code', 'pre',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    ALLOW_DATA_ATTR: false,
    // Strip javascript: from hrefs
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
    // DOMPurify already strips javascript: links by default
  })
})

// ---- Markdown toolbar helpers ----
const textareaRef = ref(null)

function insertMarkdown(before, after = '') {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const selected = localDesc.value.slice(start, end)
  const replacement = before + selected + after
  localDesc.value = localDesc.value.slice(0, start) + replacement + localDesc.value.slice(end)
  nextTick(() => {
    ta.focus()
    ta.selectionStart = start + before.length
    ta.selectionEnd = start + before.length + selected.length
  })
}

function toolBold() { insertMarkdown('**', '**') }
function toolItalic() { insertMarkdown('*', '*') }
function toolLink() {
  const url = 'https://'
  insertMarkdown('[', `](${url})`)
}
function toolCode() { insertMarkdown('`', '`') }

// ---- Title contenteditable ----
const titleRef = ref(null)

function onTitleInput() {
  localTitle.value = titleRef.value?.innerText?.trim() || ''
}

function onTitleKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault() }
}

// ---- Delete card ----
async function onDeleteCard() {
  await boardStore.deleteCard(props.card.id)
  emit('close')
}

// ---- Focus trap ----
const shellRef = ref(null)

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])', '[contenteditable]',
].join(', ')

function getFocusable() {
  return [...(shellRef.value?.querySelectorAll(FOCUSABLE) || [])]
}

function trapFocus(e) {
  const focusable = getFocusable()
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.key === 'Tab') {
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}

// ---- Esc / overlay close ----
function onEsc(e) {
  if (e.key === 'Escape') close()
}

function onOverlayClick(e) {
  if (e.target === e.currentTarget) close()
}

function close() {
  emit('close')
}

// ---- Lifecycle ----
onMounted(() => {
  document.addEventListener('keydown', onEsc)
  nextTick(() => {
    // Set initial title text in contenteditable
    if (titleRef.value) {
      titleRef.value.innerText = localTitle.value
    }
    // Focus the title
    titleRef.value?.focus()
    if (titleRef.value) {
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(titleRef.value)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onEsc)
  clearTimeout(saveBadgeTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`modal-title-${card.id}`"
      @click="onOverlayClick"
      @keydown="trapFocus"
    >
      <div ref="shellRef" class="modal-shell">
        <!-- Header: editable title + close -->
        <div class="modal-header">
          <div
            :id="`modal-title-${card.id}`"
            ref="titleRef"
            class="modal-title"
            contenteditable="true"
            role="textbox"
            aria-multiline="false"
            aria-label="Card title"
            spellcheck="true"
            @input="onTitleInput"
            @keydown="onTitleKeydown"
          />
          <button
            type="button"
            class="modal-close"
            aria-label="Close modal"
            @click="close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Status row: column + due date -->
          <div class="modal-status-row">
            <select
              v-model="localColumnId"
              class="modal-select"
              aria-label="Move to column"
              @change="onColumnChange"
            >
              <option
                v-for="col in columns"
                :key="col.id"
                :value="col.id"
              >
                {{ col.name }}
              </option>
            </select>

            <input
              v-model="localDueAt"
              type="date"
              class="modal-date"
              aria-label="Due date"
              @change="onDueDateChange"
            />
          </div>

          <!-- Label toggles -->
          <div class="modal-label-row" role="group" aria-label="Labels">
            <LabelChip
              v-for="color in LABEL_COLORS"
              :key="color"
              :color="color"
              mode="chip"
              :active="isLabelActive(color)"
              @toggle="toggleLabel"
            />
          </div>

          <!-- Markdown editor -->
          <div>
            <div class="md-toolbar" role="toolbar" aria-label="Text formatting">
              <button
                type="button"
                class="md-toolbar-btn"
                title="Bold"
                aria-label="Bold"
                @click="toolBold"
              >B</button>
              <button
                type="button"
                class="md-toolbar-btn"
                title="Italic"
                aria-label="Italic"
                style="font-style: italic;"
                @click="toolItalic"
              >I</button>
              <button
                type="button"
                class="md-toolbar-btn"
                title="Link"
                aria-label="Insert link"
                @click="toolLink"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
              <button
                type="button"
                class="md-toolbar-btn"
                title="Inline code"
                aria-label="Inline code"
                style="font-family: var(--font-mono);"
                @click="toolCode"
              >&lt;/&gt;</button>
              <span class="spacer" />
              <button
                type="button"
                class="md-preview-toggle"
                :class="{ active: previewMode }"
                :aria-pressed="previewMode"
                @click="previewMode = !previewMode"
              >
                {{ previewMode ? 'Edit' : 'Preview' }}
              </button>
            </div>

            <!-- Edit: textarea -->
            <textarea
              v-if="!previewMode"
              ref="textareaRef"
              v-model="localDesc"
              class="md-textarea"
              placeholder="Add a description (markdown)…"
              maxlength="10000"
              aria-label="Card description (markdown)"
              rows="7"
            />

            <!-- Preview: rendered HTML -->
            <div
              v-else
              class="md-render"
              aria-label="Description preview"
              v-html="renderedHtml"
            />
          </div>
        </div>

        <!-- Footer: delete + save badge + done -->
        <div class="modal-footer">
          <button
            type="button"
            class="linkcaps danger"
            aria-label="Delete this card"
            @click="onDeleteCard"
          >
            Delete card
          </button>

          <span
            class="save-badge"
            :class="{
              saving: saveBadgeState === 'saving',
              saved: saveBadgeState === 'saved',
              hidden: saveBadgeState === 'hidden',
            }"
            aria-live="polite"
            aria-atomic="true"
          >
            <template v-if="saveBadgeState === 'saving'">Saving…</template>
            <template v-else-if="saveBadgeState === 'saved'">Saved ✓</template>
          </span>

          <button
            type="button"
            class="btn-primary"
            style="width: auto; padding: 0.5rem 1.25rem;"
            aria-label="Close and done"
            @click="close"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
