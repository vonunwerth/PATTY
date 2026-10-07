import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('static/audio-engine.js','utf8');
const {SpeechPlayer,trimSilence}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const timeline=readFileSync('static/timeline.js','utf8');
const {buildEvents}=await import('data:text/javascript;base64,'+Buffer.from(timeline).toString('base64'));
const nodes=[];
const context={currentTime:10,createBufferSource(){
  const node={playbackRate:{value:1},connect(){},disconnect(){},start(t){this.time=t;},stop(){this.stopped=true;}};
  nodes.push(node);return node;
},createBuffer(channels,length,rate){
  const data=new Float32Array(length);
  return {length,sampleRate:rate,copyToChannel(samples){data.set(samples);},getChannelData(){return data;}};
}};
const samples=new Float32Array(1000);samples.fill(0.2,100,600);
const trimmed=trimSilence(context,{length:1000,numberOfChannels:1,sampleRate:1000,getChannelData:()=>samples});
assert.equal(trimmed.length,520);
assert.equal(trimmed.getChannelData()[10],samples[100]);
const player=new SpeechPlayer({});player.context=context;player.gain={gain:{value:1}};
const events=buildEvents(1).filter(e=>e.time>=55&&e.time<=61);
assert.deepEqual(events.map(e=>e.label),['5','4','3','2','1','PULL UP','30']);
events.forEach(e=>player.buffers.set(e.speech,{duration:1.1}));
player.start(events,55);
assert.equal(nodes.length,7);
nodes.forEach((node,i)=>{
  assert.ok(Math.abs(node.time-(10.03+i))<1e-8);
  if(i<6)assert.ok(1.1/node.playbackRate.value<1);
});
context.currentTime=14;assert.ok(Math.abs(player.elapsed()-58.97)<1e-8);
player.mute(true);assert.equal(player.gain.gain.value,0);
player.mute(false);assert.equal(player.gain.gain.value,1);
player.stop();assert.ok(nodes.every(n=>n.stopped));
const resumed=events.filter(e=>e.time>=59);player.start(resumed,58.5);
assert.equal(nodes.length,10);assert.ok(Math.abs(nodes[7].time-14.53)<1e-8);
console.log('Audio: silence trimming, all countdown calls, exact spacing, no overlap, pause/resume and mute passed.');
