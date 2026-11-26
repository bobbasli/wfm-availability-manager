import { ref, watch } from 'vue';
import { createPkceRequest } from '../services/oauth';
import { exchangeOAuthCode } from '../services/genesysApi';
import { validateRegion } from '../services/regions';
import { errorMessage } from '../helpers/response';
import type { StatusReporter } from '../types/availability';

export function useGenesysSession(report: StatusReporter, reset: () => void) {
  const redirect = location.origin + location.pathname;
  const query = new URLSearchParams(location.search);
  const clientId = ref(query.get('clientId') || sessionStorage.getItem('wfm_clientId') || '');
  const region = ref(
    query.get('region') || sessionStorage.getItem('wfm_region') || 'mypurecloud.de',
  );
  const context = () => JSON.stringify([region.value, clientId.value]);
  const token = ref(
    sessionStorage.getItem('wfm_auth_context') === context()
      ? sessionStorage.getItem('wfm_token') || ''
      : '',
  );
  if (!token.value) sessionStorage.removeItem('wfm_token');

  function saveConfig() {
    sessionStorage.setItem('wfm_clientId', clientId.value);
    sessionStorage.setItem('wfm_region', region.value);
  }
  function clearPendingLogin() {
    for (const key of ['wfm_pkce', 'wfm_state', 'wfm_oauth_context'])
      sessionStorage.removeItem(key);
  }
  function logout() {
    sessionStorage.removeItem('wfm_auth_context');
    sessionStorage.removeItem('wfm_token');
    clearPendingLogin();
    token.value = '';
    reset();
    report('Afgemeld.');
  }
  async function login() {
    try {
      validateRegion(region.value);
      saveConfig();
      if (!clientId.value) throw Error('Vul eerst een OAuth Client ID in.');
      const initialContext = context();
      const request = await createPkceRequest(region.value, clientId.value, redirect);
      if (initialContext !== context())
        throw Error('OAuth-configuratie gewijzigd tijdens aanmelden.');
      sessionStorage.setItem('wfm_oauth_context', initialContext);
      sessionStorage.setItem('wfm_pkce', request.verifier);
      sessionStorage.setItem('wfm_state', request.state);
      location.assign(request.url.href);
    } catch (error) {
      report(errorMessage(error), true);
    }
  }
  async function callback() {
    validateRegion(region.value);
    const query = new URLSearchParams(location.search);
    if (query.has('error'))
      throw Error(`OAuth: ${query.get('error_description') || query.get('error')}`);
    const code = query.get('code');
    if (!code) return;
    if (
      !sessionStorage.getItem('wfm_state') ||
      query.get('state') !== sessionStorage.getItem('wfm_state')
    )
      throw Error('OAuth state komt niet overeen.');
    const verifier = sessionStorage.getItem('wfm_pkce');
    if (!verifier) throw Error('PKCE verifier ontbreekt.');
    const initialContext = context();
    if (sessionStorage.getItem('wfm_oauth_context') !== initialContext)
      throw Error('OAuth-client of regio gewijzigd; meld opnieuw aan.');
    const accessToken = await exchangeOAuthCode(
      region.value,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect,
        client_id: clientId.value,
        code_verifier: verifier,
      }),
    );
    if (initialContext !== context())
      throw Error('OAuth-configuratie gewijzigd tijdens aanmelden.');
    sessionStorage.setItem('wfm_auth_context', initialContext);
    token.value = accessToken;
    sessionStorage.setItem('wfm_token', accessToken);
    clearPendingLogin();
    history.replaceState({}, '', redirect + location.hash);
  }
  watch(
    [clientId, region],
    () => {
      logout();
      saveConfig();
    },
    { flush: 'sync' },
  );
  return {
    clientId,
    region,
    token,
    redirect,
    saveConfig,
    login,
    logout,
    callback,
    clearPendingLogin,
  };
}
