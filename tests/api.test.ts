import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGenesysApi, exchangeOAuthCode } from '../src/services/genesysApi';
import { queryAgentWorkPlans } from '../src/services/workforceManagement';
const config=()=>({region:()=> 'mypurecloud.de',token:()=> 'synthetic-token',onUnauthorized:vi.fn(),onResponse:vi.fn()});
const response=(data: unknown,status=200)=>new Response(JSON.stringify(data),{status});
afterEach(()=>vi.unstubAllGlobals());
describe('API-veiligheid',()=>{
  it('verstuurt nooit een token naar een onbekende regio',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    await expect(createGenesysApi({...config(),region:()=> 'example.invalid'}).request('/api/v2/users/me')).rejects.toThrow('regio');expect(fetch).not.toHaveBeenCalled();
    await expect(exchangeOAuthCode('example.invalid',new URLSearchParams())).rejects.toThrow('regio');
  });
  it('meldt 401 en herhaalt een PATCH niet automatisch',async()=>{
    const fetch=vi.fn().mockResolvedValue(response({message:'expired'},401));vi.stubGlobal('fetch',fetch);const c=config();
    await expect(createGenesysApi(c).request('/api/v2/users/me','PATCH',{})).rejects.toThrow('401');expect(c.onUnauthorized).toHaveBeenCalledOnce();expect(fetch).toHaveBeenCalledOnce();
  });
  it('valideert de OAuth-tokenresponse',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({access_token:123,token_type:'bearer'})));
    await expect(exchangeOAuthCode('mypurecloud.de',new URLSearchParams())).rejects.toThrow('tokenresponse');
  });
  it('weigert onbekende pagina-structuren en onvolledige paginering',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({unexpected:[]})));
    await expect(createGenesysApi(config()).pages('/api/v2/users')).rejects.toThrow('pagineringresponse');
    vi.stubGlobal('fetch',vi.fn(async()=>response({entities:[{id:'synthetic'}],pageCount:51})));
    await expect(createGenesysApi(config()).pages('/api/v2/users')).rejects.toThrow('onvolledig');
  });
  it('volgt pageCount ook bij korte pagina’s',async()=>{
    const fetch=vi.fn().mockResolvedValueOnce(response({entities:[{id:'one'}],pageCount:2})).mockResolvedValueOnce(response({entities:[{id:'two'}],pageCount:2}));vi.stubGlobal('fetch',fetch);
    expect(await createGenesysApi(config()).pages('/api/v2/users')).toHaveLength(2);
  });
  it('berekent geen capaciteit uit een ongeverifieerde assignment',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({assignments:[{agentId:'synthetic',workPlanId:'old-plan',startDate:'2025-01-01'}]})));
    const result=await queryAgentWorkPlans(createGenesysApi(config()).request,'synthetic-mu',['synthetic'],'2026-11-09');expect(result.assignments.size).toBe(0);expect(result.warning).toContain('result ontbreekt');
  });
});
it('laat een verlopen oud token een nieuwe sessie niet wissen',async()=>{
  let token='old';let resolve!: (response: Response)=>void;
  const c={...config(),token:()=>token};
  vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>{resolve=r;})));
  const pending=createGenesysApi(c).request('/api/v2/users/me');token='new';resolve(response({},401));
  await expect(pending).rejects.toThrow('Sessie gewijzigd');expect(c.onUnauthorized).not.toHaveBeenCalled();expect(c.onResponse).not.toHaveBeenCalled();
});
it('meldt rate limits zonder een mutatie opnieuw te versturen',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response('{}',{status:429,headers:{'Retry-After':'10'}}));vi.stubGlobal('fetch',fetch);
  await expect(createGenesysApi(config()).request('/api/v2/users/me','PATCH',{})).rejects.toThrow('10 seconden');expect(fetch).toHaveBeenCalledOnce();
});
