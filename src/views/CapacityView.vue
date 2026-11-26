<script setup lang="ts">
import CapacityTable from '../components/CapacityTable.vue';
import type { AvailabilityManager } from '../composables/useAvailabilityManager';
const props = defineProps<{ manager: AvailabilityManager }>();
const {
  capacityMargin,
  capacityWeek,
  capacityBusy,
  capacityProgress,
  capacityRows,
  capacityError,
  capacityDiagnostics,
  loadCapacity,
  managementUnit,
  agents,
} = props.manager;
</script>
<template>
  <section class="panel p-5 space-y-4">
    <div class="flex flex-wrap justify-between items-center gap-3">
      <div>
        <h2 class="text-lg font-semibold">Capaciteit &amp; beschikbaarheid</h2>
        <p class="text-sm text-muted">
          Alle medewerkers in de geselecteerde Management Unit · weekcijfers · alleen lezen
        </p>
      </div>
      <button
        @click="loadCapacity"
        :disabled="capacityBusy || !managementUnit || !agents.length"
        class="btn-primary"
      >
        {{ capacityBusy ? 'Bezig…' : 'Overzicht ophalen / verversen' }}
      </button>
    </div>
    <label class="block text-sm font-medium max-w-xs"
      >Planningsmarge (%)<input
        type="number"
        min="0"
        max="100"
        step="any"
        v-model.number="capacityMargin"
        class="input mt-1"
    /></label>
    <label class="block text-sm font-medium max-w-xs"
      >Week vanaf (maandag)<input type="date" v-model="capacityWeek" class="input mt-1"
    /></label>
    <p class="text-sm text-soft">
      {{ capacityProgress || 'Selecteer een Management Unit en haal het overzicht op.' }}
    </p>
    <p
      v-for="warning in capacityDiagnostics"
      :key="warning"
      class="text-sm text-amber-800 dark:text-amber-300"
      role="status"
    >
      {{ warning }}
    </p>
    <p
      v-if="capacityError"
      class="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-sm"
      role="alert"
    >
      {{ capacityError }}
    </p>
    <CapacityTable :rows="capacityRows" :margin="capacityMargin" />
  </section>
</template>
