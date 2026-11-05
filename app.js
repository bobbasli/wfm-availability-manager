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
    const editor=ref(null),draft=ref(null);
    function openEditor(slot){
      editor.value=slot?.original||null;
      const day=slot?.date||start.value;
      draft.value={date:day,from:slot?fmt(slot.from):'09:00',to:slot?fmt(slot.to):'17:00',notes:slot?.original?.notes||''};
    }
    function closeEditor(){editor.value=null;draft.value=null;}
    const draftValid=computed(()=>!!draft.value&&!!draft.value.date&&/^\d{2}:\d{2}$/.test(draft.value.from)&&/^\d{2}:\d{2}$/.test(draft.value.to)&&draft.value.to>draft.value.from);
    function previewDraft(){
      if(!draftValid.value){setStatus('Controleer datum en tijden. Voor een tijdvak over middernacht zijn twee lokale dagdelen nodig.',true);return;}
      setStatus('Concept gewijzigd. Opslaan naar Genesys is nog niet geactiveerd: PATCH-body voor toevoegen/wijzigen/verwijderen moet eerst worden bevestigd.');
      closeEditor();
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
    function resetAgentData(){lastResponse.value=null;confirmed.value=false;closeEditor();if(agentId.value)loadUnavailable();}
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
    watch([start,end],()=>{if(agentId.value)loadUnavailable();});
    onMounted(async()=>{try{await callback();await initialize();}catch(e){setStatus(e.message,true);history.replaceState({},'',redirect+location.hash);}});
    return {redirect,clientId,region,token,identity,businessUnits,managementUnits,agents,businessUnit,managementUnit,agentId,start,end,queryBody,patchBody,confirmed,lastResponse,records,graphRows,graphSupported,editor,draft,draftValid,openEditor,closeEditor,previewDraft,raw,status,error,busy,saveConfig,login,logout,loadManagementUnits,loadAgents,resetAgentData,loadUnavailable,savePatch};
  }
}).mount('#app');
