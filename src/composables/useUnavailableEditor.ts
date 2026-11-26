import { computed, ref } from 'vue';
import { amsterdamToUtc } from '../domain/time';
import { readUnavailableBlock, splitLocal } from '../helpers/calendar';
import { errorMessage } from '../helpers/response';
import type { AvailabilityService } from '../services/availability';
import type { AvailabilityDraft, EditorContext, UnavailableBlock } from '../types/availability';

export function useUnavailableEditor(context: EditorContext, service: AvailabilityService) {
  const editor = ref<UnavailableBlock | null>(null);
  const draft = ref<AvailabilityDraft | null>(null);
  const saving = ref(false);
  const editError = computed(() => {
    if (!draft.value) return '';
    try {
      draftToSpan();
      return '';
    } catch (error) {
      return errorMessage(error);
    }
  });
  const draftValid = computed(() => {
    try {
      draftToSpan();
      return true;
    } catch {
      return false;
    }
  });
  let editorAgent: string | null = null;
  let editorCurrent: (() => boolean) | null = null;

  function draftToSpan() {
    if (!draft.value) throw Error('Geen tijdvak geselecteerd.');
    const from = amsterdamToUtc(`${draft.value.fromDate}T${draft.value.fromTime}`);
    const to = amsterdamToUtc(`${draft.value.toDate}T${draft.value.toTime}`);
    if (to <= from) throw Error('De eindtijd moet na de begintijd liggen.');
    const lengthMinutes = (to - from) / 60000;
    if (!Number.isInteger(lengthMinutes) || lengthMinutes > 525600)
      throw Error('Ongeldige duur van het tijdvak.');
    return { startDate: new Date(from).toISOString(), lengthMinutes };
  }
  function openEditor(slot: { original?: unknown } | null) {
    if (!context.agentId.value || !context.token.value || saving.value) return;
    const original = slot?.original ? readUnavailableBlock(slot.original) : null;
    if (slot?.original && !original) {
      context.report('Dit tijdvak heeft ongeldige tijdgegevens.', true);
      return;
    }
    try {
      const fromMs = original
        ? Date.parse(original.timeSpan.startDate)
        : amsterdamToUtc(`${context.start.value}T09:00`);
      const toMs = fromMs + (original ? original.timeSpan.lengthMinutes * 60000 : 8 * 3600000);
      const from = splitLocal(fromMs),
        to = splitLocal(toMs);
      editorAgent = context.agentId.value;
      editorCurrent = context.snapshot();
      editor.value = original;
      draft.value = {
        fromDate: from.date,
        fromTime: from.time,
        toDate: to.date,
        toTime: to.time,
        notes: original?.notes || '',
      };
    } catch (error) {
      context.report(errorMessage(error), true);
    }
  }
  function closeEditor() {
    editor.value = null;
    draft.value = null;
    editorAgent = null;
    editorCurrent = null;
  }
  async function submitChange(remove = false) {
    if (
      !draft.value ||
      saving.value ||
      context.busy.value ||
      !context.agentId.value ||
      !context.token.value
    )
      return;
    if (editorAgent !== context.agentId.value || !editorCurrent?.()) {
      closeEditor();
      context.report('Selectie gewijzigd; open het tijdvak opnieuw.', true);
      return;
    }
    const id = editor.value?.id;
    if (editor.value && !id) {
      context.report(
        'Dit tijdvak heeft geen geldige Genesys-ID en kan niet worden gewijzigd of verwijderd.',
        true,
      );
      return;
    }
    let entity: unknown;
    try {
      entity = remove
        ? { id, delete: true }
        : {
            ...(id ? { id } : {}),
            timeSpan: draftToSpan(),
            notes: draft.value.notes || '',
            delete: false,
          };
    } catch (error) {
      context.report(errorMessage(error), true);
      return;
    }
    const name =
      context.agents.value.find((agent) => agent.id === context.agentId.value)?.name ||
      context.agentId.value;
    const verb = remove ? 'verwijderen' : id ? 'wijzigen' : 'toevoegen';
    if (!window.confirm(`Wil je dit tijdvak voor ${name} echt ${verb}?`)) return;
    saving.value = true;
    const agent = editorAgent,
      current = editorCurrent;
    try {
      await service.updateUnavailable(agent, { entities: [entity] });
      context.onSaved?.(agent);
      if (!current()) return;
      closeEditor();
      const refreshed = await context.refresh();
      if (current() && refreshed)
        context.report(
          `Tijdvak ${remove ? 'verwijderd' : id ? 'gewijzigd' : 'toegevoegd'} en opnieuw opgehaald.`,
        );
    } catch (error) {
      if (current()) context.report(`Opslaan mislukt: ${errorMessage(error)}`, true);
    } finally {
      saving.value = false;
    }
  }
  return { editor, draft, saving, editError, draftValid, openEditor, closeEditor, submitChange };
}
