import { totalShiftDuration, flexibleMode, shiftMinutes, type ShiftDuration } from './shiftDuration';
import { amsterdamToUtc } from './time';
export type Interval = [number, number];
export interface ShiftWindow extends ShiftDuration {date:string;earliestStart:number;latestStart:number;end:number;source:'selected'|'previous'}
export interface WindowResult {intervals:Interval[];warning:string;details:ShiftWindow[]}
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Ongeldige Work Plan-gegevens');
  return value as Record<string, unknown>;
};
const minutes = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw Error('Ongeldige minuten in Work Plan');
  return value;
};
export function workPlanHours(value: unknown): {min: number; max: number} | null {
  try {
    const plan=record(value);
    if(plan.flexibleWeeklyPaidTime!==undefined&&typeof plan.flexibleWeeklyPaidTime!=='boolean')return null;
    if(plan.constrainWeeklyPaidTime===false)return null;
    if (plan.flexibleWeeklyPaidTime === true) {
      const min=minutes(plan.weeklyMinimumPaidMinutes), max=minutes(plan.weeklyMaximumPaidMinutes);
      return max >= min ? {min:min/60,max:max/60} : null;
    }
    const exact=minutes(plan.weeklyExactPaidMinutes);
    return {min:exact/60,max:exact/60};
  } catch { return null; }
}
export function unionIntervals(intervals: Interval[]): Interval[] {
  const sorted=intervals.filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a).sort((a,b)=>a[0]-b[0]);
  const result: Interval[]=[];
  for(const [a,b] of sorted){const last=result.at(-1);if(last&&a<=last[1])last[1]=Math.max(last[1],b);else result.push([a,b]);}
  return result;
}
export function intervalHours(intervals: Interval[]): number {return intervals.reduce((sum,[a,b])=>sum+(b-a)/3600000,0);}
export function intersectionHours(allowed: Interval[], blocked: Interval[]): number {
  let sum=0,i=0,j=0;
  while(i<allowed.length&&j<blocked.length){const a=allowed[i],b=blocked[j];sum+=Math.max(0,Math.min(a[1],b[1])-Math.max(a[0],b[0]));if(a[1]<b[1])i++;else j++;}
  return sum/3600000;
}
export function workPlanWindows(value: unknown, week: string, next: string): WindowResult {
  return workPlanWindowsForDays(value,week,next,[-1,0,1,2,3,4,5,6]);
}
export function workPlanWindowsForDays(value: unknown, week: string, next: string, offsets: number[]): WindowResult {
  const plan=record(value);
  if(!Array.isArray(plan.shifts)||!plan.shifts.length)throw Error('Work Plan bevat geen dienstdefinities');
  const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const result: Interval[]=[];
  const details:ShiftWindow[]=[];
  const weekStart=amsterdamToUtc(week+'T00:00'),weekEnd=amsterdamToUtc(next+'T00:00');
  for(const offset of offsets) {
    const day=new Date(week+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+offset);
    const date=day.toISOString().slice(0,10),dayName=dayNames[day.getUTCDay()];
    for(const [index,raw] of plan.shifts.entries()) {
      const shift=record(raw);
      const days=record(shift.days).values;
      if(!Array.isArray(days)||!days.every(x=>typeof x==='string'&&dayNames.includes(x)))throw Error('Ongeldige dagen in dienstdefinitie');
      if(!days.includes(dayName))continue;
      let duration:ShiftDuration;
      try{duration=totalShiftDuration(shift);}catch(error){throw Error(`Dienst ${index+1}: ${error instanceof Error?error.message:'Ongeldige dienstduur.'}`);}
      const flexible=flexibleMode(shift,'flexibleStartTime','exactStartTimeMinutesFromMidnight',['earliestStartTimeMinutesFromMidnight','latestStartTimeMinutesFromMidnight']);
      const earliest=shiftMinutes(flexible?shift.earliestStartTimeMinutesFromMidnight:shift.exactStartTimeMinutesFromMidnight,flexible?'earliestStartTimeMinutesFromMidnight':'exactStartTimeMinutesFromMidnight');
      const latest=shiftMinutes(flexible?shift.latestStartTimeMinutesFromMidnight:shift.exactStartTimeMinutesFromMidnight,flexible?'latestStartTimeMinutesFromMidnight':'exactStartTimeMinutesFromMidnight');
      if(earliest>=1440||latest>=1440||latest<earliest)throw Error(`Dienst ${index+1}: ongeldige starttijdgrenzen.`);
      const wallTime=(m: number)=>date+'T'+String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
      const start=amsterdamToUtc(wallTime(earliest));
      const latestStart=amsterdamToUtc(wallTime(latest));
      const finish=latestStart+duration.totalMinutes*60000;
      const clipped:Interval=[Math.max(start,weekStart),Math.min(finish,weekEnd)];
      if(clipped[1]>clipped[0]){result.push(clipped);details.push({...duration,date,earliestStart:start,latestStart,end:finish,source:offset<0?'previous':'selected'});}
    }
  }
  const intervals=unionIntervals(result);
  return {intervals,warning:intervals.length?'':'Geen mogelijke diensten in deze week',details};
}
