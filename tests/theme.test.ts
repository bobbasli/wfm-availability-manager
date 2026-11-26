// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useTheme } from '../src/composables/useTheme';

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  vi.unstubAllGlobals();
});
it('bewaart de expliciete themakeuze en past de rootklasse direct aan', () => {
  const scope = effectScope();
  scope.run(() => {
    const theme = useTheme();
    expect(theme.dark.value).toBe(false);
    theme.toggleTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('wfm_theme')).toBe('dark');
    theme.toggleTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
  scope.stop();
});
it('gebruikt het systeemthema totdat de gebruiker zelf licht kiest', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const first = effectScope();
  first.run(() => expect(useTheme().dark.value).toBe(true));
  first.stop();
  localStorage.setItem('wfm_theme', 'light');
  const second = effectScope();
  second.run(() => expect(useTheme().dark.value).toBe(false));
  second.stop();
});
