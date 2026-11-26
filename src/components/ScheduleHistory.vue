<script setup lang="ts">
import {
  formatHistoryTimestamp,
  publicationHistoryReason,
  type ScheduleHistory,
} from '../domain/history';
defineProps<{ history: ScheduleHistory }>();
</script>
<template>
  <section
    class="surface-muted border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2 text-sm"
    aria-labelledby="schedule-history-title"
  >
    <h3 id="schedule-history-title" class="font-semibold">Roosterhistorie</h3>
    <dl class="grid sm:grid-cols-2 gap-2">
      <div>
        <dt class="text-muted">Aangemaakt op — rooster</dt>
        <dd>{{ formatHistoryTimestamp(history.createdAt) }}</dd>
      </div>
      <div>
        <dt class="text-muted">Eerste publicatie</dt>
        <dd>{{ formatHistoryTimestamp(history.firstPublishedAt) }}</dd>
      </div>
      <div>
        <dt class="text-muted">Laatst gewijzigd — gehele rooster</dt>
        <dd>{{ formatHistoryTimestamp(history.modifiedAt) }}</dd>
      </div>
      <div>
        <dt class="text-muted">Laatst gewijzigd — geselecteerde medewerker</dt>
        <dd>{{ formatHistoryTimestamp(history.agentModifiedAt) }}</dd>
      </div>
    </dl>
    <p class="text-xs text-soft">Alle tijden in Europe/Amsterdam. {{ publicationHistoryReason }}</p>
    <p class="text-xs text-soft">
      Een roosterbrede wijziging kan een andere medewerker betreffen; zij wordt niet als wijziging
      van het geselecteerde medewerkersrooster gebruikt.
    </p>
  </section>
</template>
