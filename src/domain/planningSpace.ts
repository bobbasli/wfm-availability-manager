import { intervalHours, intersectionHours, unionIntervals, workPlanHours, workPlanWindowsForDays, type Interval } from './capacity';
export interface PlanningSpace {
  paid:{min:number;max:number}|null;
  windowHours:number|null;
  blockedHours:number|null;
  spaceHours:number|null;
  reason:string|null;
}
export type SpaceStatus = 'green'|'orange'|'red'|'unknown';
export interface SpaceBoundary {paidHours:number;requiredHours:number|null;percentage:number|null;status:SpaceStatus;description:string}
export interface SpaceAssessment {minimum:SpaceBoundary|null;maximum:SpaceBoundary|null;reason:string|null}
export function unknownSpace(reason:string):PlanningSpace {
  return {paid:null,windowHours:null,blockedHours:null,spaceHours:null,reason};
}
export function validMargin(value:unknown):value is number {
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
}
/** A union of potential time windows, not a proof of valid shift combinations. */
export function calculatePlanningSpace(plan:unknown, week:string, unavailable:Interval[], previousPlan:unknown):PlanningSpace {
  const result=unknownSpace('');
  try {
    result.paid=workPlanHours(plan);
    if(!result.paid)result.reason='Betaalde weekuren ontbreken of zijn ongeldig.';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(week))throw Error('Ongeldige weekdatum.');
    const next=new Date(week+'T12:00:00Z');
    if(!Number.isFinite(+next)||next.toISOString().slice(0,10)!==week||next.getUTCDay()!==1)throw Error('Selecteer een geldige maandag.');
    next.setUTCDate(next.getUTCDate()+7);const end=next.toISOString().slice(0,10);
    if(unavailable.some(span=>span.length!==2||!span.every(Number.isFinite)||span[1]<=span[0]))throw Error('Ongeldige Unavailable Times.');
    // Only the previous week's plan may supply the incoming Sunday windows.
    const current=workPlanWindowsForDays(plan,week,end,[0,1,2,3,4,5,6]);
    const incoming=workPlanWindowsForDays(previousPlan,week,end,[-1]);
    const windows=unionIntervals([...current.intervals,...incoming.intervals]);
    const blocked=unionIntervals(unavailable);
    result.windowHours=intervalHours(windows);
    result.blockedHours=intersectionHours(windows,blocked);
    result.spaceHours=Math.max(0,result.windowHours-result.blockedHours);
    if(result.paid)result.reason=null;
  }catch(error){result.reason=error instanceof Error?error.message:'Inzetvensters konden niet worden bepaald.';}
  return result;
}
function boundary(space:PlanningSpace,paidHours:number,margin:number):SpaceBoundary {
  const requiredHours=paidHours*(1+margin/100);
  if(space.reason||space.spaceHours===null||!Number.isFinite(requiredHours)||requiredHours<=0){
    return {paidHours,requiredHours:null,percentage:null,status:'unknown',description:space.reason??'Benodigde ruimte is nul uur; geen percentage berekend.'};
  }
  const raw=space.spaceHours/requiredHours*100;
  const percentage=Math.abs(raw-100)<1e-9?100:raw;
  if(!Number.isFinite(percentage))return {paidHours,requiredHours:null,percentage:null,status:'unknown',description:'Percentage kan niet betrouwbaar worden bepaald.'};
  const status:SpaceStatus=space.spaceHours+1e-9>=requiredHours?'green':space.spaceHours+1e-9>=paidHours?'orange':'red';
  const description=status==='green'?'Voldoende planningsruimte, inclusief marge.':status==='orange'?'Beperkte planningsruimte: voldoende voor de betaalde uren, maar onvoldoende marge.':'Onvoldoende planningsruimte voor de betaalde uren, ook zonder marge.';
  return {paidHours,requiredHours,percentage,status,description};
}
export function assessPlanningSpace(space:PlanningSpace,margin:unknown):SpaceAssessment {
  if(!validMargin(margin))return {minimum:null,maximum:null,reason:'Kies een planningsmarge tussen 0 en 100%.'};
  if(!space.paid)return {minimum:null,maximum:null,reason:space.reason??'Betaalde weekuren zijn onbekend.'};
  const minimum=boundary(space,space.paid.min,margin),maximum=boundary(space,space.paid.max,margin);
  return {minimum,maximum,reason:space.reason};
}
