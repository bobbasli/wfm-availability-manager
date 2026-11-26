import {describe,expect,it} from 'vitest';
import {totalShiftDuration} from '../src/domain/shiftDuration';
import {workPlanWindows} from '../src/domain/capacity';
import {calculatePlanningSpace,assessPlanningSpace} from '../src/domain/planningSpace';
import {amsterdamToUtc} from '../src/domain/time';
const days=['Monday','Tuesday','Wednesday','Thursday','Friday'];
const base={days:{values:days},exactStartTimeMinutesFromMidnight:540,exactPaidTimeMinutes:480,activities:[] as unknown[]};
const unpaid=(lengthMinutes:number)=>({lengthMinutes,countsAsPaidTime:false});
const plan=(shift:unknown)=>({weeklyExactPaidMinutes:2400,shifts:[shift]});
const range=(start:string,end:string):[number,number]=>[amsterdamToUtc(start),amsterdamToUtc(end)];
const calculate=(shift:unknown,blocked:[number,number][]=[])=>(calculatePlanningSpace(plan(shift),'2026-11-09',blocked,plan(shift)));
describe('volledige dienstduur',()=>{
  it('telt 480 betaald + 30 onbetaald als 510 minuten',()=>expect(totalShiftDuration({...base,activities:[unpaid(30)]})).toEqual({paidMinutes:480,unpaidMinutes:30,totalMinutes:510,paidMode:'exact'}));
  it('telt meerdere onbetaalde activiteiten zonder vaste pauze-aanname',()=>expect(totalShiftDuration({...base,activities:[unpaid(30),unpaid(15)]}).totalMinutes).toBe(525));
  it('telt betaalde activiteiten niet opnieuw op',()=>expect(totalShiftDuration({...base,activities:[{lengthMinutes:60,countsAsPaidTime:true},unpaid(30),{lengthMinutes:15,countsAsPaidTime:true}]}).totalMinutes).toBe(510));
  it('ondersteunt expliciet geen onbetaalde activiteiten',()=>expect(totalShiftDuration(base).totalMinutes).toBe(480));
  it('gebruikt exact betaald bij vaste en maximum betaald bij flexibele duur',()=>{
    expect(totalShiftDuration({...base,flexiblePaidTime:false,minimumPaidTimeMinutes:300,maximumPaidTimeMinutes:600}).paidMinutes).toBe(480);
    expect(totalShiftDuration({...base,flexiblePaidTime:true,minimumPaidTimeMinutes:360,maximumPaidTimeMinutes:540,activities:[unpaid(30)]})).toMatchObject({paidMinutes:540,unpaidMinutes:30,totalMinutes:570,paidMode:'maximum'});
  });
  it.each([undefined,null,{},'unknown'])('neemt ontbrekende/ongeldige activiteiten %s niet als nul aan',activities=>expect(()=>totalShiftDuration({...base,activities})).toThrow('activities'));
  it.each([{lengthMinutes:30},{lengthMinutes:30,countsAsPaidTime:'false'},{countsAsPaidTime:false},{countsAsPaidTime:false,lengthMinutes:-1},{countsAsPaidTime:false,lengthMinutes:'30'}])('weigert onvolledige onbetaalde informatie %s',activity=>expect(()=>totalShiftDuration({...base,activities:[activity]})).toThrow());
  it('weigert ontbrekende minimum-/maximumduur en ambigue duurmodus',()=>{
    expect(()=>totalShiftDuration({...base,flexiblePaidTime:true,maximumPaidTimeMinutes:480})).toThrow('minimumPaidTimeMinutes');
    expect(()=>totalShiftDuration({...base,flexiblePaidTime:true,minimumPaidTimeMinutes:600,maximumPaidTimeMinutes:480})).toThrow('groter');
    expect(()=>totalShiftDuration({...base,minimumPaidTimeMinutes:300,maximumPaidTimeMinutes:480})).toThrow('flexiblePaidTime');
  });
});
describe('vensters inclusief niet-betaalde activiteiten',()=>{
  it('geeft vaste dienst 09:00–17:30; pauze is geen Unavailable Time',()=>{
    const result=calculate({...base,activities:[unpaid(30)]});expect(result.windowHours).toBe(42.5);expect(result.blockedHours).toBe(0);expect(result.spaceHours).toBe(42.5);
    const detail=result.diagnostics!.shifts[0];expect(detail.end).toBe(amsterdamToUtc('2026-11-09T17:30'));expect(detail.totalMinutes).toBe(510);
  });
  it('geeft vijf vensters 09:00–19:00 en 50 uur bij 90 minuten startflexibiliteit',()=>{
    const shift={...base,flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:540,latestStartTimeMinutesFromMidnight:630,activities:[unpaid(30)]};
    const result=calculate(shift);expect(result.windowHours).toBe(50);expect(result.spaceHours).toBe(50);expect(assessPlanningSpace(result,25).minimum).toMatchObject({percentage:100,status:'green'});
    expect(result.diagnostics!.days.map(day=>day.spaceHours)).toEqual([10,10,10,10,10]);expect(result.diagnostics!.shifts[0].end).toBe(amsterdamToUtc('2026-11-09T19:00'));
  });
  it('forceert geen 50 uur bij een werkelijk smaller venster',()=>{
    const shift={...base,flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:540,latestStartTimeMinutesFromMidnight:600,activities:[unpaid(30)]};expect(calculate(shift).spaceHours).toBe(47.5);
  });
  it('vervangt de vroegere stille 47,5 uur bij ontbrekende activities door onbekend',()=>{
    const {activities,...incomplete}=base;
    const result=calculate({...incomplete,flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:540,latestStartTimeMinutesFromMidnight:630});
    expect(result.spaceHours).toBeNull();expect(result.reason).toContain('activities');expect(assessPlanningSpace(result,25).minimum?.percentage).toBeNull();
  });
  it('verwerkt twee onbetaalde activiteiten, flexibele start en flexibele betaalde duur samen',()=>{
    const shift={...base,flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:540,latestStartTimeMinutesFromMidnight:630,flexiblePaidTime:true,minimumPaidTimeMinutes:360,maximumPaidTimeMinutes:480,activities:[unpaid(30),unpaid(15)]};expect(calculate(shift).spaceHours).toBe(51.25);
  });
  it('verenigt overlappende diensten en overlappende Unavailable Times',()=>{
    const shift={...base,activities:[unpaid(30)]},value={weeklyExactPaidMinutes:2400,shifts:[shift,{...shift,activities:[unpaid(30),unpaid(15)]}]};
    const result=calculatePlanningSpace(value,'2026-11-09',[range('2026-11-09T17:00','2026-11-09T17:30'),range('2026-11-09T17:15','2026-11-09T18:00')],value);
    expect(result.windowHours).toBe(43.75);expect(result.blockedHours).toBe(0.75);expect(result.spaceHours).toBe(43);expect(result.diagnostics!.days[0].windowHours).toBe(8.75);
  });
  it('behoudt pauzeminuten bij een overnachtdienst',()=>{
    const shift={...base,days:{values:['Monday']},exactStartTimeMinutesFromMidnight:1320,activities:[unpaid(30)]};
    const result=calculate(shift);expect(result.spaceHours).toBe(8.5);expect(result.diagnostics!.days.map(day=>day.windowHours)).toEqual([2,6.5]);
  });
  it('behoudt inkomende/uitgaande uren over de weekgrens zonder dubbel tellen',()=>{
    const shift={...base,days:{values:['Sunday']},exactStartTimeMinutesFromMidnight:1320,activities:[unpaid(30)]};expect(calculate(shift).spaceHours).toBe(8.5);
    const intervals=workPlanWindows(plan(shift),'2026-11-09','2026-11-16').intervals;expect(intervals).toHaveLength(2);
  });
  it('weigert ambigue starttijden',()=>expect(calculate({...base,earliestStartTimeMinutesFromMidnight:540,latestStartTimeMinutesFromMidnight:600}).reason).toContain('flexibleStartTime'));
});
