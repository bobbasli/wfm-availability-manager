export interface ShiftDuration {paidMinutes:number;unpaidMinutes:number;totalMinutes:number;paidMode:'exact'|'maximum'}
export function shiftRecord(value:unknown):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Dienstdefinitie ontbreekt of is ongeldig.');
  return value as Record<string,unknown>;
}
export function shiftMinutes(value:unknown,field:string):number {
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw Error(`${field} ontbreekt of is ongeldig.`);
  return value;
}
/** Missing mode is accepted only when the exact field is unambiguous. */
export function flexibleMode(shift:Record<string,unknown>,flag:string,exact:string,range:string[]):boolean {
  const mode=shift[flag];
  if(typeof mode==='boolean')return mode;
  if(mode===undefined&&shift[exact]!==undefined&&range.every(field=>shift[field]===undefined))return false;
  throw Error(`${flag} ontbreekt of is ongeldig; vast en flexibel zijn niet eenduidig te onderscheiden.`);
}
/** Paid time is already the total for ALL paid activities in the shift. */
export function totalShiftDuration(value:unknown):ShiftDuration {
  const shift=shiftRecord(value);
  const flexible=flexibleMode(shift,'flexiblePaidTime','exactPaidTimeMinutes',['minimumPaidTimeMinutes','maximumPaidTimeMinutes']);
  const paidField=flexible?'maximumPaidTimeMinutes':'exactPaidTimeMinutes';
  const paidMinutes=shiftMinutes(shift[paidField],paidField);
  if(!paidMinutes)throw Error(`${paidField} moet groter dan nul zijn.`);
  if(flexible){const min=shiftMinutes(shift.minimumPaidTimeMinutes,'minimumPaidTimeMinutes');if(min>paidMinutes)throw Error('minimumPaidTimeMinutes is groter dan maximumPaidTimeMinutes.');}
  // Absence does not prove that there are no unpaid breaks.
  if(!Array.isArray(shift.activities))throw Error('activities ontbreekt of is ongeldig; onbetaalde activiteiten worden niet als nul aangenomen. Alleen een expliciete lege lijst bevestigt dat er geen activiteiten zijn.');
  let unpaidMinutes=0;
  for(let i=0;i<shift.activities.length;i++){
    const activity=shiftRecord(shift.activities[i]);
    if(typeof activity.countsAsPaidTime!=='boolean')throw Error(`activities[${i}].countsAsPaidTime ontbreekt of is ongeldig.`);
    if(!activity.countsAsPaidTime)unpaidMinutes+=shiftMinutes(activity.lengthMinutes,`activities[${i}].lengthMinutes`);
  }
  const totalMinutes=paidMinutes+unpaidMinutes;
  if(totalMinutes>1440)throw Error('Totale dienstduur inclusief onbetaalde activiteiten is langer dan 24 uur; meer weekgrenscontext is nodig.');
  return {paidMinutes,unpaidMinutes,totalMinutes,paidMode:flexible?'maximum':'exact'};
}
