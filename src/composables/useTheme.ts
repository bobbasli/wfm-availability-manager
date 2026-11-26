import { ref, watch } from 'vue';

export function useTheme() {
  const preference = localStorage.getItem('wfm_theme');
  const dark = ref(
    preference === 'dark' ||
      (preference !== 'light' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches === true),
  );
  watch(
    dark,
    (value) => {
      document.documentElement.classList.toggle('dark', value);
      localStorage.setItem('wfm_theme', value ? 'dark' : 'light');
    },
    { immediate: true, flush: 'sync' },
  );
  function toggleTheme() {
    dark.value = !dark.value;
  }
  return { dark, toggleTheme };
}
