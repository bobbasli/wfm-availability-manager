import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createPkceRequest } from '../src/services/oauth';
it('bouwt S256 PKCE met unieke state, verifier en exacte redirect',async()=>{
  const redirect='https://example.invalid/wfm/';
  const first=await createPkceRequest('mypurecloud.de','synthetic-client',redirect);
  const second=await createPkceRequest('mypurecloud.de','synthetic-client',redirect);
  expect(first.url.origin).toBe('https://login.mypurecloud.de');
  expect(first.url.searchParams.get('redirect_uri')).toBe(redirect);
  expect(first.url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(first.url.searchParams.get('code_challenge')).toBe(createHash('sha256').update(first.verifier).digest('base64url'));
  expect(first.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(first.state).not.toBe(second.state);expect(first.verifier).not.toBe(second.verifier);
});
