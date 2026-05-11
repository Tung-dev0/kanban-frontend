<script setup>
/**
 * BoardColumn — column card with header, body (SortableJS DnD), footer
 * Emits: open-card(card)
 *
 * DnD config (F8):
 *   group: 'cards', sort: false, animation: 150
 *   ghostClass: 'card-ghost', chosenClass: 'card-chosen'
 *   onEnd -> boardStore.moveCard(cardId, toColumnId)
 *   Drop-zone highlight via .is-drop-target on .column
 */
import { ref, computed, nextTick } from 'vue'
import { useSortable } from '@vueuse/integrations/useSortable'
import BoardCard from './BoardCard.vue'
import ColumnMenu from './ColumnMenu.vue'
import { useBoardStore } from '../stores/board'

const props = defineProps({
  column: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['open-card'])

const boardStore = useBoardStore()

// ---- Rename ----
const nameRef = ref(null)
const renaming = ref(false)

function startRename() {
  renaming.value = true
  nextTick(() => {
    if (nameRef.value) {
      nameRef.value.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(nameRef.value)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  })
}

function commitRename() {
  if (!renaming.value) return
  renaming.value = false
  const newName = nameRef.value?.innerText?.trim() || ''
  if (newName && newName !== props.column.name) {
    boardStore.updateColumn(props.column.id, { name: newName })
  } else if (nameRef.value) {
    nameRef.value.innerText = props.column.name
  }
}

function onNameKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); commitRename() }
  if (e.key === 'Escape') {
    e.preventDefault()
    renaming.value = false
    if (nameRef.value) nameRef.value.innerText = props.column.name
    nameRef.value?.blur()
  }
}

// ---- Add card ----
const addTitle = ref('')

async function submitAdd() {
  const title = addTitle.value.trim()
  if (!title) return
  addTitle.value = ''
  await boardStore.createCard(props.column.id, title)
}

function onAddKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); submitAdd() }
}

// ---- Delete card ----
async function onDeleteCard(cardId) {
  await boardStore.deleteCard(cardId)
}

// ---- Open card ----
function onOpenCard(card, event) {
  emit('open-card', card, event)
}

// ---- Drop target highlight ----
const isDropTarget = ref(false)
const columnEl = ref(null)

function onDragEnter(e) {
  e.preventDefault()
  isDropTarget.value = true
}
function onDragLeave(e) {
  if (!columnEl.value?.contains(e.relatedTarget)) {
    isDropTarget.value = false
  }
}
function onDragOver(e) {
  e.preventDefault()
}
function onDrop() {
  isDropTarget.value = false
}

// ---- SortableJS via useSortable (F8) ----
const columnBodyRef = ref(null)

// cards is a computed list from the store
const cards = computed(() => props.column.cards)

// useSortable will manage the DOM list; we pass a ref to the container element
// NOTE: useSortable options with onEnd handler
useSortable(columnBodyRef, cards, {
  group: 'cards',
  sort: false,
  animation: 150,
  ghostClass: 'card-ghost',
  chosenClass: 'card-chosen',
  draggable: '.kanban-card',
  onEnd(evt) {
    const fromColEl = evt.from
    const toColEl = evt.to

    const fromColId = Number(fromColEl.dataset.columnId) || fromColEl.dataset.columnId
    const toColId = Number(toColEl.dataset.columnId) || toColEl.dataset.columnId

    if (fromColId === toColId) {
      // Within-column drag: revert the DOM change (sort: false should prevent it,
      // but in cross-group scenarios we guard here)
      return
    }

    // Get card id from the dragged element
    const cardId = Number(evt.item.dataset.cardId) || evt.item.dataset.cardId
    if (!cardId) return

    // Remove drop-target highlight
    isDropTarget.value = false

    // Optimistic move via store
    boardStore.moveCard(cardId, toColId)
  },
})
</script>

<template>
  <div
    ref="columnEl"
    class="column"
    :class="{ 'is-drop-target': isDropTarget }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Header -->
    <div class="column-header">
      <span
        ref="nameRef"
        class="column-name"
        :contenteditable="renaming ? 'true' : 'false'"
        role="textbox"
        :aria-label="`Column name: ${column.name}`"
        :aria-readonly="!renaming"
        spellcheck="false"
        @keydown="onNameKeydown"
        @blur="commitRename"
        @dblclick="startRename"
      >{{ column.name }}</span>

      <span class="column-count mono">{{ column.cards.length }}</span>

      <ColumnMenu
        :column-id="column.id"
        :column-name="column.name"
        @rename="startRename"
      />
    </div>

    <!-- Body: card list + SortableJS target -->
    <div
      ref="columnBodyRef"
      class="column-body"
      :data-column-id="column.id"
    >
      <p v-if="column.cards.length === 0" class="column-empty">
        Drop a card here or click + to add
      </p>
      <BoardCard
        v-for="card in column.cards"
        :key="card.id"
        :card="card"
        :data-card-id="card.id"
        @open="(c, evt) => onOpenCard(c, evt)"
        @delete="onDeleteCard"
      />
    </div>

    <!-- Footer: add card -->
    <div class="column-footer">
      <div class="add-card">
        <span class="prompt" aria-hidden="true">+</span>
        <input
          v-model="addTitle"
          type="text"
          placeholder="New card…"
          maxlength="200"
          :aria-label="`Add card to ${column.name}`"
          @keydown="onAddKeydown"
        />
        <button
          class="submit"
          type="button"
          :disabled="!addTitle.trim()"
          @click="submitAdd"
        >
          Add
        </button>
      </div>
    </div>
  </div>
</template>
