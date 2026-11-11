import { createPkceRequest } from '../services/oauth';
import { workPlanHours, workPlanWindows, unionIntervals, intervalHours, intersectionHours } from '../domain/capacity';
import { localParts, amsterdamToUtc, localDayBounds, isPublished } from '../domain/time';
import { validateRegion } from '../services/regions';
import { ref, computed, onMounted, watch } from 'vue';
import { createGenesysApi, exchangeOAuthCode } from '../services/genesysApi';
import { queryAgentWorkPlans, createWorkPlanDetailsLoader } from '../services/workforceManagement';

const redirect = location.origin + location.pathname;
const qs = new URLSearchParams(location.search);
const iso = d => d.toISOString().slice(0,10);
const monday = new Date(localParts(Date.now()).date+'T12:00:00Z'); monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay()+6)%7);
const until = new Date(monday); until.setDate(until.getDate()+27);
const encode = encodeURIComponent;
export function useAvailabilityManager(){
    const clientId=ref(qs.get('clientId')||sessionStorage.getItem('wfm_clientId')||'');
    const region=ref(qs.get('region')||sessionStorage.getItem('wfm_region')||'mypurecloud.de');
    const storedContext=sessionStorage.getItem('wfm_auth_context');
    const token=ref(storedContext===JSON.stringify([region.value,clientId.value])?(sessionStorage.getItem('wfm_token')||''):'');
    if(!token.value)sessionStorage.removeItem('wfm_token');
    let selectionVersion=0,unavailableRequest=0,managementRequest=0,agentsRequest=0,scheduleRequest=0;
    const selectionSnapshot=()=>{const version=selectionVersion;return ()=>version===selectionVersion;};

    const identity=ref('Niet aangemeld'), businessUnits=ref([]),managementUnits=ref([]),agents=ref([]);
    const businessUnit=ref(''),managementUnit=ref(''),agentId=ref('');
    const start=ref(iso(monday)),end=ref(iso(until));
    const queryBody=ref('');
    const patchBody=ref(''),confirmed=ref(false),lastResponse=ref(null),raw=ref('Nog geen response.');
    const status=ref('Klaar.'),error=ref(false),busy=ref(false);
    // Published schedules are read-only. Never use schedule mutation endpoints.
    const scheduleData=ref(null),scheduleError=ref(''),scheduleBusy=ref(false);
    const scheduleCandidates=ref([]),selectedSchedule=ref(''),scheduleDiagnostics=ref(null);
    const scheduleState=ref('Selecteer een medewerker om het rooster op te halen.');
    // Separate weekly MU capacity view. Read-only, never changes agent availability.
    const activeTab=ref('calendar');
    const capacityWeek=ref(iso(monday));
    const capacityBusy=ref(false),capacityProgress=ref(''),capacityRows=ref([]),capacityError=ref('');
    const capacityDiagnostics=ref([]);
    watch([businessUnit,managementUnit,agentId,start,end,region,token],()=>{selectionVersion++;closeEditor();lastResponse.value=null;scheduleData.value=null;busy.value=false;scheduleBusy.value=false;}, {flush:'sync'});
    let capacityVersion=0;
    watch([businessUnit,managementUnit,capacityWeek,region,token],()=>{capacityVersion++;capacityRows.value=[];capacityProgress.value='Selectie gewijzigd; haal het overzicht opnieuw op.';}, {flush:'sync'});
    const capacityMargin=ref(Math.min(100,Math.max(0,Number(localStorage.getItem('wfm_capacity_margin')??25)||0)));
    watch(capacityMargin,v=>{capacityVersion++;capacityRows.value=[];capacityProgress.value='Marge gewijzigd; haal het overzicht opnieuw op.';if(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100)localStorage.setItem('wfm_capacity_margin',String(v));},{flush:'sync'});
    const hoursText=n=>Number.isFinite(n)?(Math.round(n*100)/100).toLocaleString('nl-NL',{maximumFractionDigits:2})+' u':'—';
    const pctText=n=>Number.isFinite(n)?(Math.round(n*10)/10).toLocaleString('nl-NL',{maximumFractionDigits:1})+'%':'—';
    function mondayDate(date){const d=new Date(date+'T12:00:00Z');if(!Number.isFinite(+d))return null;d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return iso(d);}
    function weeklyBounds(){const week=mondayDate(capacityWeek.value);if(!week)throw Error('Kies een geldige week.');const d=new Date(week+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+7);return {week,next:iso(d)};}
    function unavailableIntervals(response,week,next){
      const list=Array.isArray(response)?response:(response?.entities??response?.unavailableTimes??response?.results??response?.items);
      if(!Array.isArray(list))throw Error('Onbekende Unavailable Times-response.');
      const start=amsterdamToUtc(week+'T00:00'),end=amsterdamToUtc(next+'T00:00');
      const intervals=[];
      for(const item of list){
        const span=item?.timeSpan??item;
        const a=Date.parse(span?.startDate);let b=Date.parse(span?.endDate);
        if(!Number.isFinite(b)&&Number.isFinite(Number(span?.lengthMinutes)))b=a+Number(span.lengthMinutes)*60000;
        if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)throw Error('Ongeldig tijdvak ontvangen.');
        intervals.push([Math.max(start,a),Math.min(end,b)]);
      }
      return unionIntervals(intervals);
    }
    async function loadCapacity(){
      if(capacityBusy.value||!managementUnit.value||!businessUnit.value||!token.value)return;
      capacityBusy.value=true;capacityError.value='';capacityRows.value=[];capacityDiagnostics.value=[];
      const mu=managementUnit.value,bu=businessUnit.value;
      let operationVersion=capacityVersion;
      try{
        const {week,next}=weeklyBounds();capacityWeek.value=week;
        if(typeof capacityMargin.value!=='number'||!Number.isFinite(capacityMargin.value)||capacityMargin.value<0||capacityMargin.value>100)throw Error('Kies een marge tussen 0 en 100%.');
        const version=capacityVersion,margin=capacityMargin.value;operationVersion=version;
        const current=()=>version===capacityVersion;
        const roster=[...agents.value];if(!roster.length){capacityProgress.value='Geen medewerkers gevonden.';return;}
        capacityProgress.value='Work Plans ophalen…';
        let assignmentByAgent=new Map(),assignmentWarnings=new Map();
        try{
          const response=await queryAgentWorkPlans(api,mu,roster.map(agent=>agent.id),week);
          if(!current())return;
          assignmentByAgent=response.assignments;assignmentWarnings=response.warnings;
          if(response.warning)capacityDiagnostics.value.push(response.warning);
        }catch(e){if(!current())return;capacityDiagnostics.value.push(`Work Plan-toewijzingen: ${e.message}`);}
        const results=new Array(roster.length);let index=0;
        const detailedPlan=createWorkPlanDetailsLoader(api,mu);
        async function worker(){
          while(index<roster.length){const i=index++,agent=roster[i];
            if(!current())return;
            const row={id:agent.id,name:agent.name||agent.id,planName:'Niet vastgesteld',min:null,max:null,unavailable:null,windowHours:null,available:null,requiredMin:null,requiredMax:null,pctMin:null,pctMax:null,maxDays:null,warning:[]};
            try{
              const planId=assignmentByAgent.get(agent.id);
              if(planId){const detailPlan=await detailedPlan(planId);const hours=workPlanHours(detailPlan);row.planName=detailPlan.name||'Work Plan';row.maxDays=detailPlan.maximumDays??null;if(hours){row.min=hours.min;row.max=hours.max;}else row.warning.push('Werkuren ontbreken in Work Plan');const windows=workPlanWindows(detailPlan,week,next);row._windows=windows.intervals;row.windowHours=intervalHours(windows.intervals);if(windows.warning)row.warning.push(windows.warning);}
              else row.warning.push(assignmentWarnings.get(agent.id)||'Geen geldige Work Plan-toewijzing voor deze medewerker en week.');
            }catch(e){row.warning.push('Work Plan: '+e.message);}
            try{
              // Include offset padding for time spans that overlap a local week boundary.
              const from=new Date(week+'T00:00:00Z');from.setUTCDate(from.getUTCDate()-1);
              const to=new Date(next+'T00:00:00Z');to.setUTCDate(to.getUTCDate()+1);
              const response=await api(`/api/v2/workforcemanagement/agents/${encode(agent.id)}/unavailabletimes/query`,'POST',{startDate:from.toISOString(),endDate:to.toISOString()});
              const unavailable=unavailableIntervals(response,week,next);row.unavailable=intervalHours(unavailable);if(row._windows){row.blockedWithinWindows=intersectionHours(row._windows,unavailable);row.available=Math.max(0,row.windowHours-row.blockedWithinWindows);}
            }catch(e){row.warning.push('Niet beschikbaar: '+e.message);}
            if(row.min!==null&&row.max!==null&&row.available!==null){
              const factor=1+margin/100;
              row.requiredMin=row.min*factor;row.requiredMax=row.max*factor;
              const coverage=required=>required>0?row.available/required*100:null;
              row.pctMin=coverage(row.requiredMax);row.pctMax=coverage(row.requiredMin);
            }
            delete row._windows;
            if(!current())return;
            results[i]=row;capacityRows.value=results.filter(Boolean);capacityProgress.value=`${capacityRows.value.length} van ${roster.length} medewerkers verwerkt`;
          }
        }
        await Promise.all(Array.from({length:Math.min(4,roster.length)},()=>worker()));
        if(!current())return;
        capacityProgress.value=`${capacityRows.value.length} medewerkers geladen · week ${week}`;
      }catch(e){if(operationVersion===capacityVersion)capacityError.value=e.message;}
      finally{capacityBusy.value=false;}
    }
    const activityCodes=ref([]),activityCodeError=ref('');
    const activityCodeMap=computed(()=>new Map((Array.isArray(activityCodes.value)?activityCodes.value:[]).filter(c=>c&&typeof c==='object'&&c.id!=null).map(c=>[String(c.id),c])));
    function codeColor(code){
      const candidate=code?.style?.backgroundColor??code?.color;
      const raw=(typeof candidate==='string'?candidate:(candidate&&typeof candidate==='object'?(candidate.hex||candidate.value||candidate.code):null))||code?.hexColor||code?.colorCode||code?.backgroundColor;
      if(typeof raw!=='string')return null;
      const color=raw.trim();
      if(/^#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i.test(color))return color;
      if(/^[0-9a-f]{6}$/i.test(color))return '#'+color;
      if(/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color))return color;
      return null;
    }
    async function loadActivityCodes(){
      activityCodes.value=[];activityCodeError.value='';
      const bu=businessUnit.value,valid=selectionSnapshot();if(!bu||!token.value)return;
      try{
        const data=await api(`/api/v2/workforcemanagement/businessunits/${encode(bu)}/activitycodes`);
        if(!valid())return;
        // Activity Codes endpoints may return an array, paged entities or a keyed object.
        // Keep the Vue state strictly an array; never store the raw response in it.
        const payload=data?.result??data;
        const source=Array.isArray(payload)?payload:(payload?.entities??payload?.activityCodes??payload?.results??payload?.items??payload?.data??null);
        const items=Array.isArray(source)?source:(source&&typeof source==='object'?Object.entries(source).map(([id,value])=>value&&typeof value==='object'?{id,...value}:null):[]);
        activityCodes.value=items.filter(x=>x&&typeof x==='object'&&x.id!=null);
        if(!Array.isArray(source)&&(!source||typeof source!=='object'))activityCodeError.value='Activity Codes-response heeft een onbekende structuur; rooster blijft beschikbaar.';
      }catch(e){if(valid())activityCodeError.value=`Activity Codes konden niet worden opgehaald: ${e.message}`;}
    }
    const scheduleSegments=computed(()=>{
      const root=scheduleData.value;if(!root)return [];
      // Genesys returns completed schedule queries under result.agentSchedules.
      const payload=root.result||root;
      const candidates=Array.isArray(payload)?payload:(payload.agentSchedules||payload.entities||payload.results||payload.items||payload.schedules||[]);
      const rows=Array.isArray(candidates)?candidates:[];
      const segments=[];
      function addSpan(span,label,color=null,kind='shift'){
        if(!span)return;
        const from=span.startDate||span.startTime||span.start||span.startDateTime;
        const to=span.endDate||span.endTime||span.end||span.endDateTime;
        const t=Date.parse(from),endMs=to?Date.parse(to):t+Number(span.lengthMinutes)*60000;
        if(!Number.isFinite(t)||!Number.isFinite(endMs)||endMs<=t)return;
        // Split across Dutch midnight and DST transitions, same as unavailable times.
        let current=null;
        for(let ms=t;ms<endMs;ms+=60000){
          const loc=localParts(ms);
          if(!current||current.date!==loc.date||loc.minute!==current.lastMinute+1){
            current={date:loc.date,from:loc.minute,to:loc.minute+1,lastMinute:loc.minute,label,color,kind};segments.push(current);
          }else{current.to=loc.minute+1;current.lastMinute=loc.minute;}
        }
      }
      for(const r of rows){
        const rowAgentId=r.user?.id||r.userId||r.agent?.id||r.agentId;
        if(rowAgentId!==agentId.value)continue;
        const shiftData=r.shifts||r.shiftAssignments||r.scheduledShifts||r.shiftSegments||[];
        const shifts=Array.isArray(shiftData)?shiftData:[];
        for(const shift of shifts){
          const span=shift.timeSpan||shift;
          addSpan(span,shift.name||shift.activityCode?.name||'Roosterdienst',null,'shift');
          for(const activity of (Array.isArray(shift.activities)?shift.activities:[])){
            const code=activityCodeMap.value.get(String(activity.activityCodeId??activity.activityCode?.id??''));
            const name=code?.name||code?.description||activity.activityCode?.name||activity.description||`Activity Code ${activity.activityCodeId??'onbekend'}`;
            addSpan(activity,name,codeColor(code),'activity');
          }
        }
      }
      return segments.map(x=>({...x,label:`${x.label} · ${fmt(x.from)}–${fmt(x.to)}`}));
    });
    function scheduleWeekId(s){
      // Read the actual Genesys schedule object, even when wrapped by an earlier UI model.
      const candidates=[s?.weekDate,s?.raw?.weekDate,s?.weekId,s?.raw?.weekId,s?.week?.weekDate,s?.raw?.week?.weekDate];
      for(const value of candidates){if(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value))return value;}
      // Genesys also provides the canonical week date in the schedule selfUri.
      for(const uri of [s?.selfUri,s?.raw?.selfUri]){
        const match=typeof uri==='string'&&uri.match(/\/weeks\/(\d{4}-\d{2}-\d{2})\/schedules\//);
        if(match)return match[1];
      }
      return null;
    }
    const schedulePublished=isPublished;
    async function discoverSchedules(){
      scheduleCandidates.value=[];selectedSchedule.value='';scheduleData.value=null;scheduleError.value='';
      if(!businessUnit.value||!agentId.value)return;
      const bu=businessUnit.value,agent=agentId.value,mu=managementUnit.value;
      const valid=selectionSnapshot(),request=++scheduleRequest;const current=()=>valid()&&request===scheduleRequest;
      scheduleBusy.value=true;scheduleState.value='Gepubliceerde roosters zoeken…';
      loadActivityCodes();
      try{
        const response=await api(`/api/v2/workforcemanagement/businessunits/${encode(bu)}/weeks/recent/schedules`);
        if(!current())return;
        const items=Array.isArray(response)?response:(response.entities||response.schedules||response.results||response.items||[]);
        const eligible=items.filter(x=>x.id&&schedulePublished(x));
        // 'recent' is a discovery alias, not a guaranteed valid weekId for metadata/query.
        // Prefer the explicit weekDate returned by Genesys when weekId is absent.
        scheduleCandidates.value=eligible.map(x=>({id:x.id,weekId:scheduleWeekId(x),name:x.name||x.description||'Gepubliceerd rooster',raw:x}));
        if(!eligible.length){scheduleState.value='Geen expliciet gepubliceerd rooster gevonden voor deze Business Unit.';return;}
        if(eligible.length===1){selectedSchedule.value=eligible[0].id;await loadSchedule();}
        else scheduleState.value=`${eligible.length} gepubliceerde roosters gevonden. Kies het rooster voor deze week.`;
      }catch(e){if(current()){scheduleError.value=e.message;scheduleState.value='Rooster ophalen mislukt.';}}
      finally{if(current())scheduleBusy.value=false;}
    }
    async function loadSchedule(){
      scheduleData.value=null;scheduleError.value='';
      const candidate=scheduleCandidates.value.find(x=>x.id===selectedSchedule.value);
      if(!candidate||!businessUnit.value||!managementUnit.value||!agentId.value)return;
      const bu=businessUnit.value,mu=managementUnit.value,agent=agentId.value;
      const valid=selectionSnapshot(),request=++scheduleRequest;const current=()=>valid()&&request===scheduleRequest;
      scheduleBusy.value=true;scheduleState.value='Rooster en metadata ophalen…';
      try{
        const resolvedWeekId=scheduleWeekId(candidate);
        if(!resolvedWeekId)throw Error('Geen weekdatum in weekDate of selfUri van dit rooster. Controleer de Rooster API-diagnose.');
        candidate.weekId=resolvedWeekId;
        const prefix=`/api/v2/workforcemanagement/businessunits/${encode(bu)}/weeks/${encode(resolvedWeekId)}/schedules/${encode(candidate.id)}`;
        const metadata=await api(prefix);
        if(!isPublished(metadata))throw Error('Rooster is niet expliciet gepubliceerd volgens de metadata.');
        if(!current())return;
        scheduleDiagnostics.value={schedule:candidate.raw,resolvedWeekId,metadata};
        const result=await api(`${prefix}/agentschedules/query`,'POST',{managementUnitId:mu,userIds:[agent],teamIds:[]});
        if(!current())return;
        scheduleData.value=result;scheduleDiagnostics.value={schedule:candidate.raw,resolvedWeekId,metadata,response:result};
        const agentRows=(result?.result?.agentSchedules||result?.agentSchedules||[]).filter(x=>(x.user?.id||x.userId||x.agent?.id||x.agentId)===agent);
        scheduleState.value=scheduleSegments.value.length?'Rooster geladen.':agentRows.length?'Rooster opgehaald; geen diensten zichtbaar binnen de gekozen datums.':'Rooster opgehaald; geen roostergegevens voor deze medewerker. Bekijk de diagnose.';
      }catch(e){if(current()){scheduleError.value=e.message;scheduleState.value='Rooster ophalen mislukt.';}}
      finally{if(current())scheduleBusy.value=false;}
    }
    const scheduleRows=computed(()=>graphRows.value.map(day=>({...day,shifts:scheduleSegments.value.filter(x=>x.date===day.date&&x.kind==='shift'),activities:scheduleSegments.value.filter(x=>x.date===day.date&&x.kind==='activity')})));
    const records=computed(()=>{const d=lastResponse.value;if(!d)return [];return Array.isArray(d)?d:(d.entities||d.unavailableTimes||d.results||d.items||d.days||null);});
    // Interpret Genesys timeSpan.startDate as UTC and split at Dutch local midnight.
    const normalized=computed(()=>{
      if(lastResponse.value===null)return null;
      if(!Array.isArray(records.value))return null;
      const out=[];
      for(const item of records.value){
        const st=item?.timeSpan?.startDate,minutes=item?.timeSpan?.lengthMinutes;
        if(!st||!Number.isInteger(minutes)||minutes<=0||minutes>525600)return null;
        const t=Date.parse(st);if(!Number.isFinite(t))return null;
        // Scan minute boundaries to correctly handle midnight and DST transitions.
        let current=null;
        for(let i=0;i<minutes;i++){
          const loc=localParts(t+i*60000);
          if(!current||current.date!==loc.date||loc.minute!==current.lastMinute+1){
            current={id:item.id,date:loc.date,from:loc.minute,to:loc.minute+1,lastMinute:loc.minute,original:item};out.push(current);
          }else{current.to=loc.minute+1;current.lastMinute=loc.minute;}
        }
      }
      return out;
    });
    const graphSupported=computed(()=>lastResponse.value!==null&&normalized.value!==null);
    const fmt=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    const graphRows=computed(()=>{
      const intervals=graphSupported.value?normalized.value:[];
      const days=[];const a=new Date(start.value+'T12:00:00Z'),b=new Date(end.value+'T12:00:00Z');
      if(Number.isNaN(+a)||Number.isNaN(+b))return [];
      for(let d=new Date(a),i=0;d<=b&&i<62;d.setUTCDate(d.getUTCDate()+1),i++){
        const date=iso(d);days.push({date,label:new Intl.DateTimeFormat('nl-NL',{weekday:'short',timeZone:'Europe/Amsterdam'}).format(d),intervals:intervals.filter(x=>x.date===date).map(x=>({...x,label:`${fmt(x.from)}–${fmt(x.to)}`}))});
      }return days;
    });
    const editor=ref(null),draft=ref(null),saving=ref(false);
    let editorAgent=null,editorVersion=null;
    const localDateTime = ms => {const p=localParts(ms);return `${p.date}T${fmt(p.minute)}`;};
    const splitLocal = ms => {const p=localParts(ms);return {date:p.date,time:fmt(p.minute)};};
    const joinLocal = (date,time) => `${date}T${time}`;
    const editError=computed(()=>{if(!draft.value)return '';try{draftToSpan();return '';}catch(e){return e.message;}});
    // Convert a local Amsterdam wall time to UTC, rejecting nonexistent and ambiguous DST times.
    function draftToSpan(){
      if(!draft.value)throw Error('Geen tijdvak geselecteerd.');
      const a=amsterdamToUtc(joinLocal(draft.value.fromDate,draft.value.fromTime)),b=amsterdamToUtc(joinLocal(draft.value.toDate,draft.value.toTime));
      if(b<=a)throw Error('De eindtijd moet na de begintijd liggen.');
      const minutes=(b-a)/60000;
      if(!Number.isInteger(minutes)||minutes>525600)throw Error('Ongeldige duur van het tijdvak.');
      return {startDate:new Date(a).toISOString(),lengthMinutes:minutes};
    }
    const draftValid=computed(()=>{try{draftToSpan();return true;}catch{return false;}});
    function openEditor(slot){
      if(!agentId.value||!token.value)return;
      editorAgent=agentId.value;editorVersion=selectionVersion;
      editor.value=slot?.original||null;
      const fromMs=slot?.original?Date.parse(slot.original.timeSpan.startDate):amsterdamToUtc(`${start.value}T09:00`);
      const toMs=slot?.original?fromMs+slot.original.timeSpan.lengthMinutes*60000:fromMs+8*3600000;
      const from=splitLocal(fromMs),to=splitLocal(toMs);
      draft.value={fromDate:from.date,fromTime:from.time,toDate:to.date,toTime:to.time,notes:slot?.original?.notes||''};
    }
    function closeEditor(){editor.value=null;draft.value=null;editorAgent=null;editorVersion=null;}
    async function submitChange(remove=false){
      if(!draft.value||saving.value||busy.value||!agentId.value||!token.value)return;
      if(editorAgent!==agentId.value||editorVersion!==selectionVersion){closeEditor();setStatus('Selectie gewijzigd; open het tijdvak opnieuw.',true);return;}
      const id=editor.value?.id;
      if(editor.value&&(typeof id!=='string'||!id)){setStatus('Dit tijdvak heeft geen geldige Genesys-ID en kan niet worden gewijzigd of verwijderd.',true);return;}
      let entity;
      try{
        if(remove){entity={id,delete:true};}
        else{
          const timeSpan=draftToSpan();
          entity={...(id?{id}:{}),timeSpan,notes:draft.value.notes||'',delete:false};
        }
      }catch(e){setStatus(e.message,true);return;}
      const name=agents.value.find(x=>x.id===agentId.value)?.name||agentId.value;
      const verb=remove?'verwijderen':id?'wijzigen':'toevoegen';
      if(!window.confirm(`Wil je dit tijdvak voor ${name} echt ${verb}?`))return;
      saving.value=true;
      try{
        const agentAtSave=editorAgent,valid=selectionSnapshot();
        await api(`/api/v2/workforcemanagement/agents/${encode(agentAtSave)}/unavailabletimes`,'PATCH',{entities:[entity]});
        if(!valid())return;
        closeEditor();
        if(agentId.value===agentAtSave){const refreshed=await loadUnavailable();if(valid()&&refreshed)setStatus(`Tijdvak ${remove?'verwijderd':id?'gewijzigd':'toegevoegd'} en opnieuw opgehaald.`);}
      }catch(e){setStatus(`Opslaan mislukt: ${e.message}`,true);}
      finally{saving.value=false;}
    }
    function setStatus(s,isError=false){status.value=s;error.value=isError;}
    function saveConfig(){sessionStorage.setItem('wfm_clientId',clientId.value);sessionStorage.setItem('wfm_region',region.value);}
    async function login(){
      try{validateRegion(region.value);}catch(e){setStatus(e.message,true);return;}
      saveConfig();if(!clientId.value){setStatus('Vul eerst een OAuth Client ID in.',true);return;}
      const context=JSON.stringify([region.value,clientId.value]);
      try{
        const request=await createPkceRequest(region.value,clientId.value,redirect);
        if(context!==JSON.stringify([region.value,clientId.value]))throw Error('OAuth-configuratie gewijzigd tijdens aanmelden.');
        sessionStorage.setItem('wfm_oauth_context',context);
        sessionStorage.setItem('wfm_pkce',request.verifier);sessionStorage.setItem('wfm_state',request.state);
        location.assign(request.url.href);
      }catch(e){setStatus(e.message,true);}
    }
    async function callback(){
      const q=new URLSearchParams(location.search);
      if(q.has('error'))throw Error(`OAuth: ${q.get('error_description')||q.get('error')}`);
      if(!q.has('code'))return;
      if(!sessionStorage.getItem('wfm_state')||q.get('state')!==sessionStorage.getItem('wfm_state'))throw Error('OAuth state komt niet overeen.');
      const verifier=sessionStorage.getItem('wfm_pkce');if(!verifier)throw Error('PKCE verifier ontbreekt.');
      const context=JSON.stringify([region.value,clientId.value]);
      if(sessionStorage.getItem('wfm_oauth_context')!==context)throw Error('OAuth-client of regio gewijzigd; meld opnieuw aan.');
      const accessToken=await exchangeOAuthCode(region.value,new URLSearchParams({grant_type:'authorization_code',code:q.get('code'),redirect_uri:redirect,client_id:clientId.value,code_verifier:verifier}));
      if(context!==JSON.stringify([region.value,clientId.value]))throw Error('OAuth-configuratie gewijzigd tijdens aanmelden.');
      sessionStorage.setItem('wfm_auth_context',context);
      token.value=accessToken;sessionStorage.setItem('wfm_token',accessToken);
      sessionStorage.removeItem('wfm_pkce');sessionStorage.removeItem('wfm_state');sessionStorage.removeItem('wfm_oauth_context');
      history.replaceState({},'',redirect+location.hash);
    }
    const client=createGenesysApi({region:()=>region.value,token:()=>token.value,onUnauthorized:()=>{logout();setStatus('Sessie verlopen; meld opnieuw aan.',true);},onResponse:diagnostic=>{raw.value=JSON.stringify(diagnostic,null,2);}});
    const api=client.request;
    const pages=client.pages;
    async function initialize(){
      if(!token.value)return;
      const valid=selectionSnapshot();
      busy.value=true;
      try{const me=await api('/api/v2/users/me');if(!valid())return;const units=await pages('/api/v2/workforcemanagement/businessunits');if(!valid())return;identity.value=me.name||'Aangemeld';businessUnits.value=units;setStatus(`${businessUnits.value.length} Business Unit(s) geladen.`);}
      catch(e){if(valid())setStatus(e.message,true);}finally{if(valid())busy.value=false;}
    }
    function logout(){managementRequest++;agentsRequest++;unavailableRequest++;scheduleRequest++;capacityVersion++;busy.value=false;scheduleBusy.value=false;closeEditor();scheduleData.value=null;scheduleCandidates.value=[];scheduleDiagnostics.value=null;activityCodes.value=[];raw.value='Nog geen response.';sessionStorage.removeItem('wfm_auth_context');capacityRows.value=[];activeTab.value='calendar';token.value='';sessionStorage.removeItem('wfm_token');identity.value='Niet aangemeld';businessUnits.value=[];businessUnit.value='';managementUnits.value=[];managementUnit.value='';agents.value=[];agentId.value='';lastResponse.value=null;setStatus('Afgemeld.');}
    function resetAgentData(){scheduleRequest++;scheduleBusy.value=false;busy.value=false;lastResponse.value=null;scheduleData.value=null;scheduleError.value='';scheduleCandidates.value=[];selectedSchedule.value='';scheduleDiagnostics.value=null;activityCodes.value=[];activityCodeError.value='';confirmed.value=false;closeEditor();if(agentId.value){loadUnavailable();discoverSchedules();}}
    async function loadManagementUnits(){
      capacityRows.value=[];managementUnit.value='';managementUnits.value=[];agents.value=[];agentId.value='';resetAgentData();
      if(!businessUnit.value)return;
      const bu=businessUnit.value,request=++managementRequest,valid=selectionSnapshot();
      const current=()=>valid()&&bu===businessUnit.value&&request===managementRequest&&!!token.value;
      try{const list=await pages(`/api/v2/workforcemanagement/businessunits/${encode(businessUnit.value)}/managementunits`);if(!current())return;managementUnits.value=list;setStatus(`${managementUnits.value.length} Management Unit(s) geladen.`);}
      catch(e){if(current())setStatus(e.message,true);}
    }
    async function loadAgents(){
      capacityRows.value=[];agents.value=[];agentId.value='';resetAgentData();
      if(!managementUnit.value)return;
      const mu=managementUnit.value,bu=businessUnit.value,request=++agentsRequest,valid=selectionSnapshot();
      const current=()=>valid()&&mu===managementUnit.value&&bu===businessUnit.value&&request===agentsRequest&&!!token.value;
      try{const list=await pages(`/api/v2/workforcemanagement/managementunits/${encode(managementUnit.value)}/users`);
        if(!current())return;
        const loaded=list.map(x=>({...x,name:x.name||x.user?.name||x.userName||x.displayName||''}));
        const unresolved=loaded.filter(x=>!x.name||x.name===x.id);
        for(let i=0;i<unresolved.length;i+=8){await Promise.all(unresolved.slice(i,i+8).map(async x=>{try{const u=await api(`/api/v2/users/${encode(x.id)}`);x.name=u.name||u.username||x.id;}catch{x.name=x.id;}}));}
        if(!current())return;
        agents.value=loaded.sort((a,b)=>(a.name||'').localeCompare(b.name||'','nl'));setStatus(`${agents.value.length} medewerker(s) geladen.`);}
      catch(e){if(current())setStatus(e.message,true);}
    }
    async function loadUnavailable(){
      if(!agentId.value||!token.value)return;
      const agent=agentId.value,valid=selectionSnapshot(),request=++unavailableRequest;const current=()=>valid()&&request===unavailableRequest;
      busy.value=true;
      try{
        if(!start.value||!end.value||end.value<start.value)throw Error('Ongeldig datumbereik.');
        const body=localDayBounds(start.value,end.value);
        const response=await api(`/api/v2/workforcemanagement/agents/${encode(agent)}/unavailabletimes/query`,'POST',body);
        if(!current())return;
        lastResponse.value=response;
        setStatus('Unavailable Times opgehaald. Controleer eventueel de ruwe API-response.');
        return true;
      }catch(e){if(current())setStatus(e.message,true);return false;}finally{if(current())busy.value=false;}
    }
    async function savePatch(){
      if(!token.value||!agentId.value||!confirmed.value||busy.value)return;
      busy.value=true;
      try{
        const body=JSON.parse(patchBody.value);
        const name=agents.value.find(a=>a.id===agentId.value)?.name||agentId.value;
        if(!window.confirm(`Weet je zeker dat je de Unavailable Times van ${name} wilt wijzigen?`))return;
        await api(`/api/v2/workforcemanagement/agents/${encode(agentId.value)}/unavailabletimes`,'PATCH',body);
        confirmed.value=false;lastResponse.value=null;
        setStatus('PATCH uitgevoerd. Haal de gegevens opnieuw op om de wijzigingen te controleren.');
      }catch(e){setStatus(e.message,true);}finally{busy.value=false;}
    }
    watch([clientId,region],()=>{logout();saveConfig();},{flush:'sync'});
    watch([start,end],()=>{if(agentId.value){loadUnavailable();discoverSchedules();}});
    onMounted(async()=>{try{validateRegion(region.value);await callback();await initialize();}catch(e){sessionStorage.removeItem('wfm_pkce');sessionStorage.removeItem('wfm_state');sessionStorage.removeItem('wfm_oauth_context');setStatus(e.message,true);history.replaceState({},'',redirect+location.hash);}});
    return {activeTab,capacityMargin,capacityWeek,capacityBusy,capacityProgress,capacityRows,capacityError,capacityDiagnostics,loadCapacity,hoursText,pctText,activityCodes,activityCodeError,scheduleData,scheduleError,scheduleBusy,scheduleRows,loadSchedule,discoverSchedules,scheduleCandidates,selectedSchedule,scheduleDiagnostics,scheduleState,redirect,clientId,region,token,identity,businessUnits,managementUnits,agents,businessUnit,managementUnit,agentId,start,end,queryBody,patchBody,confirmed,lastResponse,records,graphRows,graphSupported,editor,draft,draftValid,editError,openEditor,closeEditor,submitChange,saving,raw,status,error,busy,saveConfig,login,logout,loadManagementUnits,loadAgents,resetAgentData,loadUnavailable,savePatch};
}
