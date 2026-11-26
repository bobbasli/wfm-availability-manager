<script setup lang="ts">
import type { AvailabilityComparisonDay, ScheduleCandidate } from '../types/availability';
defineProps<{
  days: AvailabilityComparisonDay[];
  candidates: ScheduleCandidate[];
  busy: boolean;
  error: string;
  reason: string | null;
}>();
const schedule = defineModel<string>({ required: true });
</script>
<template>
  <section class="card p-4 space-y-3" aria-labelledby="unavailable-comparison-title">
    <h3 id="unavailable-comparison-title" class="font-semibold">
      Unavailable Times — Original en Latest Saved
    </h3>
    <p class="text-sm text-soft">
      <strong>Original</strong> zijn de onbeschikbare perioden die bij de generatie van het gekozen
      rooster zijn gebruikt. <strong>Latest Saved</strong> zijn de actueel opgeslagen perioden. Dit
      zijn geen aanmaak- of wijzigingsdatums.
    </p>
    <label class="block text-sm font-medium"
      >Rooster voor vergelijking (ook ongepubliceerd)
      <select v-model="schedule" class="input mt-1" :disabled="!candidates.length">
        <option value="">Selecteer vergelijkingsrooster</option>
        <option v-for="candidate in candidates" :key="candidate.id" :value="candidate.id">
          {{ candidate.name }} · {{ candidate.weekId || 'startweek onbekend' }}
        </option>
      </select>
    </label>
    <p class="text-xs text-soft">
      Deze keuze bepaalt alleen de vergelijking. De kalender toont uitsluitend gepubliceerde
      roosterdiensten.
    </p>
    <p v-if="busy" role="status" class="text-sm">Original ophalen…</p>
    <p v-else-if="error" role="alert" class="text-sm text-amber-800 dark:text-amber-300">
      {{ error }}
    </p>
    <p v-else-if="!schedule" class="text-sm text-soft">
      Selecteer een rooster om Original te vergelijken. Latest Saved blijft zichtbaar.
    </p>
    <p v-else-if="reason" class="text-sm text-soft">{{ reason }}</p>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[580px] text-sm">
        <caption class="text-left text-xs text-soft pb-2">
          Onbeschikbare perioden per dag, Europe/Amsterdam. Beschikbaar betekent dat de betreffende
          lijst voor die dag geen onbeschikbare perioden bevat.
        </caption>
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-700">
            <th scope="col" class="p-2 text-left">Dag</th>
            <th scope="col" class="p-2 text-left">Original</th>
            <th scope="col" class="p-2 text-left">Latest Saved</th>
            <th scope="col" class="p-2 text-left">Afwijking</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="day in days"
            :key="day.date"
            class="border-b border-slate-200 dark:border-slate-800"
          >
            <th scope="row" class="p-2 text-left font-medium">
              {{ day.date.split('-').reverse().join('-') }}
            </th>
            <td class="p-2">{{ day.original }}</td>
            <td class="p-2">{{ day.latest }}</td>
            <td
              class="p-2"
              :class="
                day.difference === 'Gewijzigd'
                  ? 'font-semibold text-amber-800 dark:text-amber-300'
                  : ''
              "
            >
              {{ day.difference }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-soft">
      Afwijkingen vergelijken de samengevoegde tijdvakken binnen deze week. Zij bewijzen niet
      wanneer of door wie iets is gewijzigd, of dat hierdoor een roosterconflict is ontstaan. ‘Niet
      gebruikt’ betekent nooit automatisch ‘Beschikbaar’.
    </p>
  </section>
</template>
