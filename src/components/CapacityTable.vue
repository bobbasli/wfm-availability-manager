<script setup lang="ts">
import { computed } from 'vue';
import type { CapacityRow } from '../composables/useCapacity';
import { assessPlanningSpace, type SpaceBoundary, type SpaceStatus } from '../domain/planningSpace';
const props=defineProps<{rows:CapacityRow[];margin:unknown}>();
const rows=computed(()=>props.rows.map(row=>({...row,assessment:assessPlanningSpace(row.space,props.margin)})));
const hours=(value:number|null)=>value===null?'—':`${value.toLocaleString('nl-NL',{maximumFractionDigits:2})} uur`;
const percent=(value:number|null)=>value===null?'—':`${value.toLocaleString('nl-NL',{maximumFractionDigits:1})}%`;
const classes:Record<SpaceStatus,string>={green:'text-emerald-700',orange:'text-amber-700',red:'text-red-700',unknown:'text-slate-500'};
const tooltip=(value:SpaceBoundary)=>`${hours(value.paidHours)} betaald; ${hours(value.requiredHours)} benodigde ruimte. ${value.description}`;
</script>
<template>
  <div class="overflow-x-auto">
    <table class="min-w-[720px] w-full text-sm">
      <caption class="text-left text-xs text-slate-500 pb-3">Beschikbare planningsruimte per medewerker en geselecteerde week.</caption>
      <thead class="bg-slate-100 text-slate-700"><tr>
        <th scope="col" class="text-left p-3">Medewerker / Work Plan</th>
        <th scope="col" class="text-right p-3">Betaald / week</th>
        <th scope="col" class="text-right p-3">Niet beschikbaar</th>
        <th scope="col" class="text-right p-3">Planbare ruimte</th>
        <th scope="col" class="text-left p-3">Planbaarheid</th>
      </tr></thead>
      <tbody><tr v-for="row in rows" :key="row.id" class="border-b border-slate-100">
        <th scope="row" class="p-3 text-left font-medium">{{row.name}}<span class="block text-xs text-slate-500 font-normal">{{row.planName}}</span></th>
        <td class="p-3 text-right whitespace-nowrap"><template v-if="row.space.paid">{{row.space.paid.min===row.space.paid.max?hours(row.space.paid.min):`${row.space.paid.min.toLocaleString('nl-NL')}–${row.space.paid.max.toLocaleString('nl-NL')} uur`}}</template><span v-else :title="row.space.reason??'Betaalde weekuren zijn onbekend.'">—</span></td>
        <td class="p-3 text-right">{{hours(row.space.blockedHours)}}</td>
        <td class="p-3 text-right font-semibold">{{hours(row.space.spaceHours)}}</td>
        <td class="p-3">
          <template v-if="row.assessment.minimum && row.assessment.maximum">
            <template v-if="row.space.paid && row.space.paid.min!==row.space.paid.max">
              <p class="font-semibold" v-if="row.assessment.minimum.percentage!==null && row.assessment.maximum.percentage!==null">{{percent(row.assessment.maximum.percentage)}} – {{percent(row.assessment.minimum.percentage)}}</p>
              <p v-for="(boundary,i) in [row.assessment.minimum,row.assessment.maximum]" :key="i" :class="classes[boundary.status]" :title="tooltip(boundary)">{{i===0?'Minimum':'Maximum'}} {{hours(boundary.paidHours)}}: {{percent(boundary.percentage)}}<span class="block text-xs">{{boundary.description}}</span></p>
            </template>
            <p v-else :class="classes[row.assessment.minimum.status]" :title="tooltip(row.assessment.minimum)"><span class="font-semibold">{{percent(row.assessment.minimum.percentage)}}</span><span class="block text-xs">{{row.assessment.minimum.description}}</span></p>
          </template>
          <p v-else class="text-slate-500" :title="row.assessment.reason??row.space.reason??'Gegevens ontbreken.'">—<span class="block text-xs">{{row.assessment.reason??row.space.reason}}</span></p>
        </td>
      </tr><tr v-if="!rows.length"><td colspan="5" class="p-6 text-center text-slate-500">Nog geen gegevens geladen.</td></tr></tbody>
    </table>
  </div>
  <section aria-labelledby="capacity-explanation" class="text-sm text-slate-600 space-y-3">
    <h3 id="capacity-explanation" class="font-semibold text-slate-800">Toelichting bij de cijfers</h3>
    <p><strong>Betaald / week</strong><br>Het aantal betaalde uren dat volgens het Work Plan per week gewerkt moet worden. Bij flexibele Work Plans wordt een bereik getoond.</p>
    <p><strong>Niet beschikbaar</strong><br>Het aantal uren dat de medewerker als niet beschikbaar heeft opgegeven en dat binnen de toegestane inzetvensters valt.</p>
    <p><strong>Planbare ruimte</strong><br>Het aantal uren dat binnen de mogelijke werktijden overblijft nadat de niet-beschikbare perioden zijn afgetrokken. Dit is de ruimte die Genesys WFM heeft om diensten te plaatsen.</p>
    <p><strong>Planbaarheid</strong><br>De verhouding tussen de planbare ruimte en de betaalde weekuren inclusief de ingestelde marge. Bij een planbaarheid van 100% is precies de gewenste planningsruimte beschikbaar. Een hoger percentage betekent meer ruimte; een lager percentage betekent dat de gewenste marge niet volledig wordt gehaald.</p>
    <p>Bij flexibele weekuren wordt het percentage voor beide grenzen getoond: de onderkant van het percentagebereik hoort bij de maximale weekuren, de bovenkant bij de minimale weekuren. De kleur en toelichting gelden per grens. Het maximum is geen stilzwijgende contractuele verplichting. Bij onbekende gegevens of nul benodigde uren staat er —.</p>
    <p><strong>Planningsmarge</strong><br>De marge is extra ruimte die we wenselijk vinden om medewerkers flexibel te kunnen inroosteren. Bij 24 betaalde uren en een marge van 25% streven we naar 30 uur planbare ruimte.</p>
    <div><strong>Kleurindicaties</strong><ul class="list-disc pl-5"><li>Groen: voldoende ruimte inclusief marge.</li><li>Oranje: voldoende ruimte voor de betaalde uren, maar onvoldoende marge.</li><li>Rood: onvoldoende ruimte voor de betaalde uren.</li></ul></div>
    <p class="italic">De planbaarheid is een indicator van de beschikbare tijdsruimte. Het is geen garantie dat Genesys Cloud daadwerkelijk een geldig rooster kan genereren. Hierbij spelen ook andere Work Plan-regels een rol, zoals maximale werkdagen, dienstlengtes en rusttijden.</p>
  </section>
</template>
