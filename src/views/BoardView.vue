<script setup>
/**
 * BoardView — main Kanban board page
 *
 * Layout: header (title + summary) + horizontal scroll rail (columns + add button)
 * DnD is handled per-column inside BoardColumn.vue via useSortable.
 */
import { ref, computed, onMounted, nextTick } from 'vue'
import { useBoardStore } from '../stores/board'
import BoardColumn from '../components/BoardColumn.vue'
import AddColumnButton from '../components/AddColumnButton.vue'
import CardDetailModal from '../components/CardDetailModal.vue'

const boardStore = useBoardStore()

// ---- Fetch board on mount ----
onMounted(() => {
  boardStore.fetchBoard()
})

// ---- Board summary ----
const summaryText = computed(() => {
  const total = boardStore.totalCards
  const overdue = boardStore.overdueCount
  const cols = boardStore.columns.length
  let text = `${total} card${total !== 1 ? 's' : ''} across ${cols} column${cols !== 1 ? 's' : ''}`
  if (overdue > 0) text += ` · ${overdue} overdue`
  return text
})

// ---- Card modal ----
const activeCard = ref(null)
// The DOM element that triggered the modal open — for focus restoration
let modalOpenerEl = null

function onOpenCard(card, event) {
  // Try to get the article element (kanban-card) that was clicked
  modalOpenerEl = event?.target?.closest?.('.kanban-card') || null
  activeCard.value = card
}

function closeModal() {
  activeCard.value = null
  nextTick(() => {
    modalOpenerEl?.focus()
    modalOpenerEl = null
  })
}

// ---- Add column ----
async function onAddColumn(name) {
  await boardStore.createColumn(name)
}
</script>

<template>
  <div class="board-page">
    <!-- Error toast -->
    <div
      v-if="boardStore.error"
      class="error"
      style="margin: 0.5rem 1.5rem; max-width: none;"
      role="alert"
      aria-live="assertive"
    >
      {{ boardStore.error }}
    </div>

    <!-- Board header -->
    <div class="board-header">
      <div class="board-header-left">
        <h2>Your board</h2>
        <p class="board-summary">{{ summaryText }}</p>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="boardStore.loading" class="loading" style="margin: 2rem auto;">
      Loading board…
    </div>

    <!-- Board scroll rail -->
    <div v-else class="board-scroll" role="main">
      <BoardColumn
        v-for="col in boardStore.columns"
        :key="col.id"
        :column="col"
        @open-card="onOpenCard"
      />

      <AddColumnButton @add="onAddColumn" />
    </div>

    <!-- Card detail modal -->
    <CardDetailModal
      v-if="activeCard"
      :card="activeCard"
      :columns="boardStore.columns"
      @close="closeModal"
    />
  </div>
</template>
