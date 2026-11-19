import { describe,expect,it } from 'vitest';
import { calculatePlannability, type Interval } from '../src/domain/plannability';
import { amsterdamToUtc } from '../src/domain/time';
const week='2026-11-09';
const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday'];
const fixed=(days=weekdays.slice(0,3),paid=480,start=540)=>({days:{values:days},exactStartTimeMinutesFromMidnight:start,exactPaidTimeMinutes:paid});
const plan=(hours=24,shifts:unknown[]=[fixed()],maximumDays=3)=>({weeklyExactPaidMinutes:hours*60,maximumDays,optionalDays:{values:weekdays.concat('Saturday','Sunday')},shifts});
const blocked=(date:string,from:string,to:string):Interval=>[amsterdamToUtc(`${date}T${from}`),amsterdamToUtc(`${date}T${to}`)];
const solve=(value:unknown,unavailable:Interval[]=[])=>calculatePlannability(value,week,unavailable,{previousPlan:value});
describe('geldige dienstcombinaties',()=>{
  it('plant 24 contracturen met drie vaste diensten van acht uur',()=>{
    const result=solve(plan());expect(result.status).toBe('Planbaar');expect(result.maxHours).toBe(24);expect(result.coverage).toBe(100);expect(result.example).toHaveLength(3);expect(result.flexibility.label).toBe('Laag');
  });
  it('plant over vijf flexibele dagen met maximaal drie werkdagen, zonder overcapaciteit',()=>{
    const shift={...fixed(weekdays),flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:480,latestStartTimeMinutesFromMidnight:780,startIncrementMinutes:60};
    const result=solve(plan(24,[shift],3));expect(result.windowHours).toBe(65);expect(result.maxHours).toBe(24);expect(result.coverage).toBe(100);expect(result.example).toHaveLength(3);expect(result.flexibility.label).toBe('Hoog');expect(result.arrangements).toBe(2160);
  });
  it('plant 36 uur in vier diensten van negen uur',()=>{
    const result=solve(plan(36,[fixed(weekdays.slice(0,4),540)],4));expect(result.maxHours).toBe(36);expect(result.coverage).toBe(100);
  });
  it('blokkeert een volledige werkdag',()=>{
    const result=solve(plan(),[blocked(week,'00:00','23:59')]);expect(result.maxHours).toBe(16);expect(result.coverage).toBeCloseTo(66.6667);expect(result.status).toBe('Beperkt planbaar');
  });
  it('kort een vaste dienst bij gedeeltelijke overlap nooit in',()=>{
    const result=solve(plan(),[blocked(week,'12:00','13:00')]);expect(result.blockedHours).toBe(1);expect(result.maxHours).toBe(16);expect(result.candidates.every(c=>c.paidMinutes===480)).toBe(true);
  });
  it('ondersteunt nachtdiensten binnen de week en voorkomt overlap',()=>{
    const result=solve(plan(16,[fixed(['Monday','Tuesday'],480,1320),fixed(['Tuesday'],480,120)],2));
    expect(result.status).toBe('Planbaar');expect(result.maxHours).toBe(16);
    for(let i=1;i<result.example.length;i++)expect(result.example[i].start).toBeGreaterThanOrEqual(result.example[i-1].end);
    expect(result.example[0].end-result.example[0].start).toBe(8*3600000);
  });
  it('onderscheidt vereist minimum van toegestaan maximum bij flexibele weekuren',()=>{
    const value={...plan(24,[fixed(weekdays.slice(0,4))],4),flexibleWeeklyPaidTime:true,weeklyMinimumPaidMinutes:24*60,weeklyMaximumPaidMinutes:32*60};
    const result=solve(value);expect(result.contract).toEqual({min:24,max:32});expect(result.maxHours).toBe(32);expect(result.coverage).toBe(100);expect(result.example.reduce((sum,s)=>sum+s.paidMinutes,0)).toBe(24*60);
  });
  it('ziet genoeg vensteruren maar geen volledige diensten als niet planbaar',()=>{
    const shift={...fixed(weekdays),flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:480,latestStartTimeMinutesFromMidnight:720,startIncrementMinutes:60};
    const unavailable=weekdays.map((_,i)=>blocked('2026-11-'+String(9+i).padStart(2,'0'),'12:00','13:00'));
    const result=solve(plan(24,[shift]),unavailable);expect((result.windowHours??0)-(result.blockedHours??0)).toBeGreaterThan(24);expect(result.maxHours).toBe(0);expect(result.status).toBe('Niet planbaar');
  });
  it('verenigt overlappende Unavailable Times',()=>{
    const result=solve(plan(),[blocked(week,'11:00','13:00'),blocked(week,'12:00','14:00')]);expect(result.blockedHours).toBe(3);expect(result.maxHours).toBe(16);expect(result.unavailable).toHaveLength(1);
  });
  it('ondersteunt minimum- en maximumdienstduur zonder vaste diensten te verkorten',()=>{
    const shift={...fixed(['Monday']),flexiblePaidTime:true,minimumPaidTimeMinutes:240,maximumPaidTimeMinutes:480};
    const result=solve(plan(6,[shift],1),[blocked(week,'15:00','17:00')]);expect(result.maxHours).toBe(6);expect(result.example[0].paidMinutes).toBe(360);
    const short=solve(plan(3,[shift],1));expect(short.maxHours).toBe(0);expect(short.status).toBe('Niet planbaar');
  });
  it('telt een vaste onbetaalde pauze niet als betaald en toetst de volledige dienst',()=>{
    const shift={...fixed(['Monday']),activities:[{lengthMinutes:30,countsAsPaidTime:false,startTimeIsRelativeToShiftStart:true,exactStartTimeMinutes:240}]};
    const result=solve(plan(8,[shift],1));expect(result.maxHours).toBe(8);expect(result.windowHours).toBe(8.5);expect(result.example[0].activities).toHaveLength(1);
    expect(solve(plan(8,[shift],1),[blocked(week,'13:00','13:15')]).maxHours).toBe(0);
  });
  it('respecteert optionele/verplichte dagen en minimum werkdagen',()=>{
    const value={...plan(),optionalDays:{values:['Tuesday','Wednesday']},minimumWorkingDaysPerWeek:3};
    expect(solve(value).maxHours).toBe(24);expect(solve(value,[blocked(week,'09:00','17:00')]).status).toBe('Niet planbaar');
  });
  it('past startstappen en betaalde-tijdgranulariteit toe',()=>{
    const shift={...fixed(['Monday'],240),flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:480,latestStartTimeMinutesFromMidnight:540,startIncrementMinutes:30,flexiblePaidTime:true,minimumPaidTimeMinutes:240,maximumPaidTimeMinutes:300};
    const result=solve({...plan(5,[shift],1),constrainPaidTimeGranularity:true,paidTimeGranularityMinutes:60});expect(result.candidates).toHaveLength(6);expect(result.maxHours).toBe(5);
  });
});
describe('expliciete onzekerheid',()=>{
  it('stelt grensoverschrijdende diensten niet gelijk aan gedeeltelijke weekuren',()=>{
    const result=solve(plan(8,[fixed(['Sunday'],480,1320)],1));expect(result.status).toBe('Niet vast te stellen');expect(result.coverage).toBeNull();expect(result.reasons.join()).toContain('weekgrens');
  });
  it.each([{constrainMaximumConsecutiveWorkingWeekends:true},{minimumShiftStartDistanceMinutes:600},{minimumConsecutiveNonWorkingMinutesPerWeek:1440},{newUnknownRestriction:0}])('weigert niet ondersteunde aanvullende regels %s',extra=>{
    const result=solve({...plan(),...extra});expect(result.status).toBe('Niet vast te stellen');expect(result.maxHours).toBeNull();
  });
  it('weigert flexibele of onvoldoende beschreven pauzes',()=>{
    const result=solve(plan(24,[{...fixed(),activities:[{countsAsPaidTime:false,lengthMinutes:30,flexibleStartTime:true}]}]));expect(result.status).toBe('Niet vast te stellen');
  });
  it('weigert ontbrekende max dagen en ongeldige onbeschikbaarheid',()=>{
    expect(solve({weeklyExactPaidMinutes:1440,shifts:[fixed()]}).status).toBe('Niet vast te stellen');expect(solve(plan(),[[NaN,Infinity]]).status).toBe('Niet vast te stellen');
  });
  it('geeft bij een zoeklimiet geen gedeeltelijke schatting',()=>{
    const shift={...fixed(weekdays),flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:0,latestStartTimeMinutesFromMidnight:1439,startIncrementMinutes:1,flexiblePaidTime:true,minimumPaidTimeMinutes:1,maximumPaidTimeMinutes:480};
    const result=solve(plan(24,[shift]));expect(result.status).toBe('Niet vast te stellen');expect(result.maxHours).toBeNull();expect(result.reasons.join()).toContain('Te veel');
  });
});

it('weigert onbekende en inkomende vorige-week-context bij een gewijzigd Work Plan',()=>{
  const current=plan();expect(calculatePlannability(current,week,[]).status).toBe('Niet vast te stellen');
  const prior=plan(8,[fixed(['Sunday'],480,1320)],1);
  const result=calculatePlannability(current,week,[],{previousPlan:prior});expect(result.status).toBe('Niet vast te stellen');expect(result.reasons.join()).toContain('vorige week');
});
it('voorkomt de oorspronkelijke 166,7%-fout bij 24 contracturen en 50 vensteruren',()=>{
  const shift={...fixed(weekdays),flexibleStartTime:true,earliestStartTimeMinutesFromMidnight:480,latestStartTimeMinutesFromMidnight:600,startIncrementMinutes:60};
  const result=solve(plan(24,[shift],3));expect(result.windowHours).toBe(50);expect(result.maxHours).toBe(24);expect(result.coverage).toBe(100);
});
it('komt voor kleine combinaties overeen met onafhankelijke volledige enumeratie',()=>{
  for(let target=1;target<=4;target++){
    const shifts=[fixed(['Monday','Tuesday'],120,1380),fixed(['Tuesday','Wednesday'],60,0),fixed(['Monday','Wednesday'],120,540)];
    const value=plan(target,shifts,2);const result=solve(value);
    expect(result.status).not.toBe('Niet vast te stellen');
    let best=0,arrangements=0;
    const choices=['2026-11-09','2026-11-10','2026-11-11'].map(date=>result.candidates.filter(c=>c.date===date));
    for(const a of [null,...choices[0]])for(const b of [null,...choices[1]])for(const c of [null,...choices[2]]){
      const selected=[a,b,c].filter(s=>s!==null).sort((a,b)=>a.start-b.start);
      const paid=selected.reduce((sum,s)=>sum+s.paidMinutes,0);
      if(selected.length>2||paid>target*60||selected.some((s,i)=>i>0&&s.start<selected[i-1].end))continue;
      best=Math.max(best,paid);if(paid>=target*60)arrangements++;
    }
    expect(result.maxHours).toBe(best/60);expect(result.arrangements).toBe(arrangements);
  }
});
it('interpreteert ongeldige booleans en ontbrekende dagverplichtingen niet als defaults',()=>{
  expect(solve({...plan(),flexibleWeeklyPaidTime:'false'}).status).toBe('Niet vast te stellen');
  const {optionalDays,...incomplete}=plan();expect(solve(incomplete).status).toBe('Niet vast te stellen');
  const shift={...fixed(),activities:[{countsAsPaidTime:false,lengthMinutes:30,startTimeIsRelativeToShiftStart:true,exactStartTimeMinutes:240,flexibleStartTime:'false'}]};
  expect(solve(plan(24,[shift])).status).toBe('Niet vast te stellen');
});
