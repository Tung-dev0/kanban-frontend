<script setup>
/**
 * LabelChip — reusable label primitive
 * Props:
 *   color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple'
 *   mode: 'dot' | 'chip'  (default: 'dot')
 *   active: boolean  (chip mode only — whether this label is selected)
 */
const props = defineProps({
  color: {
    type: String,
    required: true,
  },
  mode: {
    type: String,
    default: 'dot',
    validator: (v) => ['dot', 'chip'].includes(v),
  },
  active: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle'])

const COLOR_NAMES = {
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
}

function cssColor(color) {
  return `var(--label-${color})`
}

function cssSoftColor(color) {
  return `var(--label-${color}-soft)`
}
</script>

<template>
  <!-- dot mode: simple 8px circle -->
  <span
    v-if="mode === 'dot'"
    class="label-dot"
    :style="{ background: cssColor(color) }"
    :title="COLOR_NAMES[color]"
    role="img"
    :aria-label="`${COLOR_NAMES[color]} label`"
  />

  <!-- chip mode: toggle button with dot + name -->
  <button
    v-else
    type="button"
    class="label-chip"
    :class="{ active }"
    :style="active ? { background: cssSoftColor(color), borderColor: cssColor(color), color: cssColor(color) } : {}"
    :aria-pressed="active"
    :aria-label="`${COLOR_NAMES[color]} label${active ? ', selected' : ''}`"
    @click="emit('toggle', color)"
  >
    <span
      class="chip-dot"
      :style="{ background: cssColor(color) }"
    />
    {{ COLOR_NAMES[color] }}
  </button>
</template>
