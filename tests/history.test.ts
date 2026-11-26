import {describe,expect,it} from 'vitest';
import {readTimestamp,formatHistoryTimestamp,readScheduleHistory,readAvailabilityHistory,compareHistory,type ScheduleHistory,type AvailabilityHistory} from '../src/domain/history';
const schedule=(patch:Partial<ScheduleHistory>={}):ScheduleHistory=>({createdAt:'2026-11-10T08:00:00Z',firstPublishedAt:'2026-11-18T13:35:00Z',modifiedAt:'2026-11-20T10:00:00Z',agentModifiedAt:'2026-11-19T10:00:00Z',...patch});
const block=(patch:Partial<AvailabilityHistory>={}):AvailabilityHistory=>({createdAt:null,modifiedAt:null,modifiedBy:null,...patch});
describe('tijdstempels en Nederlandse weergave',()=>{
  it.each([['2026-11-18T13:35:00Z','18-11-2026 14:35'],['2026-07-18T13:35:00Z','18-07-2026 15:35'],['2026-11-18T08:35:00-05:00','18-11-2026 14:35'],['2026-03-29T00:30:00Z','29-03-2026 01:30'],['2026-03-29T01:30:00Z','29-03-2026 03:30'],['2026-10-25T00:30:00Z','25-10-2026 02:30'],['2026-10-25T01:30:00Z','25-10-2026 02:30']])('formatteert %s in Europe/Amsterdam',(instant,text)=>expect(formatHistoryTimestamp(instant)).toBe(text));
  it.each([null,undefined,'','invalid','2026-11-18','2026-11-18T14:35:00','2026-02-30T10:00:00Z','2026-11-18T24:00:00Z','2026-11-18T14:35:00+14:30','2026-11-18T14:35:00.000001Z',123])('verzint geen datum voor %s',value=>{
    expect(readTimestamp(value)).toBeNull();expect(formatHistoryTimestamp(value)).toBe('Niet beschikbaar');
  });
});
describe('broncontract en scope',()=>{
  const metadata={id:'schedule-a',metadata:{dateCreated:'2026-11-10T08:00:00Z',dateModified:'2026-11-20T10:00:00Z'}};
  it('scheidt aanmaak, roosterwijziging en agentwijziging; publicatie blijft onbekend',()=>{
    const result=readScheduleHistory(metadata,{result:{agentSchedules:[{user:{id:'agent-a'},metadata:{dateModified:'2026-11-19T10:00:00Z'}}]}},'agent-a','schedule-a');
    expect(result).toEqual({createdAt:'2026-11-10T08:00:00.000Z',modifiedAt:'2026-11-20T10:00:00.000Z',agentModifiedAt:'2026-11-19T10:00:00.000Z',firstPublishedAt:null});
  });
  it('gebruikt geen aanmaakdatum of ongedocumenteerde publicatievelden als eerste publicatie',()=>{
    expect(readScheduleHistory({...metadata,datePublished:'2026-11-18T13:35:00Z',firstPublishedAt:'2026-11-18T13:35:00Z'},null,'agent-a','schedule-a').firstPublishedAt).toBeNull();
  });
  it('gebruikt nooit een andere medewerker of de globale datum als agentdatum',()=>{
    const response={agentSchedules:[{user:{id:'agent-b'},metadata:{dateModified:'2026-11-21T12:00:00Z'}}]};
    const result=readScheduleHistory(metadata,response,'agent-a','schedule-a');expect(result.agentModifiedAt).toBeNull();expect(result.modifiedAt).not.toBeNull();
  });
  it('houdt de eigen datum bij een nieuwere wijziging aan een andere medewerker',()=>{
    const response={result:{agentSchedules:[{user:{id:'agent-a'},metadata:{dateModified:'2026-11-19T10:00:00Z'}},{user:{id:'agent-b'},metadata:{dateModified:'2026-11-21T12:00:00Z'}}]}};
    expect(readScheduleHistory(metadata,response,'agent-a','schedule-a').agentModifiedAt).toBe('2026-11-19T10:00:00.000Z');
  });
  it('weigert dubbele agentrecords, verkeerde rooster-ID en onbekende veldvormen',()=>{
    const row={user:{id:'agent-a'},metadata:{dateModified:'2026-11-19T10:00:00Z'}};
    expect(readScheduleHistory(metadata,{agentSchedules:[row,row]},'agent-a','schedule-a').agentModifiedAt).toBeNull();
    expect(readScheduleHistory(metadata,{agentSchedules:[row]},'agent-a','schedule-b').modifiedAt).toBeNull();
    expect(readScheduleHistory(metadata,{agentSchedules:[{userId:'agent-a',metadata:row.metadata}]},'agent-a','schedule-a').agentModifiedAt).toBeNull();
  });
  it('weigert omgekeerde aanmaak-/wijzigingschronologie en ontbrekende metadata',()=>{
    expect(readScheduleHistory({...metadata,metadata:{dateCreated:'2026-11-20T10:00:00Z',dateModified:'2026-11-19T10:00:00Z'}},null,'a','schedule-a').createdAt).toBeNull();
    expect(readScheduleHistory(null,null,'a','s').modifiedAt).toBeNull();
  });
  it('verzint geen blokhistorie uit tijdvakstart, eigenaars of vermoedelijke metadata',()=>{
    expect(readAvailabilityHistory({id:'block-a',timeSpan:{startDate:'2026-11-10T08:00:00Z'},user:{id:'agent-a'},createdAt:'2026-11-10T08:00:00Z',metadata:{dateCreated:'2026-11-10T08:00:00Z',dateModified:'2026-11-20T10:00:00Z',modifiedBy:{id:'someone'}}})).toEqual({createdAt:null,modifiedAt:null,modifiedBy:null});
  });
});
describe('vergelijkingsbeleid voor betrouwbaar vastgestelde historie',()=>{
  // Synthetic verified history exercises the policy. The existing API adapters
  // deliberately supply null for unavailable block dates / first publication.
  it('onderscheidt een blok vóór eerste publicatie',()=>expect(compareHistory(block({createdAt:'2026-11-18T12:00:00Z'}),schedule())).toEqual(['Dit blok is vóór de eerste roosterpublicatie aangemaakt.']));
  it('onderscheidt een blok na eerste publicatie',()=>expect(compareHistory(block({createdAt:'2026-11-18T14:00:00Z'}),schedule())).toEqual(['Dit blok is na de eerste roosterpublicatie aangemaakt.']));
  it('onderscheidt gelijke instants ondanks verschillende tijdzones',()=>expect(compareHistory(block({createdAt:'2026-11-18T14:35:00+01:00'}),schedule())[0]).toContain('hetzelfde tijdstip'));
  it('vergelijkt een wijziging met de eigen agentdatum ondanks latere roosterbrede wijziging',()=>{
    expect(compareHistory(block({modifiedAt:'2026-11-19T11:00:00Z'}),schedule())).toEqual(['Dit blok is gewijzigd na de laatste wijziging van het rooster van de geselecteerde medewerker.']);
  });
  it('benoemt een globale fallback uitdrukkelijk als roosterbreed, niet als agentwijziging',()=>{
    const messages=compareHistory(block({modifiedAt:'2026-11-21T11:00:00Z'}),schedule({agentModifiedAt:null}));expect(messages[0]).toContain('roosterbrede wijziging');expect(messages[0]).toContain('niet beschikbaar');expect(messages[0]).not.toContain('na de laatste wijziging van het rooster van de geselecteerde medewerker');
  });
  it('vergelijkt nooit zonder beide betrouwbare waarden',()=>{
    expect(compareHistory(block(),schedule())).toEqual([]);expect(compareHistory(block({createdAt:'2026-11-18T12:00:00Z'}),schedule({firstPublishedAt:null}))).toEqual([]);expect(compareHistory(block({modifiedAt:'invalid'}),schedule())).toEqual([]);
  });
  it('houdt de twee verschillende herhaalde wintertijden in UTC uiteen',()=>{
    const history=schedule({agentModifiedAt:'2026-10-25T02:30:00+02:00'});
    expect(compareHistory(block({modifiedAt:'2026-10-25T02:30:00+01:00'}),history)).toHaveLength(1);
  });
});
