<script setup>
/**
 * BoardCard — card cell in the column body
 * Emits: open, delete
 */
import LabelChip from './LabelChip.vue'
import DueDatePill from './DueDatePill.vue'

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['open', 'delete'])

function onDelete(e) {
  e.stopPropagation()
  emit('delete', props.card.id)
}

function onOpen(event) {
  emit('open', props.card, event)
}

// Strip markdown for plain text preview
function plainPreview(text) {
  if (!text) return ''
  return text
    // strip headings
    .replace(/^#{1,6}\s+/gm, '')
    // strip bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // strip inline code
    .replace(/`(.+?)`/g, '$1')
    // strip links — keep text
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // strip fenced code blocks
    .replace(/```[\s\S]*?```/g, '')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}
</script>

<template>
  <article
    class="kanban-card"
    tabindex="0"
    :aria-label="`Card: ${card.title}`"
    role="button"
    @click="onOpen($event)"
    @keydown.enter.space.prevent="onOpen($event)"
  >
    <h3 class="card-title">{{ card.title }}</h3>

    <p v-if="card.description" class="card-preview">
      {{ plainPreview(card.description) }}
    </p>

    <div class="card-meta">
      <DueDatePill :due-at="card.due_at" />
      <LabelChip
        v-for="color in card.labels"
        :key="color"
        :color="color"
        mode="dot"
      />
    </div>

    <button
      class="card-delete"
      type="button"
      aria-label="Delete card"
      @click="onDelete"
      @keydown.enter.space.prevent="onDelete"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </article>
</template>
