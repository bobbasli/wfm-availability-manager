<script setup lang="ts">
import { supportedRegions } from '../services/regions';
defineProps<{ signedIn: boolean }>();
const clientId = defineModel<string>('clientId', { required: true });
const region = defineModel<string>('region', { required: true });
</script>
<template>
  <details class="panel p-4">
    <summary class="cursor-pointer font-semibold">Genesys-verbinding instellen</summary>
    <p class="text-sm text-soft my-3">
      Gebruik de OAuth Client ID en regio van je organisatie. Een wijziging meldt je af. Er is geen
      client secret nodig.
    </p>
    <div class="grid gap-4 md:grid-cols-2">
      <label class="text-sm font-medium"
        >OAuth Client ID<input
          v-model.lazy.trim="clientId"
          class="input mt-1"
          autocomplete="off"
          spellcheck="false"
      /></label>
      <label class="text-sm font-medium"
        >Genesys-regio<select v-model="region" class="input mt-1">
          <option v-for="option in supportedRegions" :key="option" :value="option">
            {{ option }}
          </option>
        </select></label
      >
    </div>
    <p v-if="signedIn" class="text-sm text-soft mt-3">
      Je bent aangemeld; wijzig de instellingen alleen als je opnieuw wilt aanmelden.
    </p>
  </details>
</template>
