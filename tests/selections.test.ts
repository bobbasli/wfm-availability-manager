// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, type App } from 'vue';
import { useAvailabilityManager } from '../src/composables/useAvailabilityManager';
let app: App;
let manager: ReturnType<typeof useAvailabilityManager>;
const json=(value: unknown)=>new Response(JSON.stringify(value));
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();await nextTick();};
beforeEach(async()=>{
  sessionStorage.clear();localStorage.clear();sessionStorage.setItem('wfm_token','synthetic-token');sessionStorage.setItem('wfm_auth_context',JSON.stringify(['mypurecloud.de','']));
  vi.stubGlobal('fetch',vi.fn(async(input: string)=>json(input.endsWith('/users/me')?{name:'Test'}:input.includes('/businessunits?')?{entities:[]}:{})));
  app=createApp({setup(){manager=useAvailabilityManager();return()=>h('div');}});app.mount(document.createElement('div'));await settle();
});
afterEach(()=>{app.unmount();vi.unstubAllGlobals();});
it('negeert een oude response en verstuurt de juiste lokale daggrenzen',async()=>{
  let resolve!: (response: Response)=>void;
  const fetch=vi.fn(()=>new Promise<Response>(r=>{resolve=r;}));vi.stubGlobal('fetch',fetch);
  manager.agentId.value='agent-one';await nextTick();
  const pending=manager.loadUnavailable();
  const body=JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.startDate).toBe(new Date((await import('../src/domain/time')).amsterdamToUtc(manager.start.value+'T00:00')).toISOString());
  manager.agentId.value='agent-two';resolve(json({entities:[{id:'old',timeSpan:{startDate:'2026-11-09T08:00:00Z',lengthMinutes:60}}]}));await pending;
  expect(manager.lastResponse.value).toBeNull();
});
it('sluit een editor bij een selectiewissel en voorkomt een PATCH',async()=>{
  manager.agentId.value='agent-one';manager.openEditor(null);expect(manager.draft.value).not.toBeNull();
  manager.agentId.value='agent-two';expect(manager.draft.value).toBeNull();
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await manager.submitChange();expect(fetch).not.toHaveBeenCalled();
});
it('wist gevoelige gegevens bij uitloggen en bij regio-wijziging',()=>{
  manager.raw.value='private response';manager.scheduleData.value={entities:[]};manager.logout();
  expect(manager.raw.value).toBe('Nog geen response.');expect(manager.scheduleData.value).toBeNull();expect(sessionStorage.getItem('wfm_token')).toBeNull();
  manager.token.value='another-token';manager.region.value='mypurecloud.ie';expect(manager.token.value).toBe('');
});
it('wist oude capaciteitsresultaten zodra marge of week wijzigt',()=>{
  manager.capacityRows.value=[{id:'old'}];manager.capacityMargin.value=30;expect(manager.capacityRows.value).toEqual([]);
  manager.capacityRows.value=[{id:'old'}];manager.capacityWeek.value='2026-11-16';expect(manager.capacityRows.value).toEqual([]);
});
it('toont een kalender ook wanneer unavailable times ontbreken',()=>{
  manager.agentId.value='agent-one';expect(manager.scheduleRows.value.length).toBeGreaterThan(0);expect(manager.graphSupported.value).toBe(false);
  manager.lastResponse.value={unexpected:[]};expect(manager.graphSupported.value).toBe(false);
});
it('verstuurt toevoeging, wijziging en verwijdering alleen na bevestiging',async()=>{
  manager.agentId.value='synthetic-agent';
  vi.spyOn(window,'confirm').mockReturnValue(false);
  const fetch=vi.fn(async()=>json({entities:[]}));vi.stubGlobal('fetch',fetch);
  manager.openEditor(null);await manager.submitChange();expect(fetch).not.toHaveBeenCalled();
  vi.mocked(window.confirm).mockReturnValue(true);
  await manager.submitChange();
  expect(fetch.mock.calls[0][0]).toContain('/agents/synthetic-agent/unavailabletimes');
  expect(fetch.mock.calls[0][1].method).toBe('PATCH');
  const created=JSON.parse(fetch.mock.calls[0][1].body).entities[0];
  expect(created).toMatchObject({delete:false,notes:''});expect(created.timeSpan.lengthMinutes).toBe(480);
  const original={id:'synthetic-slot',timeSpan:{startDate:'2026-11-09T08:00:00Z',lengthMinutes:60},notes:'Test'};
  manager.openEditor({original});await manager.submitChange();
  expect(JSON.parse(fetch.mock.calls[2][1].body).entities[0]).toMatchObject({id:'synthetic-slot',delete:false,notes:'Test'});
  manager.openEditor({original});await manager.submitChange(true);
  expect(JSON.parse(fetch.mock.calls[4][1].body)).toEqual({entities:[{id:'synthetic-slot',delete:true}]});
  vi.restoreAllMocks();
});
it('negeert een oude Management Unit-lijst bij snel wisselen',async()=>{
  let resolve!: (response: Response)=>void;
  vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>{resolve=r;})));
  manager.businessUnit.value='bu-one';const pending=manager.loadManagementUnits();
  manager.businessUnit.value='bu-two';resolve(json({entities:[{id:'old-mu'}]}));await pending;
  expect(manager.managementUnits.value).toEqual([]);
});
it('behoudt roosterweergave bij een mislukte Unavailable Times-response',()=>{
  manager.agentId.value='synthetic-agent';manager.lastResponse.value={unexpected:[]};
  const date=manager.start.value;
  manager.scheduleData.value={agentSchedules:[{userId:'synthetic-agent',shifts:[{startDate:date+'T08:00:00Z',lengthMinutes:60}]}]};
  expect(manager.graphSupported.value).toBe(false);expect(manager.scheduleRows.value[0].shifts).toHaveLength(1);
});
it('weigert een OAuth-callback met onjuiste state vóór tokenuitwisseling',async()=>{
  app.unmount();history.replaceState({},'','/?code=synthetic-code&state=wrong');
  sessionStorage.clear();sessionStorage.setItem('wfm_state','expected');sessionStorage.setItem('wfm_pkce','synthetic-verifier');
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  app=createApp({setup(){manager=useAvailabilityManager();return()=>h('div');}});app.mount(document.createElement('div'));await settle();
  expect(manager.status.value).toContain('state');expect(fetch).not.toHaveBeenCalled();expect(sessionStorage.getItem('wfm_pkce')).toBeNull();expect(location.search).toBe('');
});
it('accepteert een passende OAuth-callback en bindt het token aan client en regio',async()=>{
  app.unmount();history.replaceState({},'','/?code=synthetic-code&state=expected');
  sessionStorage.clear();sessionStorage.setItem('wfm_state','expected');sessionStorage.setItem('wfm_pkce','synthetic-verifier');sessionStorage.setItem('wfm_oauth_context',JSON.stringify(['mypurecloud.de','']));
  const fetch=vi.fn(async(input: string)=>json(input.includes('/oauth/token')?{access_token:'synthetic-new-token',token_type:'bearer'}:input.endsWith('/users/me')?{name:'Test'}:{entities:[]}));vi.stubGlobal('fetch',fetch);
  app=createApp({setup(){manager=useAvailabilityManager();return()=>h('div');}});app.mount(document.createElement('div'));await settle();
  expect(manager.token.value).toBe('synthetic-new-token');expect(sessionStorage.getItem('wfm_auth_context')).toBe(JSON.stringify(['mypurecloud.de','']));expect(sessionStorage.getItem('wfm_state')).toBeNull();expect(location.search).toBe('');
  const body=fetch.mock.calls[0][1].body as URLSearchParams;expect(body.get('grant_type')).toBe('authorization_code');expect(body.get('code_verifier')).toBe('synthetic-verifier');
});
it('maakt geen duplicaat wanneer een bestaand tijdvak geen ID heeft',async()=>{
  manager.agentId.value='synthetic-agent';manager.openEditor({original:{timeSpan:{startDate:'2026-11-09T08:00:00Z',lengthMinutes:60}}});
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await manager.submitChange();
  expect(manager.status.value).toContain('geen geldige Genesys-ID');expect(fetch).not.toHaveBeenCalled();
});
it('berekent capaciteit met eigen weekplannen en haalt gedeelde details één keer op',async()=>{
  const fetch=vi.fn(async(input: string)=>{
    if(input.endsWith('/agents/workplans/query'))return json({result:{referenceStartWeekDate:'2026-11-02',entities:[
      {user:{id:'employee-a'},workPlanLookupKeysPerWeek:[1,0]},
      {user:{id:'employee-b'},workPlanLookupKeysPerWeek:[0,1]},
      {user:{id:'employee-c'},workPlanLookupKeysPerWeek:[null,null]},
      {user:{id:'employee-d'},workPlanLookupKeysPerWeek:[1,0]},
    ],workPlanLookup:{'0':{id:'plan-a'},'1':{id:'plan-b'}}}});
    if(input.includes('/workplans/')){const id=input.split('/').at(-1),minutes=id==='plan-a'?480:240;return json({id,name:id,weeklyExactPaidMinutes:minutes,maximumDays:1,shifts:[{days:{values:['Monday']},exactStartTimeMinutesFromMidnight:540,exactPaidTimeMinutes:minutes}]});}
    return json({entities:[]});
  });vi.stubGlobal('fetch',fetch);
  manager.businessUnit.value='bu';manager.managementUnit.value='mu';manager.capacityWeek.value='2026-11-09';
  manager.agents.value=['a','b','c','d'].map(id=>({id:'employee-'+id,name:id}));
  await manager.loadCapacity();
  const rows=manager.capacityRows.value;
  expect(rows[0]).toMatchObject({planName:'plan-a',min:8,windowHours:8,pctMin:80});
  expect(rows[1]).toMatchObject({planName:'plan-b',min:4,windowHours:4,pctMin:80});
  expect(rows[2]).toMatchObject({planName:'Niet vastgesteld',pctMin:null});expect(rows[2].warning.join()).toContain('lookupsleutel');
  expect(fetch.mock.calls.filter(([url])=>url.includes('/workplans/plan-a'))).toHaveLength(1);
  manager.capacityWeek.value='2026-11-02';await manager.loadCapacity();
  expect(manager.capacityRows.value[0].planName).toBe('plan-b');expect(manager.capacityRows.value[1].planName).toBe('plan-a');
});
it('toont geen dekking als Work Plan-details niet kunnen worden opgehaald',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input: string)=>{
    if(input.endsWith('/agents/workplans/query'))return json({result:{referenceStartWeekDate:'2026-11-09',entities:[{user:{id:'employee-a'},workPlanLookupKeysPerWeek:[0]}],workPlanLookup:{'0':{id:'plan-a'}}}});
    if(input.includes('/workplans/'))return new Response('{}',{status:403});return json({entities:[]});
  }));
  manager.businessUnit.value='bu';manager.managementUnit.value='mu';manager.capacityWeek.value='2026-11-09';manager.agents.value=[{id:'employee-a',name:'A'}];await manager.loadCapacity();
  expect(manager.capacityRows.value[0].pctMin).toBeNull();expect(manager.capacityRows.value[0].warning.join()).toContain('403');
});
