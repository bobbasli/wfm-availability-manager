<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline';
import AvailabilityHistory from './AvailabilityHistory.vue';
import { useDialogFocus } from '../composables/useDialogFocus';
import type { AvailabilityManager } from '../composables/useAvailabilityManager';
const props = defineProps<{ manager: AvailabilityManager }>();
const {
  draft,
  editor,
  scheduleHistory,
  closeEditor,
  submitChange,
  saving,
  busy,
  draftValid,
  editError,
} = props.manager;
const { dialog: editorDialog, trapDialogFocus } = useDialogFocus(draft);
</script>
<template>
  <div
    v-if="draft"
    class="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
    @click.self="closeEditor"
  >
    <div
      ref="editorDialog"
      tabindex="-1"
      @keydown.esc.prevent="closeEditor"
      @keydown.tab="trapDialogFocus"
      role="dialog"
      aria-modal="true"
      aria-label="Unavailable Time bewerken"
      class="panel-strong w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
    >
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-bold">{{ editor ? 'Tijdvak bewerken' : 'Tijdvak toevoegen' }}</h2>
        <button @click="closeEditor" class="text-muted text-2xl" aria-label="Sluiten">
          <XMarkIcon class="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <p class="text-sm text-soft">
        Tijden worden ingevoerd in Europe/Amsterdam en als UTC naar Genesys verzonden. Controleer de
        gegevens voor opslaan.
      </p>
      <AvailabilityHistory v-if="editor" :block="editor" :schedule="scheduleHistory" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-2">
          <h3 class="font-semibold text-sm">Van</h3>
          <label class="block text-sm"
            >Datum<input v-model="draft.fromDate" type="date" class="input mt-1" /></label
          ><label class="block text-sm"
            >Tijd<input v-model="draft.fromTime" type="time" step="60" class="input mt-1"
          /></label>
        </div>
        <div class="space-y-2">
          <h3 class="font-semibold text-sm">Tot</h3>
          <label class="block text-sm"
            >Datum<input v-model="draft.toDate" type="date" class="input mt-1" /></label
          ><label class="block text-sm"
            >Tijd<input v-model="draft.toTime" type="time" step="60" class="input mt-1"
          /></label>
        </div>
      </div>
      <p
        v-if="editError"
        role="alert"
        class="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 p-3 text-sm text-amber-900 dark:text-amber-200"
      >
        {{ editError }}
      </p>
      <label class="block text-sm font-medium"
        >Notities<textarea v-model="draft.notes" rows="2" class="input mt-1"></textarea>
      </label>
      <div class="flex justify-between gap-3">
        <button
          v-if="editor"
          @click="submitChange(true)"
          :disabled="saving || busy"
          class="btn-error"
        >
          Verwijderen</button
        ><span v-else></span>
        <div class="flex gap-2">
          <button @click="closeEditor" :disabled="saving" class="btn-secondary">Annuleren</button
          ><button
            @click="submitChange(false)"
            :disabled="!draftValid || saving || busy"
            class="btn-primary"
          >
            {{ saving ? 'Opslaan...' : 'Opslaan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
