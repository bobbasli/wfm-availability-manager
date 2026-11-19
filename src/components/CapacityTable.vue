<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CapacityRow } from '../composables/useCapacity';
import { useDialogFocus } from '../composables/useDialogFocus';
const props=defineProps<{rows:CapacityRow[]}>();
const selected=ref<CapacityRow|null>(null);
const {dialog,trapDialogFocus}=useDialogFocus(selected);
watch(()=>props.rows,()=>{selected.value=null;});
const hours=(value:number|null)=>value===null?'—':`${value.toLocaleString('nl-NL',{maximumFractionDigits:2})} u`;
const percent=(value:number|null)=>value===null?'—':`${value.toLocaleString('nl-NL',{maximumFractionDigits:1})}%`;
const datetime=(value:number)=>new Intl.DateTimeFormat('nl-NL',{timeZone:'Europe/Amsterdam',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
const contract=(row:CapacityRow)=>{const range=row.calculation.contract;return !range?'Niet vast te stellen':range.min===range.max?hours(range.min):`min. ${hours(range.min)} / max. ${hours(range.max)}`;};
</script>
<template>
  <div class="overflow-x-auto">
    <table class="min-w-[1150px] w-full text-sm">
      <caption class="text-left text-xs text-slate-500 pb-3">Planbaarheid toetst contracturen aan geldige dienstcombinaties. Klik op een medewerker voor regels en uitleg.</caption>
      <thead class="bg-slate-100 text-slate-700"><tr>
        <th scope="col" class="text-left p-3">Medewerker</th><th scope="col" class="text-left p-3">Work Plan</th>
        <th scope="col" class="text-right p-3">Contracturen</th><th scope="col" class="text-right p-3">Max. dagen</th>
        <th scope="col" class="text-right p-3">Inzetvensters</th><th scope="col" class="text-right p-3">Niet beschikbaar</th>
        <th scope="col" class="text-right p-3">Max. planbaar</th><th scope="col" class="text-right p-3">Planbaarheid</th>
        <th scope="col" class="text-left p-3">Flexibiliteit</th><th scope="col" class="text-left p-3">Status</th>
      </tr></thead>
      <tbody><tr v-for="row in rows" :key="row.id" class="border-b border-slate-100">
        <th scope="row" class="p-3 text-left"><button class="text-indigo-700 underline rounded focus-visible:ring-2 focus-visible:ring-indigo-500" @click="selected=row">{{row.name}}</button></th>
        <td class="p-3">{{row.planName}}</td><td class="p-3 text-right">{{contract(row)}}</td><td class="p-3 text-right">{{row.calculation.maxDays??'—'}}</td>
        <td class="p-3 text-right">{{hours(row.calculation.windowHours)}}</td><td class="p-3 text-right">{{hours(row.calculation.blockedHours)}}</td>
        <td class="p-3 text-right font-semibold">{{hours(row.calculation.maxHours)}}</td>
        <td class="p-3 text-right"><span>{{percent(row.calculation.coverage)}}</span><span v-if="row.calculation.contract && row.calculation.contract.min!==row.calculation.contract.max" class="block text-xs text-slate-500">van vereist minimum</span></td>
        <td class="p-3"><span tabindex="0" :title="row.calculation.flexibility.explanation">{{row.calculation.flexibility.label}}</span></td>
        <td class="p-3"><span :class="row.calculation.status==='Planbaar'?'text-emerald-700':'text-amber-800'">{{row.calculation.status}}</span><p v-for="reason in row.calculation.reasons" :key="reason" class="text-xs mt-1">{{reason}}</p></td>
      </tr><tr v-if="!rows.length"><td colspan="10" class="p-6 text-center text-slate-500">Nog geen gegevens geladen.</td></tr></tbody>
    </table>
  </div>
  <div v-if="selected" class="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" @click.self="selected=null">
    <section ref="dialog" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="capacity-detail-title" class="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-4" @keydown.esc.prevent="selected=null" @keydown.tab="trapDialogFocus">
      <div class="flex items-center justify-between gap-4"><h2 id="capacity-detail-title" class="text-xl font-bold">{{selected.name}} · {{selected.calculation.week}}</h2><button class="border rounded px-3 py-2" @click="selected=null">Sluiten</button></div>
      <p>{{selected.planName}} · Contract: {{contract(selected)}} · maximaal {{selected.calculation.maxDays??'onbekend aantal'}} werkdagen.</p>
      <p class="bg-indigo-50 p-3 rounded text-sm">Deze berekening geldt voor de ondersteunde expliciete Work Plan-regels en ontvangen onbeschikbaarheid. Een voorbeeld is geen officieel gepubliceerd Genesys-rooster en wordt niet opgeslagen.</p>
      <div><h3 class="font-semibold">Regels en toegestane dienstvensters</h3><ul class="list-disc pl-5"><li v-for="rule in selected.calculation.rules" :key="rule">{{rule}}</li></ul>
        <ul class="list-disc pl-5"><li v-for="(window,i) in selected.calculation.windows" :key="i">{{datetime(window[0])}} – {{datetime(window[1])}}</li></ul><p v-if="!selected.calculation.windows.length">Geen betrouwbare vensters vastgesteld.</p>
      </div>
      <div><h3 class="font-semibold">Onbeschikbare perioden</h3><ul class="list-disc pl-5"><li v-for="(period,i) in selected.calculation.unavailable" :key="i">{{datetime(period[0])}} – {{datetime(period[1])}}</li></ul><p v-if="!selected.calculation.unavailable.length">Geen perioden in de ontvangen gegevens; zie eventuele foutmelding.</p></div>
      <div><h3 class="font-semibold">Maximaal planbare betaalde uren</h3><p>{{hours(selected.calculation.maxHours)}} · {{selected.calculation.status}} · dekking {{percent(selected.calculation.coverage)}}</p><ul class="list-disc pl-5"><li v-for="reason in selected.calculation.reasons" :key="reason">{{reason}}</li></ul></div>
      <details><summary class="font-semibold cursor-pointer">Mogelijk geldige diensten ({{selected.calculation.candidates.length}})</summary><p class="text-sm">Een kandidaat is afzonderlijk geldig; niet iedere combinatie is geldig. Maximaal 100 kandidaten getoond.</p><ul class="list-disc pl-5"><li v-for="(shift,i) in selected.calculation.candidates.slice(0,100)" :key="i">{{datetime(shift.start)}} – {{datetime(shift.end)}} · {{hours(shift.paidMinutes/60)}} betaald</li></ul></details>
      <div><h3 class="font-semibold">Voorbeeldindeling — geen gepubliceerd rooster</h3><p v-if="!selected.calculation.example.length">Geen betrouwbare voorbeeldindeling beschikbaar.</p><ul class="list-disc pl-5"><li v-for="(shift,i) in selected.calculation.example" :key="i">{{datetime(shift.start)}} – {{datetime(shift.end)}} · {{hours(shift.paidMinutes/60)}} betaald<span v-if="shift.activities.length"> · {{shift.activities.length}} vast geplaatste activiteit(en)</span></li></ul><p v-if="selected.calculation.status!=='Planbaar' && selected.calculation.example.length" class="text-amber-800">Deze gedeeltelijke indeling haalt de contracteis niet.</p></div>
      <div><h3 class="font-semibold">Flexibiliteit: {{selected.calculation.flexibility.label}}</h3><p class="text-sm">{{selected.calculation.flexibility.explanation}}</p></div>
    </section>
  </div>
</template>
