// @vitest-environment jsdom
import {expect,it} from 'vitest';
import {createApp,h,nextTick,ref} from 'vue';
import CapacityTable from '../src/components/CapacityTable.vue';
import {calculatePlannability,unknownPlanning} from '../src/domain/plannability';
import type {CapacityRow} from '../src/composables/useCapacity';
it('toont tien kolommen, maximaal 100% en een toegankelijk detailvenster',async()=>{
  const plan={weeklyExactPaidMinutes:1440,maximumDays:3,optionalDays:{values:['Monday','Tuesday','Wednesday','Thursday','Friday']},shifts:[{days:{values:['Monday','Tuesday','Wednesday','Thursday','Friday']},flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:480,latestStartTimeMinutesFromMidnight:780,startIncrementMinutes:60,exactPaidTimeMinutes:480}]};
  const rows=ref<CapacityRow[]>([{id:'synthetic',name:'Testmedewerker',planName:'Flexplan',calculation:calculatePlannability(plan,'2026-11-09',[],{previousPlan:plan})}]);
  const root=document.createElement('div');document.body.appendChild(root);const app=createApp({setup:()=>()=>h(CapacityTable,{rows:rows.value})});app.mount(root);
  try{
    expect(root.querySelectorAll('thead th')).toHaveLength(10);expect(root.textContent).toContain('100%');expect(root.textContent).not.toContain('216,7%');expect(root.textContent).not.toContain('Normdekking');
    const trigger=root.querySelector('tbody button') as HTMLButtonElement;trigger.focus();trigger.click();await nextTick();await nextTick();
    const dialog=root.querySelector('[role="dialog"]') as HTMLElement;expect(dialog).not.toBeNull();expect(document.activeElement).toBe(dialog);expect(dialog.textContent).toContain('geen officieel gepubliceerd Genesys-rooster');
    dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await nextTick();expect(root.querySelector('[role="dialog"]')).toBeNull();expect(document.activeElement).toBe(trigger);
    trigger.click();await nextTick();rows.value=[];await nextTick();await nextTick();expect(root.querySelector('[role="dialog"]')).toBeNull();
  }finally{app.unmount();root.remove();}
});
it('toont geen percentage bij een ontbrekende toewijzing',()=>{
  const root=document.createElement('div');const app=createApp(CapacityTable,{rows:[{id:'missing',name:'Test',planName:'Niet vastgesteld',calculation:unknownPlanning('2026-11-09','Geen assignment')}]});app.mount(root);
  try{expect(root.textContent).toContain('Niet vast te stellen');expect(root.querySelector('tbody')?.textContent).not.toContain('%');}finally{app.unmount();}
});
