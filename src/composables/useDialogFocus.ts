import { ref, watch, nextTick, type Ref } from 'vue';
export function useDialogFocus(open: Ref<unknown>) {
  const dialog = ref<HTMLElement | null>(null);
  let previous: HTMLElement | null = null;
  watch(open, async value => {
    if (value) {
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      await nextTick();
      dialog.value?.focus();
    } else previous?.focus();
  });
  function trapDialogFocus(event: KeyboardEvent) {
    const items = [...(dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)') ?? [])];
    const first = items[0], last = items.at(-1);
    if (!first || !last) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) { event.preventDefault(); first.focus(); }
  }
  return { dialog, trapDialogFocus };
}
