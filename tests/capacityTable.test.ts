// @vitest-environment jsdom
import {expect,it} from 'vitest';
import {createApp,h,nextTick,ref} from 'vue';
import CapacityTable from '../src/components/CapacityTable.vue';
import {unknownSpace,type PlanningSpace} from '../src/domain/planningSpace';
import type {CapacityRow} from '../src/composables/useCapacity';
const space:PlanningSpace={paid:{min:24,max:24},windowHours:30,blockedHours:0,spaceHours:30,reason:null};
it('toont uitsluitend vijf kolommen en permanent zichtbare toelichting',()=>{
  const root=document.createElement('div');const app=createApp(CapacityTable,{rows:[{id:'synthetic',name:'Test',planName:'Plan A',space}],margin:25});app.mount(root);
  try{
    expect([...root.querySelectorAll('thead th')].map(t=>t.textContent)).toEqual(['Medewerker / Work Plan','Betaald / week','Niet beschikbaar','Planbare ruimte','Planbaarheid']);
    expect(root.querySelector('tbody')?.textContent).toContain('Plan A');expect(root.textContent).toContain('100%');expect(root.textContent).toContain('Toelichting bij de cijfers');expect(root.textContent).toContain('geen garantie');expect(root.querySelector('details')).toBeNull();expect(root.textContent).not.toContain('Voorbeeldindeling');
  }finally{app.unmount();}
});
it('rekent percentages en kleuren direct opnieuw uit bij een gewijzigde marge',async()=>{
  const margin=ref(25),root=document.createElement('div');const app=createApp({setup:()=>()=>h(CapacityTable,{rows:[{id:'x',name:'Test',planName:'Plan',space}],margin:margin.value})});app.mount(root);
  try{
    expect(root.querySelector('tbody .text-emerald-700')).not.toBeNull();
    margin.value=50;await nextTick();expect(root.querySelector('tbody')?.textContent).toContain('83,3%');expect(root.querySelector('tbody .text-amber-700')).not.toBeNull();
    margin.value=0;await nextTick();expect(root.querySelector('tbody')?.textContent).toContain('125%');expect(root.querySelector('tbody .text-emerald-700')).not.toBeNull();
  }finally{app.unmount();}
});
it('toont flexibele grenzen met afzonderlijke kleuren en zonder maximumverplichting',()=>{
  const root=document.createElement('div');const app=createApp(CapacityTable,{rows:[{id:'x',name:'Test',planName:'Plan',space:{...space,paid:{min:24,max:32}}}],margin:25});app.mount(root);
  try{expect(root.textContent).toContain('24–32 uur');expect(root.textContent).toContain('75% – 100%');expect(root.querySelector('tbody .text-emerald-700')).not.toBeNull();expect(root.querySelector('tbody .text-red-700')).not.toBeNull();expect(root.textContent).toContain('geen stilzwijgende contractuele verplichting');}finally{app.unmount();}
});
it('toont — met reden voor ontbrekende toewijzing en een ongeldige marge',()=>{
  const root=document.createElement('div');const app=createApp(CapacityTable,{rows:[{id:'missing',name:'Test',planName:'Niet vastgesteld',space:unknownSpace('Geen assignment')}],margin:25});app.mount(root);
  try{expect(root.querySelector('tbody')?.textContent).toContain('Geen assignment');expect(root.querySelector('tbody')?.textContent).not.toContain('%');}finally{app.unmount();}
});
