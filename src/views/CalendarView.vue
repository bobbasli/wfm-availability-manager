<script setup lang="ts">
import ScheduleHistory from '../components/ScheduleHistory.vue';
import WeekTimeline from '../components/WeekTimeline.vue';
import type { AvailabilityManager } from '../composables/useAvailabilityManager';
const props = defineProps<{ manager: AvailabilityManager }>();
const {
  activityCodeError,
  scheduleData,
  scheduleError,
  scheduleBusy,
  scheduleHistory,
  scheduleRows,
  loadSchedule,
  discoverSchedules,
  scheduleCandidates,
  selectedSchedule,
  scheduleDiagnostics,
  scheduleState,
  agentId,
  start,
  end,
  lastResponse,
  graphSupported,
  openEditor,
  busy,
  token,
  loadUnavailable,
} = props.manager;
</script>
<template>
  <section class="panel p-5 space-y-4">
    <div class="flex flex-wrap justify-between items-center gap-3">
      <div>
        <h2 class="text-lg font-semibold">Beschikbaarheid &amp; rooster</h2>
        <p class="text-sm text-muted">
          Eén tijdlijn per dag · rood bewerkbaar · roosteractiviteiten in Genesys-kleuren · alleen
          lezen
        </p>
      </div>
      <div class="flex gap-2">
        <button @click="loadUnavailable" :disabled="!agentId || busy" class="btn-primary">
          Beschikbaarheid verversen</button
        ><button
          @click="discoverSchedules"
          :disabled="!agentId || scheduleBusy"
          class="btn-secondary"
        >
          Rooster zoeken
        </button>
      </div>
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      <label class="text-sm font-medium"
        >Vanaf<input type="date" v-model="start" class="input mt-1" /></label
      ><label class="text-sm font-medium"
        >Tot en met<input type="date" v-model="end" class="input mt-1"
      /></label>
    </div>
    <div class="flex flex-wrap gap-4 text-xs">
      <span class="flex items-center gap-2"
        ><i class="inline-block h-3 w-3 rounded bg-rose-500"></i>Unavailable Times · bewerken</span
      ><span class="flex items-center gap-2"
        ><i class="inline-block h-3 w-3 rounded bg-emerald-500"></i>Gepubliceerd rooster · alleen
        lezen</span
      ><span class="flex items-center gap-2"
        ><i class="inline-block h-3 w-3 rounded bg-sky-500"></i>Work Plan · nog niet gekoppeld</span
      >
    </div>
    <div class="surface-muted rounded-lg p-3 space-y-2">
      <div class="flex flex-wrap items-center gap-3">
        <label class="text-sm font-medium"
          >Gepubliceerd rooster
          <select
            v-model="selectedSchedule"
            @change="loadSchedule"
            :disabled="scheduleBusy || !scheduleCandidates.length"
            class="input mt-1"
          >
            <option value="">Selecteer rooster</option>
            <option v-for="x in scheduleCandidates" :key="x.id" :value="x.id">
              {{ x.name }} · {{ x.weekId || 'week onbekend' }}
            </option>
          </select></label
        ><span class="text-xs text-soft">{{ scheduleBusy ? 'Ophalen…' : scheduleState }}</span>
      </div>
      <p v-if="activityCodeError" class="text-xs text-amber-800 dark:text-amber-300">
        {{ activityCodeError }} · Roosterdiensten blijven zichtbaar.
      </p>
      <p v-if="scheduleError" class="text-sm text-amber-800 dark:text-amber-300" role="alert">
        {{ scheduleError }}
      </p>
    </div>
    <ScheduleHistory v-if="selectedSchedule" :history="scheduleHistory" />
    <p v-if="!lastResponse" class="surface-muted rounded-lg p-4 text-muted text-sm">
      Selecteer een medewerker; de tijdvakken worden automatisch opgehaald.
    </p>
    <div
      v-else-if="!graphSupported"
      class="border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 rounded-lg p-4 text-sm"
    >
      De Unavailable Times konden niet betrouwbaar worden geïnterpreteerd. Zie API-diagnose
      onderaan.
    </div>
    <WeekTimeline
      :days="scheduleRows"
      :graph-supported="graphSupported"
      :busy="busy"
      :token="token"
      @edit="openEditor"
    />
    <details class="text-sm">
      <summary class="cursor-pointer font-semibold">Rooster API-diagnose</summary>
      <pre class="mt-2 surface-muted p-3 rounded text-xs whitespace-pre-wrap break-all">{{
        JSON.stringify(
          {
            candidates: scheduleCandidates,
            diagnostics: scheduleDiagnostics,
            response: scheduleData,
          },
          null,
          2,
        )
      }}</pre>
    </details>
  </section>
</template>
