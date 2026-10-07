import {createFlightProfile} from './flight-profile.js';
import {SpeechPlayer} from './audio-engine.js';
import audioSources from './speech-assets.js';
import {calls,buildSession,phaseAt} from './timeline.js';
const localeData=await fetch(new URL('./locales.json',import.meta.url)).then(response=>response.json());
const $=id=>document.getElementById(id);
const player=new SpeechPlayer(audioSources);
const updateFlightProfile=createFlightProfile($('flight-profile'));
let language=localStorage.getItem('parabel-language')||'en';
if(!localeData[language])language='en';
let locale=localeData[language],count=5,session=buildSession(5),events=session.events,cursor=0,elapsed=0,running=false,finished=false,muted=false,loading=false,generation=0;
const tr=(key,vars={})=>Object.entries(vars).reduce((value,[name,replacement])=>value.replaceAll(`{${name}}`,replacement),locale.ui[key]??key);
const callText=(event,field='label')=>{const key=event.label.replace(/ · P\d+$/,'');const values=localeData.en[field==='speech'?'speech':'calls'];return (values[key]??event[field]).replace('{n}',String(event.parabola));};
const phaseCopy=(phase)=>{
  const names=['steady','pullUp','injection','zeroG','pullOutTransition','pullOut'];
  const descriptions=['preparation','climb','gravityDown','weightlessness','gravityUp','recovery'];
  const next=['steady','pullUp','injection','zeroG','onePointEight','steady'];
  const before=phase.t<0||phase.parabola===0;
  const key=before?'steady':names[phase.index]??'steady';
  return {name:locale.phases[key],description:locale.descriptions[before?'recoveryBefore':descriptions[phase.index]??'preparation'],next:locale.next[before?'oneMinute':next[phase.index]??'nextMinute']};
};
function applyLocale(){
  document.documentElement.lang=language;document.title=tr('documentTitle');
  document.querySelectorAll('[data-i18n]').forEach(node=>{const key=node.dataset.i18n;const value=locale.ui[key]??(key==='language'?locale.name:undefined);if(value!==undefined)node.textContent=value;});
  const note=document.querySelector('[data-i18n="scheduleNote"]');if(note)note.textContent=localeData.notes[language];
  document.querySelectorAll('[data-language]').forEach(button=>{const active=button.dataset.language===language;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});$('voice-status').textContent=tr('voiceReady');
  document.querySelectorAll('[data-phase-name]').forEach(node=>{node.firstChild.textContent=locale.phases[node.dataset.phaseName];});
  document.querySelectorAll('[data-phase-detail]').forEach(node=>{node.textContent=localeData.phaseDetails[language][node.dataset.phaseDetail];});
  document.querySelectorAll('#schedule td:nth-child(2)').forEach((cell,index)=>{const call=calls[index];if(call)cell.textContent=localeData.en.calls[call[1]]??call[1];});
  render();
}
const duration=()=>session.duration;
const clock=s=>`${String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,s)%60)).padStart(2,'0')}`;
function stopSpeech(){generation++;player.stop();loading=false;}
function announce(event){$('announcement').textContent=callText(event);}
async function preview(countdown=false){
  if(running||loading)return;
  stopSpeech();const token=generation;loading=true;render();
  const audioLocale=localeData.en;
  const previewEvents=countdown?calls.filter(([t])=>t>=-5&&t<=0).map(([t,label,speech])=>({time:t+5,label,speech:audioLocale.speech[label]})):[{time:0,speech:audioLocale.speech['ONE MINUTE'].replace('{n}','1')}];
  try{
    await player.prepare(previewEvents.map(e=>e.speech));
    if(token!==generation)return;
    player.start(previewEvents,0,muted);
    $('voice-status').textContent=muted?tr('soundMuted'):countdown?tr('playingCountdown'):tr('playingVoice');
  }catch(error){if(token===generation)$('voice-status').textContent=tr('audioError');}
  finally{if(token===generation){loading=false;render();}}
}
function render(){
  const p=phaseAt(elapsed-session.offset,count);
  const copy=phaseCopy(p);
  updateFlightProfile({...p,name:copy.name,description:copy.description});
  $('counter').textContent=String(p.parabola).padStart(2,'0');$('total').textContent=` / ${String(count).padStart(2,'0')}`;
  $('elapsed').textContent=clock(elapsed);$('g').textContent=p.g;$('gravity').className=`gravity ${p.color}`;
  $('phase').textContent=copy.name;$('phase-description').textContent=finished?tr('trainingComplete'):copy.description;
  $('phase-index').textContent=tr('phaseIndex',{current:`0${p.index+1}`});$('next-phase').textContent=finished?tr('trainingComplete'):copy.next;
  $('remaining').textContent=finished?'00:00':clock(Math.ceil(p.remaining));$('progress').style.width=`${finished?100:Math.min(100,p.progress*100)}%`;
  $('status').textContent=finished?tr('completed'):running?tr('running'):elapsed>0?tr('paused'):tr('ready');
  $('start').disabled=loading;$('test-voice').disabled=running||loading;$('test-countdown').disabled=running||loading;
  $('start').textContent=loading?tr('audioPreparing'):finished?tr('trainAgain'):running?tr('pause'):elapsed>0?tr('resume'):tr('start');
  $('count').disabled=loading||running||elapsed>0;$('entry').disabled=loading||running||elapsed>0;
  const next=events[cursor];$('next-call').textContent=finished?tr('trainingComplete'):next?tr('next',{call:callText(next),time:clock(Math.ceil(next.time-elapsed))}):'';
  document.querySelectorAll('[data-phase]').forEach(el=>el.classList.toggle('active',Number(el.dataset.phase)===p.index));
}
function tick(){
  if(!running)return;
  elapsed=Math.min(duration(),player.elapsed());
  let latest=null;
  while(cursor<events.length && events[cursor].time<=elapsed)latest=events[cursor++];
  if(latest)announce(latest);
  if(elapsed>=duration()){running=false;finished=true;}
  render();
}
function reset(){running=false;finished=false;elapsed=0;cursor=0;stopSpeech();count=Math.max(1,Math.min(100,Math.round(Number($('count').value)||5)));$('count').value=count;session=buildSession(count,$('entry').value==='recovery');events=session.events;$('announcement').textContent=tr('readyTraining');render();}
async function toggle(){
  if(loading)return;
  if(running){tick();running=false;stopSpeech();render();return;}
  if(finished)reset();
  if(elapsed===0){
    count=Math.max(1,Math.min(100,Math.round(Number($('count').value)||5)));
    $('count').value=count;
    session=buildSession(count,$('entry').value==='recovery');
    events=session.events;cursor=0;finished=false;
  }
  stopSpeech();const token=generation;loading=true;render();
  $('voice-status').textContent=tr('audioPreparing');
  try{
    await player.prepare(events.map(e=>e.speech));
    if(token!==generation)return;
    player.start(events.slice(cursor),elapsed,muted);
    running=true;loading=false;
    $('voice-status').textContent=tr('audioReady');
    tick();
  }catch(error){if(token===generation){loading=false;running=false;$('voice-status').textContent=tr('audioError');render();}}
}
$('start').addEventListener('click',toggle);$('reset').addEventListener('click',reset);$('count').addEventListener('change',reset);$('entry').addEventListener('change',reset);
$('mute').addEventListener('click',()=>{muted=!muted;player.mute(muted);$('mute').textContent=muted?tr('soundOff'):tr('soundOn');$('mute').setAttribute('aria-pressed',String(muted));$('mute').setAttribute('aria-label',muted?tr('unmute'):tr('mute'));});
$('test-voice').addEventListener('click',()=>preview());
$('test-countdown').addEventListener('click',()=>preview(true));
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='Fullscreen unavailable';}}
$('fullscreen').addEventListener('click',fullscreen);
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ Exit fullscreen':'⛶ Fullscreen';});
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','TEXTAREA','SUMMARY'].includes(e.target.tagName)||e.repeat)return;if(e.code==='Space'){e.preventDefault();toggle();}if(e.key.toLowerCase()==='f')fullscreen();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(running){tick();running=false;stopSpeech();render();$('status').textContent=tr('paused');}else{stopSpeech();render();}}});
window.addEventListener('pagehide',()=>stopSpeech());
const table=document.createElement('table');
calls.forEach(([t,label])=>{const row=table.insertRow();row.insertCell().textContent=`${t<0?'−':'+'}${Math.abs(t)} s`;row.insertCell().textContent=localeData.en.calls[label]??label;});$('schedule').append(table);
$('voice').replaceChildren(new Option('Microsoft Zira · English (synchronised audio)','local'));
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.language;localStorage.setItem('parabel-language',language);locale=localeData[language]??localeData.en;applyLocale();}));
applyLocale();
$('voice-status').textContent=tr('voiceReady');
setInterval(tick,25);
render();
