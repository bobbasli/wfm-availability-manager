import { describe, expect, it, vi } from 'vitest';
import { parseAgentWorkPlans, queryAgentWorkPlans, createWorkPlanDetailsLoader } from '../src/services/workforceManagement';
const payload = () => ({result:{
  referenceStartWeekDate:'2026-10-19',
  entities:[
    {user:{id:'employee-a'},workPlanLookupKeysPerWeek:[0,1,0]},
    {user:{id:'employee-b'},workPlanLookupKeysPerWeek:[1,1,null]},
    {user:{id:'employee-c'},workPlanLookupKeysPerWeek:[2]},
  ],
  workPlanLookup:{'0':{id:'plan-a'},'1':{workPlanId:'plan-b'},'2':{id:'plan-c'}},
}});
const agents=['employee-a','employee-b','employee-c','missing'];
describe('Work Plan-weeklookup',()=>{
  it('koppelt meerdere medewerkers via user.id en accepteert sleutel nul',()=>{
    const result=parseAgentWorkPlans(payload(),agents,'2026-10-19');
    expect([...result.assignments]).toEqual([['employee-a','plan-a'],['employee-b','plan-b'],['employee-c','plan-c']]);
    expect(result.warnings.get('missing')).toContain('Geen Work Plan');
  });
  it('gebruikt weekindex vanaf referentie, ook over wintertijd heen',()=>{
    const second=parseAgentWorkPlans(payload(),agents,'2026-10-26');
    expect(second.assignments.get('employee-a')).toBe('plan-b');expect(second.assignments.get('employee-b')).toBe('plan-b');
    expect(second.warnings.get('employee-c')).toContain('weekindex');
    const third=parseAgentWorkPlans(payload(),agents,'2026-11-02');
    expect(third.assignments.get('employee-a')).toBe('plan-a');expect(third.assignments.has('employee-b')).toBe(false);
  });
  it.each(['2026-10-12','2026-10-20','2026-02-30'])('weigert niet beschikbare of ongeldige selectieweek %s',week=>{
    expect(parseAgentWorkPlans(payload(),agents,week).assignments.size).toBe(0);
  });
  it('weigert alternatieve agentvelden en onbekende lookups zonder fallback',()=>{
    const data={result:{referenceStartWeekDate:'2026-10-19',entities:[{id:'employee-a',agentId:'employee-a',workPlanLookupKeysPerWeek:[0]},{user:{id:'employee-b'},workPlanLookupKeysPerWeek:[99]}],workPlanLookup:{'0':{id:'plan-a'}}}};
    expect(parseAgentWorkPlans(data,agents,'2026-10-19').assignments.size).toBe(0);
  });
  it.each([null,-1,'0',0.5,{},Infinity])('weigert ongeldige sleutel %s',key=>{
    const data={result:{...payload().result,entities:[{user:{id:'employee-a'},workPlanLookupKeysPerWeek:[key]}]}};
    expect(parseAgentWorkPlans(data,agents,'2026-10-19').assignments.size).toBe(0);
  });
  it('weigert dubbele medewerkers en conflicterende plan-IDs',()=>{
    const data=payload();data.result.entities.push({...data.result.entities[0]});
    expect(parseAgentWorkPlans(data,agents,'2026-10-19').assignments.has('employee-a')).toBe(false);
    const conflict={result:{...payload().result,workPlanLookup:{'0':{id:'plan-a',workPlanId:'plan-b'}}}};
    expect(parseAgentWorkPlans(conflict,agents,'2026-10-19').assignments.size).toBe(0);
  });
  it('ondersteunt een numeriek geïndexeerde lookuptabel',()=>{
    const data={result:{...payload().result,workPlanLookup:[{id:'plan-a'},{id:'plan-b'},{id:'plan-c'}]}};
    expect(parseAgentWorkPlans(data,agents,'2026-10-19').assignments.get('employee-a')).toBe('plan-a');
  });
  it.each([{},null,{result:{}},{result:{...payload().result,referenceStartWeekDate:'invalid'}}])('meldt een ongeldig contract',data=>{
    const result=parseAgentWorkPlans(data,agents,'2026-10-19');expect(result.assignments.size).toBe(0);expect(result.warning).toBeTruthy();
  });
});
describe('Work Plan-service en detailcache',()=>{
  it('gebruikt het verplichte MU-pad en de gekozen week',async()=>{
    const request=vi.fn(async()=>payload());
    await queryAgentWorkPlans(request,'synthetic-mu',['employee-a'],'2026-10-26');
    expect(request).toHaveBeenCalledWith('/api/v2/workforcemanagement/managementunits/synthetic-mu/agents/workplans/query','POST',{agentIds:['employee-a'],startDate:'2026-10-26',weekCount:1});
    await expect(queryAgentWorkPlans(request,'',['employee-a'],'2026-10-26')).rejects.toThrow('Management Unit-ID');
    expect(request).toHaveBeenCalledOnce();
  });
  it('deelt gelijktijdige details per ID en houdt MUs gescheiden',async()=>{
    const request=vi.fn(async(path: string)=>({id:path.split('/').at(-1),shifts:[]}));
    const load=createWorkPlanDetailsLoader(request,'mu-one');
    const [first,second]=await Promise.all([load('plan-a'),load('plan-a'),load('plan-b')]);
    expect(first).toBe(second);expect(request).toHaveBeenCalledTimes(2);
    await createWorkPlanDetailsLoader(request,'mu-two')('plan-a');expect(request).toHaveBeenCalledTimes(3);
  });
  it('weigert verkeerde details en deelt ook een mislukte call binnen dezelfde refresh',async()=>{
    const request=vi.fn(async()=>({id:'wrong'}));const load=createWorkPlanDetailsLoader(request,'mu');
    await expect(load('plan-a')).rejects.toThrow('ander Work Plan');await expect(load('plan-a')).rejects.toThrow('ander Work Plan');expect(request).toHaveBeenCalledOnce();
  });
});
