<script setup lang="ts">
import AppHeader from './components/AppHeader.vue';
import EmployeeSelection from './components/EmployeeSelection.vue';
import UnavailableEditor from './components/UnavailableEditor.vue';
import ConnectionSettings from './components/ConnectionSettings.vue';
import CalendarView from './views/CalendarView.vue';
import CapacityView from './views/CapacityView.vue';
import { useAvailabilityManager } from './composables/useAvailabilityManager';
import { useTheme } from './composables/useTheme';
const manager = useAvailabilityManager();
const {
  activeTab,
  identity,
  token,
  businessUnits,
  managementUnits,
  agents,
  businessUnit,
  managementUnit,
  agentId,
  loadManagementUnits,
  loadAgents,
  resetAgentData,
  login,
  logout,
  raw,
  status,
  error,
  clientId,
  region,
} = manager;
const { dark, toggleTheme } = useTheme();
</script>
<template>
  <div v-cloak class="app-bg min-h-screen">
    <AppHeader
      :identity="identity"
      :token="token"
      :dark="dark"
      @login="login"
      @logout="logout"
      @theme="toggleTheme"
    />
    <main class="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <ConnectionSettings
        v-model:client-id="clientId"
        v-model:region="region"
        :signed-in="!!token"
      />
      <EmployeeSelection
        v-model:business-unit="businessUnit"
        v-model:management-unit="managementUnit"
        v-model:agent-id="agentId"
        :business-units="businessUnits"
        :management-units="managementUnits"
        :agents="agents"
        :token="token"
        @business-unit-change="loadManagementUnits"
        @management-unit-change="loadAgents"
        @agent-change="resetAgentData"
      />
      <nav class="flex flex-wrap gap-2" aria-label="Tabbladen">
        <button
          :aria-pressed="activeTab === 'calendar'"
          @click="activeTab = 'calendar'"
          :class="activeTab === 'calendar' ? 'tab-active' : 'tab-idle'"
          class="rounded-lg px-4 py-2 font-semibold shadow-sm"
        >
          Beschikbaarheid &amp; rooster</button
        ><button
          :aria-pressed="activeTab === 'capacity'"
          @click="activeTab = 'capacity'"
          :class="activeTab === 'capacity' ? 'tab-active' : 'tab-idle'"
          class="rounded-lg px-4 py-2 font-semibold shadow-sm"
        >
          Capaciteit &amp; beschikbaarheid
        </button>
      </nav>
      <CalendarView v-show="activeTab === 'calendar'" :manager="manager" />
      <CapacityView v-show="activeTab === 'capacity'" :manager="manager" />
      <UnavailableEditor :manager="manager" />
      <section class="panel p-5">
        <h2 class="text-lg font-semibold mb-3">API-diagnose</h2>
        <div
          role="status"
          :class="error ? 'text-rose-700 dark:text-rose-300' : 'text-soft'"
          class="text-sm"
        >
          {{ status }}
        </div>
        <details class="mt-3">
          <summary class="cursor-pointer text-sm font-semibold">Laatste API-response</summary>
          <pre class="card p-3 mt-2 text-xs whitespace-pre-wrap break-all">{{ raw }}</pre>
        </details>
      </section>
    </main>
    <footer class="text-center text-xs text-muted py-6">
      WFM Availability Manager v0.3.1 · Geen eigen backend
    </footer>
  </div>
</template>
