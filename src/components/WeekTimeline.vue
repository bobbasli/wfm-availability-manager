<script setup lang="ts">
import type { ScheduleDay, TimelineInterval } from '../types/availability';
defineProps<{ days: ScheduleDay[]; graphSupported: boolean; busy: boolean; token: string }>();
const emit = defineEmits<{ edit: [slot: TimelineInterval | null] }>();
</script>
<template>
  <div>
    <div class="flex flex-wrap justify-between items-center gap-3">
      <h3 class="font-semibold">
        Weekoverzicht <span class="text-xs text-muted font-normal">{{ days.length }} dagen</span>
      </h3>
      <button
        @click="emit('edit', null)"
        :disabled="!graphSupported || busy || !token"
        class="btn-primary"
      >
        + Tijdvak toevoegen
      </button>
    </div>
    <div class="overflow-x-auto">
      <div class="min-w-[680px]">
        <div class="flex items-end gap-3 mb-2">
          <div class="w-28 shrink-0"></div>
          <div class="flex-1 flex justify-between text-xs text-muted">
            <span v-for="h in [0, 4, 8, 12, 16, 20, 24]" :key="h"
              >{{ String(h).padStart(2, '0') }}:00</span
            >
          </div>
          <div class="w-28 shrink-0"></div>
        </div>
        <div
          v-for="day in days"
          :key="day.date"
          class="flex gap-3 items-center py-2 border-t border-slate-100 dark:border-slate-800"
        >
          <div class="w-28 shrink-0">
            <div class="text-sm font-medium">{{ day.label }}</div>
            <div class="text-xs text-muted">{{ day.date }}</div>
          </div>
          <div class="flex-1 space-y-1">
            <div
              class="relative h-7 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden"
              title="Unavailable Times: klik op rood om te bewerken"
            >
              <div
                v-for="(slot, i) in day.intervals"
                :key="i"
                class="absolute top-0 bottom-0 bg-rose-500 hover:bg-rose-700 cursor-pointer rounded-sm focus:ring-2 focus:ring-indigo-500"
                role="button"
                tabindex="0"
                @click="emit('edit', slot)"
                @keydown.enter.prevent="emit('edit', slot)"
                @keydown.space.prevent="emit('edit', slot)"
                :style="{
                  left: (slot.from / 1440) * 100 + '%',
                  width: ((slot.to - slot.from) / 1440) * 100 + '%',
                }"
                :title="slot.label"
              ></div>
            </div>
            <div
              class="relative h-5 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden"
              title="Gepubliceerd rooster: alleen lezen"
            >
              <div
                v-for="(shift, i) in day.shifts"
                :key="'s' + i"
                class="absolute inset-y-0 bg-emerald-500 rounded-sm"
                :style="{
                  left: (shift.from / 1440) * 100 + '%',
                  width: ((shift.to - shift.from) / 1440) * 100 + '%',
                }"
                :title="shift.label"
              ></div>
              <div
                v-for="(activity, i) in day.activities"
                :key="'a' + i"
                class="absolute inset-y-0 rounded-sm"
                :class="activity.color ? '' : 'bg-emerald-500'"
                :style="{
                  left: (activity.from / 1440) * 100 + '%',
                  width: ((activity.to - activity.from) / 1440) * 100 + '%',
                  ...(activity.color ? { backgroundColor: activity.color } : {}),
                }"
                :title="activity.label"
                :aria-label="activity.label"
              ></div>
            </div>
          </div>
          <div class="w-28 shrink-0 text-[11px] text-soft text-right">
            <div>
              {{ day.intervals.length ? day.intervals.map((x) => x.label).join(', ') : '—' }}
            </div>
            <div class="text-emerald-700 dark:text-emerald-300">
              {{
                day.shifts.length ? day.shifts.map((x) => x.label).join(', ') : 'Rooster onbekend'
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <p class="text-xs text-muted">
      Een lege balk betekent niet automatisch dat de medewerker beschikbaar of vrij is. De groene
      balken verschijnen alleen wanneer het gepubliceerde rooster is opgehaald en herkend.
    </p>
  </div>
</template>
