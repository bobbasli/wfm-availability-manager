<script setup lang="ts">
import { computed } from 'vue';
import {
  compareHistory,
  readAvailabilityHistory,
  formatHistoryTimestamp,
  unavailableHistoryReason,
  type ScheduleHistory,
} from '../domain/history';
const props = defineProps<{ block: unknown; schedule: ScheduleHistory }>();
const history = computed(() => readAvailabilityHistory(props.block));
const messages = computed(() => compareHistory(history.value, props.schedule));
</script>
<template>
  <section
    class="surface-muted border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm space-y-2"
    aria-labelledby="availability-history-title"
  >
    <h3 id="availability-history-title" class="font-semibold">
      Historie van dit Niet beschikbaar-blok
    </h3>
    <dl class="grid sm:grid-cols-2 gap-2">
      <div>
        <dt class="text-muted">Aangemaakt op</dt>
        <dd>{{ formatHistoryTimestamp(history.createdAt) }}</dd>
      </div>
      <div>
        <dt class="text-muted">Laatst gewijzigd op</dt>
        <dd>{{ formatHistoryTimestamp(history.modifiedAt) }}</dd>
      </div>
      <div>
        <dt class="text-muted">Gewijzigd door</dt>
        <dd>{{ history.modifiedBy ?? 'Niet beschikbaar' }}</dd>
      </div>
    </dl>
    <p class="text-xs text-soft">{{ unavailableHistoryReason }}</p>
    <ul v-if="messages.length" class="list-disc pl-5">
      <li v-for="message in messages" :key="message">{{ message }}</li>
    </ul>
    <p v-else class="text-xs text-soft">
      Vergelijking met roosterpublicatie of roosterwijziging is niet beschikbaar: de benodigde
      betrouwbare tijdstempels ontbreken.
    </p>
    <p class="text-xs text-soft">
      Een wijziging na publicatie bewijst niet wie de wijziging heeft uitgevoerd of dat hierdoor een
      roosterconflict is ontstaan.
    </p>
  </section>
</template>
