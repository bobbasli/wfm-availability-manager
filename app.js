import { createApp, ref, computed, onMounted, watch } from 'vue';

const redirect = location.origin + location.pathname;
const qs = new URLSearchParams(location.search);
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const monday = new Date(); monday.setDate(monday.getDate() - (monday.getDay()+6)%7);
const until = new Date(monday); until.setDate(until.getDate()+27);
const encode = encodeURIComponent;
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
createApp({
  setup(){
    const clientId=ref(qs.get('clientId')||sessionStorage.getItem('wfm_clientId')||'');
    const region=ref(qs.get('region')||sessionStorage.getItem('wfm_region')||'mypurecloud.de');
    const token=ref(sessionStorage.getItem('wfm_token')||'');
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
    const scheduleSegments=computed(()=>{
      const root=scheduleData.value;if(!root)return [];
      const rows=Array.isArray(root)?root:(root.entities||root.agentSchedules||root.results||root.items||root.schedules||[]);
      const segments=[];
      function addSpan(span,label){
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
            current={date:loc.date,from:loc.minute,to:loc.minute+1,lastMinute:loc.minute,label};segments.push(current);
          }else{current.to=loc.minute+1;current.lastMinute=loc.minute;}
        }
      }
      for(const r of rows){
        if(r.userId&&r.userId!==agentId.value)continue;
        const shifts=r.shifts||r.shiftAssignments||r.scheduledShifts||r.shiftSegments||[];
        for(const shift of shifts){
          const span=shift.timeSpan||shift;
          addSpan(span,shift.name||shift.activityCode?.name||'Roosterdienst');
        }
      }
      return segments.map(x=>({...x,label:`${fmt(x.from)}–${fmt(x.to)} · ${x.label}`}));
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
    function schedulePublished(s){
      const flag=s.published??s.isPublished??s.publicationStatus;
      if(flag===true)return true;
      if(typeof flag==='string'&&/published/i.test(flag))return true;
      if(s.status&&/published/i.test(s.status))return true;
      return false;
    }
    async function discoverSchedules(){
      scheduleCandidates.value=[];selectedSchedule.value='';scheduleData.value=null;scheduleError.value='';
      if(!businessUnit.value||!agentId.value)return;
      const bu=businessUnit.value,agent=agentId.value,mu=managementUnit.value;
      scheduleBusy.value=true;scheduleState.value='Gepubliceerde roosters zoeken…';
      try{
        const response=await api(`/api/v2/workforcemanagement/businessunits/${encode(bu)}/weeks/recent/schedules`);
        if(bu!==businessUnit.value||agent!==agentId.value||mu!==managementUnit.value)return;
        const items=Array.isArray(response)?response:(response.entities||response.schedules||response.results||response.items||[]);
        const eligible=items.filter(x=>x.id&&schedulePublished(x));
        // 'recent' is a discovery alias, not a guaranteed valid weekId for metadata/query.
        // Prefer the explicit weekDate returned by Genesys when weekId is absent.
        scheduleCandidates.value=eligible.map(x=>({id:x.id,weekId:scheduleWeekId(x),name:x.name||x.description||'Gepubliceerd rooster',raw:x}));
        if(!eligible.length){scheduleState.value='Geen expliciet gepubliceerd rooster gevonden voor deze Business Unit.';return;}
        if(eligible.length===1){selectedSchedule.value=eligible[0].id;await loadSchedule();}
        else scheduleState.value=`${eligible.length} gepubliceerde roosters gevonden. Kies het rooster voor deze week.`;
      }catch(e){scheduleError.value=e.message;scheduleState.value='Rooster ophalen mislukt.';}
      finally{scheduleBusy.value=false;}
    }
    async function loadSchedule(){
      scheduleData.value=null;scheduleError.value='';
      const candidate=scheduleCandidates.value.find(x=>x.id===selectedSchedule.value);
      if(!candidate||!businessUnit.value||!managementUnit.value||!agentId.value)return;
      const bu=businessUnit.value,mu=managementUnit.value,agent=agentId.value;
      scheduleBusy.value=true;scheduleState.value='Rooster en metadata ophalen…';
      try{
        const resolvedWeekId=scheduleWeekId(candidate);
        if(!resolvedWeekId)throw Error('Geen weekdatum in weekDate of selfUri van dit rooster. Controleer de Rooster API-diagnose.');
        candidate.weekId=resolvedWeekId;
        const prefix=`/api/v2/workforcemanagement/businessunits/${encode(bu)}/weeks/${encode(resolvedWeekId)}/schedules/${encode(candidate.id)}`;
        const metadata=await api(prefix);
        if(bu!==businessUnit.value||mu!==managementUnit.value||agent!==agentId.value)return;
        scheduleDiagnostics.value={schedule:candidate.raw,resolvedWeekId,metadata};
        const result=await api(`${prefix}/agentschedules/query`,'POST',{managementUnitId:mu,userIds:[agent],teamIds:[]});
        if(bu!==businessUnit.value||mu!==managementUnit.value||agent!==agentId.value)return;
        scheduleData.value=result;scheduleDiagnostics.value={schedule:candidate.raw,resolvedWeekId,metadata,response:result};
        scheduleState.value=scheduleSegments.value.length?'Rooster geladen.':'Rooster opgehaald; diensttijden nog niet herkend. Bekijk de diagnose.';
      }catch(e){scheduleError.value=e.message;scheduleState.value='Rooster ophalen mislukt.';}
      finally{scheduleBusy.value=false;}
    }
    const scheduleRows=computed(()=>graphRows.value.map(day=>({...day,shifts:scheduleSegments.value.filter(x=>x.date===day.date)})));
    const records=computed(()=>{const d=lastResponse.value;if(!d)return [];return Array.isArray(d)?d:(d.entities||d.unavailableTimes||d.results||d.items||d.days||[]);});
    // Interpret Genesys timeSpan.startDate as UTC and split at Dutch local midnight.
    const tz='Europe/Amsterdam';
    const dtf=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    function localParts(ms){const p=Object.fromEntries(dtf.formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,minute:Number(p.hour)*60+Number(p.minute)};}
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
      if(!graphSupported.value)return [];
      const days=[];const a=new Date(start.value+'T12:00:00'),b=new Date(end.value+'T12:00:00');
      if(Number.isNaN(+a)||Number.isNaN(+b))return [];
      for(let d=new Date(a),i=0;d<=b&&i<62;d.setDate(d.getDate()+1),i++){
        const date=iso(d);days.push({date,label:new Intl.DateTimeFormat('nl-NL',{weekday:'short'}).format(d),intervals:normalized.value.filter(x=>x.date===date).map(x=>({...x,label:`${fmt(x.from)}–${fmt(x.to)}`}))});
      }return days;
    });
    const editor=ref(null),draft=ref(null),saving=ref(false);
    const localDateTime = ms => {const p=localParts(ms);return `${p.date}T${fmt(p.minute)}`;};
    const splitLocal = ms => {const p=localParts(ms);return {date:p.date,time:fmt(p.minute)};};
    const joinLocal = (date,time) => `${date}T${time}`;
    const editError=computed(()=>{if(!draft.value)return '';try{draftToSpan();return '';}catch(e){return e.message;}});
    // Convert a local Amsterdam wall time to UTC, rejecting nonexistent and ambiguous DST times.
    function amsterdamToUtc(value){
      if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Ongeldige lokale datum/tijd.');
      const naive=Date.parse(value+'Z');if(!Number.isFinite(naive))throw Error('Ongeldige datum/tijd.');
      const candidates=[];
      for(let offset=-120;offset<=180;offset+=30){
        const utc=naive-offset*60000;
        if(localDateTime(utc)===value)candidates.push(utc);
      }
      if(candidates.length!==1)throw Error('Dit tijdstip bestaat niet of is dubbelzinnig door de overgang tussen zomer- en wintertijd. Kies een ander tijdstip.');
      return candidates[0];
    }
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
      editor.value=slot?.original||null;
      const fromMs=slot?.original?Date.parse(slot.original.timeSpan.startDate):amsterdamToUtc(`${start.value}T09:00`);
      const toMs=slot?.original?fromMs+slot.original.timeSpan.lengthMinutes*60000:fromMs+8*3600000;
      const from=splitLocal(fromMs),to=splitLocal(toMs);
      draft.value={fromDate:from.date,fromTime:from.time,toDate:to.date,toTime:to.time,notes:slot?.original?.notes||''};
    }
    function closeEditor(){editor.value=null;draft.value=null;}
    async function submitChange(remove=false){
      if(!draft.value||saving.value||busy.value||!agentId.value)return;
      const id=editor.value?.id;
      if(remove&&!id){setStatus('Dit tijdvak heeft geen Genesys-ID en kan niet worden verwijderd.',true);return;}
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
        const agentAtSave=agentId.value;
        await api(`/api/v2/workforcemanagement/agents/${encode(agentAtSave)}/unavailabletimes`,'PATCH',{entities:[entity]});
        closeEditor();
        if(agentId.value===agentAtSave){await loadUnavailable();setStatus(`Tijdvak ${remove?'verwijderd':id?'gewijzigd':'toegevoegd'} en opnieuw opgehaald.`);}
      }catch(e){setStatus(`Opslaan mislukt: ${e.message}`,true);}
      finally{saving.value=false;}
    }
    const base=()=>`https://api.${region.value}`;
    function setStatus(s,isError=false){status.value=s;error.value=isError;}
    function saveConfig(){sessionStorage.setItem('wfm_clientId',clientId.value);sessionStorage.setItem('wfm_region',region.value);}
    async function login(){
      saveConfig();if(!clientId.value){setStatus('Vul eerst een OAuth Client ID in.',true);return;}
      const verifier=b64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge=b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
      const state=b64url(crypto.getRandomValues(new Uint8Array(16)));
      sessionStorage.setItem('wfm_pkce',verifier);sessionStorage.setItem('wfm_state',state);
      const url=new URL(`https://login.${region.value}/oauth/authorize`);
      Object.entries({response_type:'code',client_id:clientId.value,redirect_uri:redirect,code_challenge:challenge,code_challenge_method:'S256',state}).forEach(([k,v])=>url.searchParams.set(k,v));
      location.assign(url.href);
    }
    async function callback(){
      const q=new URLSearchParams(location.search);
      if(q.has('error'))throw Error(`OAuth: ${q.get('error_description')||q.get('error')}`);
      if(!q.has('code'))return;
      if(!sessionStorage.getItem('wfm_state')||q.get('state')!==sessionStorage.getItem('wfm_state'))throw Error('OAuth state komt niet overeen.');
      const verifier=sessionStorage.getItem('wfm_pkce');if(!verifier)throw Error('PKCE verifier ontbreekt.');
      const r=await fetch(`https://login.${region.value}/oauth/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code:q.get('code'),redirect_uri:redirect,client_id:clientId.value,code_verifier:verifier})});
      const d=await r.json();if(!r.ok)throw Error(JSON.stringify(d));
      token.value=d.access_token;sessionStorage.setItem('wfm_token',token.value);
      sessionStorage.removeItem('wfm_pkce');sessionStorage.removeItem('wfm_state');
      history.replaceState({},'',redirect+location.hash);
    }
    async function api(path,method='GET',body){
      const r=await fetch(base()+path,{method,headers:{Authorization:`Bearer ${token.value}`,...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
      const t=await r.text();let d;try{d=t?JSON.parse(t):{};}catch{d={raw:t};}
      raw.value=JSON.stringify({status:r.status,method,path,response:d},null,2);
      if(r.status===401){token.value='';sessionStorage.removeItem('wfm_token');identity.value='Niet aangemeld';}
      if(!r.ok)throw Error(`${method} ${path}: HTTP ${r.status} – ${d.message||d.error||t.slice(0,250)}`);
      return d;
    }
    async function pages(path){
      const out=[];for(let page=1;page<=50;page++){
        const u=new URL(path,base());u.searchParams.set('pageSize','100');u.searchParams.set('pageNumber',String(page));
        const d=await api(u.pathname+u.search),items=d.entities||d.results||d.items||[];
        out.push(...items);if(items.length<100||(d.pageCount&&page>=d.pageCount))break;
      }return out;
    }
    async function initialize(){
      if(!token.value)return;
      busy.value=true;
      try{const me=await api('/api/v2/users/me');identity.value=me.name||'Aangemeld';businessUnits.value=await pages('/api/v2/workforcemanagement/businessunits');setStatus(`${businessUnits.value.length} Business Unit(s) geladen.`);}
      catch(e){setStatus(e.message,true);}finally{busy.value=false;}
    }
    function logout(){token.value='';sessionStorage.removeItem('wfm_token');identity.value='Niet aangemeld';businessUnits.value=[];businessUnit.value='';managementUnits.value=[];managementUnit.value='';agents.value=[];agentId.value='';lastResponse.value=null;setStatus('Afgemeld.');}
    function resetAgentData(){lastResponse.value=null;scheduleData.value=null;scheduleError.value='';scheduleCandidates.value=[];selectedSchedule.value='';scheduleDiagnostics.value=null;confirmed.value=false;closeEditor();if(agentId.value){loadUnavailable();discoverSchedules();}}
    async function loadManagementUnits(){
      managementUnit.value='';managementUnits.value=[];agents.value=[];agentId.value='';resetAgentData();
      if(!businessUnit.value)return;
      try{managementUnits.value=await pages(`/api/v2/workforcemanagement/businessunits/${encode(businessUnit.value)}/managementunits`);setStatus(`${managementUnits.value.length} Management Unit(s) geladen.`);}
      catch(e){setStatus(e.message,true);}
    }
    async function loadAgents(){
      agents.value=[];agentId.value='';resetAgentData();
      if(!managementUnit.value)return;
      try{const list=await pages(`/api/v2/workforcemanagement/managementunits/${encode(managementUnit.value)}/users`);
        agents.value=list.map(x=>({...x,name:x.name||x.user?.name||x.userName||x.displayName||''}));
        const unresolved=agents.value.filter(x=>!x.name||x.name===x.id);
        for(let i=0;i<unresolved.length;i+=8){await Promise.all(unresolved.slice(i,i+8).map(async x=>{try{const u=await api(`/api/v2/users/${encode(x.id)}`);x.name=u.name||u.username||x.id;}catch{x.name=x.id;}}));}
        agents.value=[...agents.value].sort((a,b)=>(a.name||'').localeCompare(b.name||'','nl'));setStatus(`${agents.value.length} medewerker(s) geladen.`);}
      catch(e){setStatus(e.message,true);}
    }
    async function loadUnavailable(){
      if(!agentId.value)return;
      busy.value=true;
      try{
        if(!start.value||!end.value||end.value<start.value)throw Error('Ongeldig datumbereik.');
        const from=new Date(start.value+'T00:00:00Z');const after=new Date(end.value+'T00:00:00Z');after.setUTCDate(after.getUTCDate()+1);const body={startDate:from.toISOString(),endDate:after.toISOString()};
        lastResponse.value=await api(`/api/v2/workforcemanagement/agents/${encode(agentId.value)}/unavailabletimes/query`,'POST',body);
        setStatus('Unavailable Times opgehaald. Controleer eventueel de ruwe API-response.');
      }catch(e){setStatus(e.message,true);}finally{busy.value=false;}
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
    watch([clientId,region],saveConfig);
    watch([start,end],()=>{if(agentId.value){loadUnavailable();discoverSchedules();}});
    onMounted(async()=>{try{await callback();await initialize();}catch(e){setStatus(e.message,true);history.replaceState({},'',redirect+location.hash);}});
    return {scheduleData,scheduleError,scheduleBusy,scheduleRows,loadSchedule,discoverSchedules,scheduleCandidates,selectedSchedule,scheduleDiagnostics,scheduleState,redirect,clientId,region,token,identity,businessUnits,managementUnits,agents,businessUnit,managementUnit,agentId,start,end,queryBody,patchBody,confirmed,lastResponse,records,graphRows,graphSupported,editor,draft,draftValid,editError,openEditor,closeEditor,submitChange,saving,raw,status,error,busy,saveConfig,login,logout,loadManagementUnits,loadAgents,resetAgentData,loadUnavailable,savePatch};
  }
}).mount('#app');
