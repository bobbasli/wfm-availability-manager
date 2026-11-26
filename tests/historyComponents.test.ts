// @vitest-environment jsdom
import {expect,it} from 'vitest';
import {createApp} from 'vue';
import ScheduleHistory from '../src/components/ScheduleHistory.vue';
import AvailabilityHistory from '../src/components/AvailabilityHistory.vue';
import {readScheduleHistory} from '../src/domain/history';
const history=readScheduleHistory({id:'s',metadata:{dateCreated:'2026-11-10T09:00:00Z',dateModified:'2026-11-20T10:00:00Z'}},{agentSchedules:[{user:{id:'agent-a'},metadata:{dateModified:'2026-11-19T10:00:00Z'}}]},'agent-a','s');
it('toont onderscheiden roosterdatums en de publicatiebeperking',()=>{
  const root=document.createElement('div'),app=createApp(ScheduleHistory,{history});app.mount(root);
  try{expect(root.textContent).toContain('10-11-2026 10:00');expect(root.textContent).toContain('20-11-2026 11:00');expect(root.textContent).toContain('19-11-2026 11:00');expect(root.querySelectorAll('dd')[1].textContent).toBe('Niet beschikbaar');expect(root.textContent).toContain('geen vervanging voor publicatie');}finally{app.unmount();}
});
it('houdt blokhistorie alleen-lezen en benoemt ontbrekende datums en neutrale betekenis',()=>{
  const root=document.createElement('div'),app=createApp(AvailabilityHistory,{block:{id:'synthetic'},schedule:history});app.mount(root);
  try{expect([...root.querySelectorAll('dd')].map(e=>e.textContent)).toEqual(['Niet beschikbaar','Niet beschikbaar','Niet beschikbaar']);expect(root.querySelectorAll('input,textarea,select')).toHaveLength(0);expect(root.textContent).toContain('bewijst niet wie');expect(root.textContent).toContain('betrouwbare tijdstempels ontbreken');}finally{app.unmount();}
});
