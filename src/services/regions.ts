// Exact public Genesys Cloud region domains; never accept arbitrary token destinations.
const regions = new Set([
  'mypurecloud.com', 'mypurecloud.ie', 'mypurecloud.de', 'mypurecloud.com.au',
  'mypurecloud.jp', 'usw2.pure.cloud', 'cac1.pure.cloud', 'euw2.pure.cloud',
  'apne2.pure.cloud', 'aps1.pure.cloud', 'aps2.pure.cloud', 'apne3.pure.cloud',
  'euc2.pure.cloud', 'mec1.pure.cloud', 'sae1.pure.cloud', 'use2.us-gov-pure.cloud',
]);
export function validateRegion(value: string): string {
  if (!regions.has(value)) throw new Error('Onbekende Genesys Cloud-regio. Gebruik een ondersteund regiodomein.');
  return value;
}
