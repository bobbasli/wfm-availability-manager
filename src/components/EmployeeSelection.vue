<script setup lang="ts">
import type { GenesysEntity } from '../types/genesys';
defineProps<{
  businessUnits: GenesysEntity[];
  managementUnits: GenesysEntity[];
  agents: GenesysEntity[];
  token: string;
}>();
const emit = defineEmits<{ businessUnitChange: []; managementUnitChange: []; agentChange: [] }>();
const businessUnit = defineModel<string>('businessUnit', { required: true });
const managementUnit = defineModel<string>('managementUnit', { required: true });
const agentId = defineModel<string>('agentId', { required: true });
</script>
<template>
  <section class="panel p-5">
    <h2 class="text-lg font-semibold mb-4">Medewerker selecteren</h2>
    <div class="grid md:grid-cols-3 gap-4">
      <label class="block text-sm font-medium"
        >Business Unit<select
          v-model="businessUnit"
          @change="emit('businessUnitChange')"
          :disabled="!token"
          class="input mt-1"
        >
          <option value="">Selecteer Business Unit</option>
          <option v-for="x in businessUnits" :key="x.id" :value="x.id">{{ x.name || x.id }}</option>
        </select></label
      >
      <label class="block text-sm font-medium"
        >Management Unit<select
          v-model="managementUnit"
          @change="emit('managementUnitChange')"
          :disabled="!businessUnit"
          class="input mt-1"
        >
          <option value="">Selecteer Management Unit</option>
          <option v-for="x in managementUnits" :key="x.id" :value="x.id">
            {{ x.name || x.id }}
          </option>
        </select></label
      >
      <label class="block text-sm font-medium"
        >Medewerker<select
          v-model="agentId"
          @change="emit('agentChange')"
          :disabled="!managementUnit"
          class="input mt-1"
        >
          <option value="">Selecteer medewerker</option>
          <option v-for="x in agents" :key="x.id" :value="x.id">{{ x.name || x.id }}</option>
        </select></label
      >
    </div>
    <p class="text-xs text-muted mt-3">
      Alleen gegevens die je met je Genesys-rechten mag bekijken.
    </p>
  </section>
</template>
