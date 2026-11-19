import { amsterdamToUtc, localParts } from './time';
import { intervalHours, intersectionHours, unionIntervals, workPlanHours } from './capacity';

export type Interval = [number, number];
export interface CandidateShift { date: string; name: string; start: number; end: number; paidMinutes: number; activities: {start:number;end:number;paid:boolean}[] }
export type PlanningStatus = 'Planbaar' | 'Beperkt planbaar' | 'Niet planbaar' | 'Niet vast te stellen';
export interface PlanningResult {
  status: PlanningStatus; rules:string[]; reasons: string[]; contract: {min:number;max:number} | null; maxDays: number | null;
  windowHours: number | null; blockedHours: number | null; maxHours: number | null; coverage: number | null;
  flexibility: {label:'Laag'|'Gemiddeld'|'Hoog'|'Niet vast te stellen'; explanation:string};
  windows: Interval[]; unavailable: Interval[]; candidates: CandidateShift[]; example: CandidateShift[];
  possibleDays: number; arrangements: number | null; week: string;
}
const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const minute = 60000;
const dutchDays=['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
const clock=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const MAX_CANDIDATES = 20000, MAX_TRANSITIONS = 500000, MAX_STATES = 20000, COUNT_CAP = 10000;
const object = (value:unknown): Record<string,unknown> => {
  if(!value || typeof value !== 'object' || Array.isArray(value))throw Error('Work Plan-gegevens ontbreken of zijn ongeldig.');
  return value as Record<string,unknown>;
};
const number = (value:unknown, name:string, max=10080):number => {
  if(typeof value !== 'number'||!Number.isSafeInteger(value)||value<0||value>max)throw Error(`${name} ontbreekt of is ongeldig.`);
  return value;
};
const dayValues = (value:unknown):string[] => {
  const values=object(value).values;
  if(!Array.isArray(values)||!values.every(x=>typeof x==='string'&&days.includes(x)))throw Error('Toegestane werkdagen zijn ongeldig.');
  return values;
};
function checkFields(value:Record<string,unknown>, supported:string[], ignored:string[], scope:string) {
  for(const [key,entry] of Object.entries(value)) if(!supported.includes(key)&&!ignored.includes(key)&&entry!==undefined&&entry!==null&&!(key.startsWith('constrain')&&entry===false))throw Error(`${scope}: regel '${key}' wordt nog niet volledig ondersteund.`);
}
const planFields=['flexibleWeeklyPaidTime','constrainWeeklyPaidTime','weeklyExactPaidMinutes','weeklyMinimumPaidMinutes','weeklyMaximumPaidMinutes','maximumDays','minimumWorkingDaysPerWeek','optionalDays','shifts','constrainPaidTimeGranularity','paidTimeGranularityMinutes'];
const planMetadata=['id','name','description','selfUri','metadata','agents','agentCount','version','enabled','valid'];
const shiftFields=['days','flexibleStartTime','exactStartTimeMinutesFromMidnight','earliestStartTimeMinutesFromMidnight','latestStartTimeMinutesFromMidnight','startIncrementMinutes','flexiblePaidTime','exactPaidTimeMinutes','minimumPaidTimeMinutes','maximumPaidTimeMinutes','activities'];
const shiftMetadata=['id','name','validationId'];
const activityFields=['lengthMinutes','countsAsPaidTime','startTimeIsRelativeToShiftStart','flexibleStartTime','exactStartTimeMinutes','countsAsContiguousWorkTime'];
const activityMetadata=['id','description','activityCodeId','validationId'];
const addDate = (date:string, count:number):string => {const day=new Date(date+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+count);return day.toISOString().slice(0,10);};
const wall = (date:string, m:number):number => {const day=new Date(date+'T00:00:00Z');day.setUTCMinutes(m);return amsterdamToUtc(day.toISOString().slice(0,16));};
const overlaps = (a:Interval,b:Interval):boolean => a[0]<b[1]&&b[0]<a[1];
export function unknownPlanning(week:string, reason:string):PlanningResult {
  return {status:'Niet vast te stellen',rules:[],reasons:[reason],contract:null,maxDays:null,windowHours:null,blockedHours:null,maxHours:null,coverage:null,flexibility:{label:'Niet vast te stellen',explanation:reason},windows:[],unavailable:[],candidates:[],example:[],possibleDays:0,arrangements:null,week};
}

/** Exact enumeration for the supported, explicit single-week Work Plan rules.
 * No sampling or shortened fixed shifts. A resource limit invalidates the result.
 */
export function calculatePlannability(value:unknown, week:string, unavailable:Interval[], boundary?:{previousPlan:unknown}):PlanningResult {
  const result=unknownPlanning(week,'');result.reasons=[];
  try {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(week)||new Date(week+'T12:00:00Z').getUTCDay()!==1)throw Error('Selecteer een geldige maandag.');
    const weekStart=amsterdamToUtc(week+'T00:00'), weekEnd=amsterdamToUtc(addDate(week,7)+'T00:00');
    if(!Array.isArray(unavailable)||unavailable.some(x=>!Array.isArray(x)||x.length!==2||!x.every(Number.isFinite)||x[1]<=x[0]))throw Error('Unavailable Times ontbreken of zijn ongeldig.');
    // Retain full spans for conflicts; clip only the descriptive weekly overlap.
    result.unavailable=unionIntervals(unavailable);
    const plan=object(value);
    result.contract=workPlanHours(plan);if(!result.contract)throw Error('Betaalde contracturen ontbreken of zijn ongeldig.');
    result.maxDays=number(plan.maximumDays,'Maximum werkdagen',7);
    checkFields(plan,planFields,planMetadata,'Work Plan');
    if(plan.enabled===false||plan.valid===false)throw Error('Het Work Plan is uitgeschakeld of ongeldig.');
    if(plan.constrainWeeklyPaidTime===false)throw Error('De betaalde weekuren zijn niet als contractbeperking ingeschakeld.');
    for(const field of ['enabled','valid','flexibleWeeklyPaidTime','constrainWeeklyPaidTime','constrainPaidTimeGranularity']) if(plan[field]!==undefined&&typeof plan[field]!=='boolean')throw Error(`Ongeldige schakelaar '${field}'.`);
    if(!Number.isSafeInteger(result.contract.min*60)||!Number.isSafeInteger(result.contract.max*60))throw Error('Contracturen moeten uit gehele minuten bestaan.');
    const minDays=plan.minimumWorkingDaysPerWeek===undefined?0:number(plan.minimumWorkingDaysPerWeek,'Minimum werkdagen',7);
    if(minDays>result.maxDays)throw Error('Minimum werkdagen is groter dan maximum werkdagen.');
    const granular=plan.constrainPaidTimeGranularity===true?number(plan.paidTimeGranularityMinutes,'Betaalde-tijdgranulariteit',1440):1;
    if(granular===0)throw Error('Betaalde-tijdgranulariteit moet positief zijn.');
    if(!Array.isArray(plan.shifts)||!plan.shifts.length)throw Error('Dienstdefinities ontbreken.');
    const optional=plan.optionalDays===undefined?null:new Set(dayValues(plan.optionalDays));
    const applicable=new Set<string>();
    const byDay:CandidateShift[][]=Array.from({length:7},()=>[]);
    const windows:Interval[]=[];let generated=0;let crossingBoundary=false;
    const unique=new Set<string>();
    for(const raw of plan.shifts) {
      const shift=object(raw);checkFields(shift,shiftFields,shiftMetadata,'Dienst');
      for(const field of ['flexibleStartTime','flexiblePaidTime'])if(shift[field]!==undefined&&typeof shift[field]!=='boolean')throw Error(`Ongeldige schakelaar '${field}'.`);
      const allowed=dayValues(shift.days);allowed.forEach(day=>applicable.add(day));
      const earliest=number(shift.flexibleStartTime===true?shift.earliestStartTimeMinutesFromMidnight:shift.exactStartTimeMinutesFromMidnight,'Vroegste start',1439);
      const latest=number(shift.flexibleStartTime===true?shift.latestStartTimeMinutesFromMidnight:shift.exactStartTimeMinutesFromMidnight,'Laatste start',1439);
      const increment=shift.flexibleStartTime===true?number(shift.startIncrementMinutes,'Startstap',1440):1;
      const minPaid=number(shift.flexiblePaidTime===true?shift.minimumPaidTimeMinutes:shift.exactPaidTimeMinutes,'Minimum betaalde dienstminuten',1440);
      const maxPaid=number(shift.flexiblePaidTime===true?shift.maximumPaidTimeMinutes:shift.exactPaidTimeMinutes,'Maximum betaalde dienstminuten',1440);
      if(!increment||!minPaid||latest<earliest||maxPaid<minPaid)throw Error('Start- of dienstduurgrenzen zijn ongeldig.');
      if(shift.activities!==undefined&&!Array.isArray(shift.activities))throw Error('Dienstactiviteiten zijn ongeldig.');
      const activities=(Array.isArray(shift.activities)?shift.activities:[]).map(rawActivity=>{
        const activity=object(rawActivity);checkFields(activity,activityFields,activityMetadata,'Dienstactiviteit');
        for(const field of ['flexibleStartTime','countsAsContiguousWorkTime'])if(activity[field]!==undefined&&typeof activity[field]!=='boolean')throw Error(`Ongeldige activiteitschakelaar '${field}'.`);
        if(typeof activity.countsAsPaidTime!=='boolean')throw Error('Betaald/onbetaald ontbreekt bij een activiteit.');
        if(activity.flexibleStartTime===true)throw Error('Flexibele pauze-/activiteitplaatsing wordt nog niet volledig ondersteund.');
        if(typeof activity.startTimeIsRelativeToShiftStart!=='boolean')throw Error('De tijdreferentie van een activiteit ontbreekt.');
        const length=number(activity.lengthMinutes,'Activiteitsduur',1440);
        const offset=number(activity.exactStartTimeMinutes,'Activiteitsstart',2880);
        if(!length)throw Error('Activiteitsduur moet positief zijn.');
        return {length,offset,relative:activity.startTimeIsRelativeToShiftStart,paid:activity.countsAsPaidTime};
      });
      result.rules.push(`${allowed.map(day=>dutchDays[days.indexOf(day)]).join(', ')}: start ${clock(earliest)}–${clock(latest)}, stap ${increment} min; betaald ${minPaid/60}–${maxPaid/60} uur; ${activities.length} vaste activiteiten.`);
      const unpaid=activities.filter(a=>!a.paid).reduce((sum,a)=>sum+a.length,0);
      for(let day=0;day<7;day++) {
        const date=addDate(week,day);if(!allowed.includes(days[new Date(date+'T12:00:00Z').getUTCDay()]))continue;
        for(let startMinute=earliest;startMinute<=latest;startMinute+=increment) {
          const start=wall(date,startMinute);
          for(let paid=minPaid;paid<=maxPaid;paid++) {
            if(paid%granular!==0)continue;
            if(++generated>MAX_CANDIDATES)throw Error('Te veel mogelijke diensten voor een volledige berekening; geen benadering getoond.');
            const end=start+(paid+unpaid)*minute;
            if(end-start>24*60*minute)throw Error('Diensten langer dan 24 uur vereisen aanvullende week-/dagregels.');
            const placed=activities.map(a=>{const at=a.relative?start+a.offset*minute:wall(date,a.offset);return {start:at,end:at+a.length*minute,paid:a.paid};}).sort((a,b)=>a.start-b.start);
            if(placed.some((a,i)=>a.start<start||a.end>end||(i>0&&a.start<placed[i-1].end)))continue;
            // Invalid activity layouts must not produce an envelope or valid shift.
            windows.push([Math.max(start,weekStart),Math.min(end,weekEnd)]);
            if(end>weekEnd){crossingBoundary=true;continue;}
            if(result.unavailable.some(block=>overlaps([start,end],block)))continue;
            const key=[date,start,end,paid].join('|');if(unique.has(key))continue;unique.add(key);
            byDay[day].push({date,name:typeof shift.name==='string'?shift.name:'Dienst',start,end,paidMinutes:paid,activities:placed});
          }
        }
      }
    }
    result.windows=unionIntervals(windows);result.windowHours=intervalHours(result.windows);
    result.blockedHours=intersectionHours(result.windows,result.unavailable);
    result.candidates=byDay.flat();result.possibleDays=byDay.filter(day=>day.length).length;
    if(crossingBoundary)throw Error('Een mogelijke dienst loopt over de weekgrens. Toewijzing en diensten van de aangrenzende week zijn nodig; betaalde uren worden niet gedeeltelijk meegeteld.');
    if(!boundary)throw Error('Work Plan-context van de vorige week ontbreekt; inkomende nachtdiensten zijn niet uit te sluiten.');
    checkPreviousWeek(boundary.previousPlan,week);
    if(!optional)throw Error('Optionele/verplichte werkdagen ontbreken; een volledige dienstcombinatie is niet te bewijzen.');
    const requiredDays=new Set<number>();
    if(optional)for(let d=0;d<7;d++){const name=days[new Date(addDate(week,d)+'T12:00:00Z').getUTCDay()];if(applicable.has(name)&&!optional.has(name))requiredDays.add(d);}
    const solved=solve(byDay,result.maxDays,minDays,requiredDays,Math.round(result.contract.max*60),Math.round(result.contract.min*60));
    result.maxHours=solved.maximum/60;
    result.coverage=result.contract.min===0?null:Math.min(100,result.maxHours/result.contract.min*100);
    result.example=solved.example;result.arrangements=solved.arrangements;
    result.status=solved.arrangements>0?'Planbaar':solved.maximum>0?'Beperkt planbaar':'Niet planbaar';
    if(!solved.arrangements)result.reasons.push(`Geen volledige combinatie haalt ${result.contract.min} uur. Maximaal ${result.maxDays} werkdagen en ${result.candidates.length} afzonderlijk geldige diensten leveren maximaal ${result.maxHours} betaalde uren op; vaste diensten worden niet ingekort.`);
    if(result.possibleDays<requiredDays.size||result.possibleDays<minDays)result.reasons.push('Te weinig geldige werkdagen na aftrek van onbeschikbaarheid.');
    const daySlack=Math.max(0,result.possibleDays-result.example.length);
    const starts=new Set(result.candidates.map(c=>localParts(c.start).minute)).size;
    const score=Number(daySlack>=1)+Number(daySlack>=2)+Number(starts>=2)+Number(starts>=5)+Number(solved.arrangements>=2)+Number(solved.arrangements>=10);
    result.flexibility={label:solved.arrangements===0?'Laag':score>=5?'Hoog':score>=2?'Gemiddeld':'Laag',explanation:`${result.possibleDays} mogelijke werkdagen; maximaal ${result.maxDays} werkdagen; ${starts} verschillende lokale starttijden; ${solved.arrangements>=COUNT_CAP?'minstens '+COUNT_CAP:solved.arrangements} geldige contractindelingen na Unavailable Times. Score ${score}/6: dagruimte (≥1/≥2), starts (≥2/≥5) en indelingen (≥2/≥10), ieder één punt. Alleen complete contractindelingen tellen.`};
    return result;
  } catch(error) {
    const reason=error instanceof Error?error.message:'Onbekende Work Plan-regels.';
    return {...result,status:'Niet vast te stellen',reasons:[reason],maxHours:null,coverage:null,example:[],arrangements:null,flexibility:{label:'Niet vast te stellen',explanation:reason}};
  }
}
interface State { paid:number; count:number; end:number; ways:number; example:CandidateShift[] }
function solve(byDay:CandidateShift[][], maxDays:number, minDays:number, required:Set<number>, maximum:number, minimum:number) {
  let states:State[]=[{paid:0,count:0,end:0,ways:1,example:[]}];let transitions=0;
  for(let day=0;day<7;day++) {
    const next=new Map<string,State>();
    const future=byDay.slice(day+1).flat();const futureStart=future.length?Math.min(...future.map(c=>c.start)):Infinity;
    const put=(state:State)=>{
      // Endpoints before all future starts have identical future compatibility.
      const end=state.end<=futureStart?0:state.end;
      const key=[state.paid,state.count,end].join('|'),existing=next.get(key);
      if(existing)existing.ways=Math.min(COUNT_CAP,existing.ways+state.ways);
      else next.set(key,{...state,end});
      if(next.size>MAX_STATES)throw Error('Te veel dienstcombinaties voor een volledige berekening.');
    };
    for(const state of states) {
      if(!required.has(day))put(state);
      if(state.count===maxDays)continue;
      for(const candidate of byDay[day]) {
        if(++transitions>MAX_TRANSITIONS)throw Error('De zoeklimiet voor geldige dienstcombinaties is bereikt.');
        if(candidate.start<state.end||state.paid+candidate.paidMinutes>maximum)continue;
        put({paid:state.paid+candidate.paidMinutes,count:state.count+1,end:candidate.end,ways:state.ways,example:[...state.example,candidate]});
      }
    }
    states=[...next.values()];
  }
  const valid=states.filter(s=>s.count>=minDays);
  const complete=valid.filter(s=>s.paid>=minimum);
  const best=[...valid].sort((a,b)=>b.paid-a.paid)[0];
  const example=[...complete].sort((a,b)=>a.paid-b.paid||a.count-b.count)[0]??best;
  return {maximum:best?.paid??0,example:example?.example??[],arrangements:Math.min(COUNT_CAP,complete.reduce((sum,s)=>sum+s.ways,0))};
}

function checkPreviousWeek(value:unknown,week:string):void {
  const previous=object(value);
  checkFields(previous,planFields,planMetadata,'Vorige Work Plan');
  if(!Array.isArray(previous.shifts))throw Error('Dienstdefinities van de vorige week ontbreken.');
  const sunday=addDate(week,-1),weekStart=amsterdamToUtc(week+'T00:00');
  for(const raw of previous.shifts){
    const shift=object(raw);checkFields(shift,shiftFields,shiftMetadata,'Vorige dienst');
    if(!dayValues(shift.days).includes('Sunday'))continue;
    const latest=number(shift.flexibleStartTime===true?shift.latestStartTimeMinutesFromMidnight:shift.exactStartTimeMinutesFromMidnight,'Vorige dienststart',1439);
    const paid=number(shift.flexiblePaidTime===true?shift.maximumPaidTimeMinutes:shift.exactPaidTimeMinutes,'Vorige dienstduur',1440);
    if(shift.activities!==undefined&&!Array.isArray(shift.activities))throw Error('Vorige dienstactiviteiten zijn onbekend.');
    let unpaid=0;
    for(const rawActivity of Array.isArray(shift.activities)?shift.activities:[]){
      const activity=object(rawActivity);
      if(typeof activity.countsAsPaidTime!=='boolean')throw Error('Betaald/onbetaald van een vorige dienstactiviteit ontbreekt.');
      if(!activity.countsAsPaidTime)unpaid+=number(activity.lengthMinutes,'Vorige activiteitduur',1440);
    }
    if(wall(sunday,latest)+(paid+unpaid)*minute>weekStart)throw Error('Een mogelijke dienst uit de vorige week loopt deze week in. Zonder weekoverstijgende dienstindeling is planbaarheid niet vast te stellen.');
  }
}
