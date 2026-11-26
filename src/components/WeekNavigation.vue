<script setup lang="ts">
defineProps<{ error: string }>();
const emit = defineEmits<{ move: [direction: number] }>();
const week = defineModel<string>({ required: true });
</script>
<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-end gap-2">
      <button class="btn-secondary" @click="emit('move', -1)" aria-label="Vorige week">
        ← Vorige week
      </button>
      <label class="block text-sm font-medium"
        >Week vanaf (maandag)<input v-model="week" type="date" class="input mt-1"
      /></label>
      <button class="btn-secondary" @click="emit('move', 1)" aria-label="Volgende week">
        Volgende week →
      </button>
    </div>
    <p v-if="error" class="text-amber-800 dark:text-amber-300 text-sm" role="alert">{{ error }}</p>
  </div>
</template>
