import { describe, it, expect } from 'vitest';
import { amsterdamToUtc, localDayBounds, isPublished } from '../src/domain/time';
import { workPlanHours, workPlanWindows, unionIntervals, intersectionHours } from '../src/domain/capacity';
describe('Amsterdam kalender',()=>{
  it.each(['2026-03-29T02:30','2026-10-25T02:30'])('weigert niet-bestaande of dubbelzinnige tijd %s',value=>expect(()=>amsterdamToUtc(value)).toThrow());
  it('gebruikt lokale daggrenzen bij de zomertijdwisseling',()=>{
    expect(localDayBounds('2026-03-29','2026-03-29')).toEqual({startDate:'2026-03-28T23:00:00.000Z',endDate:'2026-03-29T22:00:00.000Z'});
    expect(localDayBounds('2026-10-25','2026-10-25')).toEqual({startDate:'2026-10-24T22:00:00.000Z',endDate:'2026-10-25T23:00:00.000Z'});
  });
});
describe('roosterpublicatie',()=>{
  it.each(['Unpublished','not published','draft','publishing'])('weigert %s',status=>expect(isPublished({status})).toBe(false));
  it('vereist een expliciete publicatie',()=>{expect(isPublished({published:true})).toBe(true);expect(isPublished({status:'Published'})).toBe(true);expect(isPublished({published:false,status:'Published'})).toBe(false);expect(isPublished({})).toBe(false);});
});
describe('capaciteit',()=>{
  const shift={days:{values:['Sunday']},exactStartTimeMinutesFromMidnight:540,exactPaidTimeMinutes:480};
  it.each([['2026-03-23','2026-03-30','2026-03-29T07:00:00.000Z'],['2026-10-19','2026-10-26','2026-10-25T08:00:00.000Z']])('houdt 09:00 lokaal vast in week %s',(week,next,start)=>{
    const result=workPlanWindows({shifts:[shift]},week,next);expect(new Date(result.intervals[0][0]).toISOString()).toBe(start);expect(result.intervals[0][1]-result.intervals[0][0]).toBe(8*3600000);
  });
  it('neemt nachtdienst over de weekgrens mee',()=>{
    const result=workPlanWindows({shifts:[{...shift,exactStartTimeMinutesFromMidnight:1320}]},'2026-11-09','2026-11-16');
    expect(new Date(result.intervals[0][0]).toISOString()).toBe('2026-11-08T23:00:00.000Z');
    expect(new Date(result.intervals[0][1]).toISOString()).toBe('2026-11-09T05:00:00.000Z');
  });
  it('weigert onvolledige definities en null-uren',()=>{
    expect(workPlanHours({weeklyExactPaidMinutes:null})).toBeNull();
    expect(workPlanHours({flexibleWeeklyPaidTime:true,weeklyMinimumPaidMinutes:2400,weeklyMaximumPaidMinutes:1200})).toBeNull();
    expect(()=>workPlanWindows({shifts:[shift,{...shift,exactPaidTimeMinutes:null}]},'2026-03-23','2026-03-30')).toThrow();
  });
  it('geeft flexuren en telt overlappen één keer',()=>{
    expect(workPlanHours({flexibleWeeklyPaidTime:true,weeklyMinimumPaidMinutes:1200,weeklyMaximumPaidMinutes:2400})).toEqual({min:20,max:40});
    const hour=3600000;expect(unionIntervals([[0,2*hour],[hour,3*hour]])).toEqual([[0,3*hour]]);
    expect(intersectionHours([[0,3*hour]],unionIntervals([[hour,2*hour],[hour,4*hour]]))).toBe(2);
  });
});
