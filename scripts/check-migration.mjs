import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const app = readFileSync('src/App.vue', 'utf8');
const src = readFileSync('src/composables/useAvailabilityManager.js', 'utf8');
const api = readFileSync('src/services/genesysApi.ts', 'utf8');
const plan = readFileSync('src/services/workforceManagement.ts', 'utf8');
assert.match(app, /Capaciteit &amp; beschikbaarheid/);
assert.match(app, /v0\.2\.0/);
assert.match(src, /queryAgentWorkPlans\(api,/);
assert.doesNotMatch(src, /planByAgent\.set/);
assert.match(api, /onUnauthorized/);
assert.match(plan, /weekCount: 1/);
console.log('Static migration checks passed. No Genesys integration tests executed.');
