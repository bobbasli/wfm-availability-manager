import { ref, watch } from 'vue';
import { localParts } from '../domain/time';
import { addCalendarDays, mondayOfWeek } from '../helpers/week';

export function useWeekSelection() {
  const week = ref(mondayOfWeek(localParts(Date.now()).date));
  const start = ref(week.value),
    end = ref(addCalendarDays(week.value, 6));
  const weekError = ref('');
  watch(
    week,
    (value) => {
      try {
        const monday = mondayOfWeek(value);
        weekError.value = '';
        if (monday !== value) {
          week.value = monday;
          return;
        }
        start.value = monday;
        end.value = addCalendarDays(monday, 6);
      } catch {
        weekError.value = 'Kies een geldige weekdatum.';
      }
    },
    { flush: 'sync' },
  );
  function moveWeek(direction: number) {
    try {
      week.value = addCalendarDays(mondayOfWeek(week.value), direction * 7);
    } catch {
      weekError.value = 'Kies eerst een geldige weekdatum.';
    }
  }
  return { week, start, end, weekError, moveWeek };
}
