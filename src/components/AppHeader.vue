<script setup lang="ts">
import { MoonIcon, SunIcon } from '@heroicons/vue/24/outline';
defineProps<{ identity: string; token: string; dark: boolean }>();
const emit = defineEmits<{ login: []; logout: []; theme: [] }>();
</script>
<template>
  <header class="topbar px-5 py-5">
    <div class="max-w-6xl mx-auto flex flex-wrap justify-between gap-4 items-center">
      <div>
        <h1 class="text-2xl font-bold">
          WFM Availability Manager <span class="text-sm font-normal text-slate-300">v0.3.0</span>
        </h1>
        <p class="text-sm text-slate-300">
          Genesys Cloud · Agent Unavailable Times · Vue 3 + Tailwind CSS
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm">{{ identity }}</span><button
          @click="emit('theme')"
          class="btn btn-header"
          :aria-label="dark ? 'Licht thema inschakelen' : 'Donker thema inschakelen'"
          :title="dark ? 'Licht thema' : 'Donker thema'"
        >
          <SunIcon v-if="dark" class="h-5 w-5" aria-hidden="true" /><MoonIcon
            v-else
            class="h-5 w-5"
            aria-hidden="true"
          /></button
        ><button
          v-if="!token"
          @click="emit('login')"
          class="bg-[#5476d5] hover:bg-[#4568c4] focus-visible:ring-2 focus-visible:ring-[#5476d5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#263b73] rounded-lg px-4 py-2"
        >
          Aanmelden</button
        ><button
          v-else
          @click="emit('logout')"
          class="bg-white/15 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-[#5476d5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#263b73] rounded-lg px-4 py-2"
        >
          Afmelden
        </button>
      </div>
    </div>
  </header>
</template>
