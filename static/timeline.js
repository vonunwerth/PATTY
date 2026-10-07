export const calls = [
  [-60, 'ONE MINUTE', 'One minute. P {n}.'], [-30, '30 SECONDS', 'Thirty seconds.'],
  [-20, '20', 'Twenty.'], [-10, '10', 'Ten.'],
  [-5, '5', 'Five.'], [-4, '4', 'Four.'], [-3, '3', 'Three.'], [-2, '2', 'Two.'], [-1, '1', 'One.'],
  [0, 'PULL UP', 'Pull up.'], [1, '30', 'Thirty.'], [18, '40', 'Forty.'],
  [21, 'INJECTION', 'Injection.'], [40, '20', 'Twenty.'], [43, '30', 'Thirty.'],
  [46, 'PULL OUT', 'Pull out.'], [72, 'STEADY FLIGHT', 'Steady flight.']
];
export function buildEvents(count) {
  return Array.from({length:count}, (_,i) => calls.map(([t,label,speech]) => ({
    time:i*172+t+60, label:label==='ONE MINUTE'?`${label} · P${i+1}`:label,
    speech:speech.replace('{n}',i+1), parabola:i+1
  }))).flat();
}
export function phaseAt(elapsed, count) {
  if(elapsed<0) return {parabola:0,index:0,g:'1',color:'green',name:'STEADY FLIGHT',description:'Recovery before P1',next:'ONE MINUTE P1 IN',remaining:-elapsed,progress:(elapsed+40)/40};
  const index=Math.min(count-1,Math.floor(elapsed/172));
  const t=elapsed-index*172-60;
  const common={parabola:index+1,t};
  if(t<0) return {...common,index:0,g:'1',color:'green',name:'STEADY FLIGHT',description:'Prepare for the next parabola',next:'PULL UP IN',remaining:-t,progress:(t+60)/60};
  if(t<21) return {...common,index:1,g:'1.8',color:'red',name:'PULL UP',description:'Climb · increased gravity',next:'INJECTION IN',remaining:21-t,progress:t/21};
  if(t<24) return {...common,index:2,g:(1.8*(24-t)/3).toFixed(2),color:'brown',name:'INJECTION · TRANSITION',description:'Gravity decreasing from 1.8 g to 0 g',next:'ZERO-G IN',remaining:24-t,progress:(t-21)/3};
  if(t<46) return {...common,index:3,g:'0',color:'yellow',name:'ZERO-G',description:'Weightlessness · practise your procedure',next:'PULL OUT IN',remaining:46-t,progress:(t-24)/22};
  if(t<48) return {...common,index:4,g:(1.8*(t-46)/2).toFixed(2),color:'brown',name:'PULL OUT · TRANSITION',description:'Gravity increasing from 0 g to 1.8 g',next:'1.8 G IN',remaining:48-t,progress:(t-46)/2};
  if(t<72) return {...common,index:5,g:'1.8',color:'red',name:'PULL OUT',description:'Recovery · increased gravity',next:'STEADY FLIGHT IN',remaining:72-t,progress:(t-48)/24};
  return {...common,index:0,g:'1',color:'green',name:'STEADY FLIGHT',description:'Recovery and preparation',next:'NEXT ONE MINUTE CALL IN',remaining:Math.max(0,112-t),progress:(t-72)/40};
}
export function buildSession(count, recovery=false) {
  const offset=recovery?40:0;
  return {offset, duration:(count-1)*172+132+offset, events:[
    ...(recovery?[{time:0,label:'STEADY FLIGHT',speech:'Steady flight.',parabola:0}]:[]),
    ...buildEvents(count).map(event=>({...event,time:event.time+offset}))
  ]};
}
