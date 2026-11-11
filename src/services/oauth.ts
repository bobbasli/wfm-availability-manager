import { validateRegion } from './regions';
const base64url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function createPkceRequest(region: string, clientId: string, redirectUri: string) {
  validateRegion(region);
  if (!clientId) throw Error('Vul eerst een OAuth Client ID in.');
  const verifier=base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const state=base64url(crypto.getRandomValues(new Uint8Array(16)));
  const url=new URL(`https://login.${region}/oauth/authorize`);
  Object.entries({response_type:'code',client_id:clientId,redirect_uri:redirectUri,code_challenge:challenge,code_challenge_method:'S256',state}).forEach(([key,value])=>url.searchParams.set(key,value));
  return {url,verifier,state};
}
