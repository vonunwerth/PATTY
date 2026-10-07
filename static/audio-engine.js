export function trimSilence(context, buffer) {
  let first=buffer.length, last=-1;
  for(let c=0;c<buffer.numberOfChannels;c++){
    const samples=buffer.getChannelData(c);
    for(let i=0;i<samples.length;i++)if(Math.abs(samples[i])>0.003){first=Math.min(first,i);last=Math.max(last,i);}
  }
  if(last<first)throw new Error('Silent speech file');
  const margin=Math.round(buffer.sampleRate*0.01);
  first=Math.max(0,first-margin);last=Math.min(buffer.length,last+margin+1);
  const trimmed=context.createBuffer(buffer.numberOfChannels,last-first,buffer.sampleRate);
  for(let c=0;c<buffer.numberOfChannels;c++)trimmed.copyToChannel(buffer.getChannelData(c).subarray(first,last),c);
  return trimmed;
}

export class SpeechPlayer {
  constructor(sources,contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)()){
    this.sources=sources;this.contextFactory=contextFactory;this.buffers=new Map();this.nodes=new Set();
  }
  async prepare(texts){
    if(!this.context){this.context=this.contextFactory();this.gain=this.context.createGain();this.gain.connect(this.context.destination);}
    await this.context.resume();
    await Promise.all([...new Set(texts)].map(async text=>{
      if(this.buffers.has(text))return;
      const path=this.sources[text];
      if(!path)throw new Error(`Missing speech: ${text}`);
      const response=await fetch(new URL(path,import.meta.url));
      if(!response.ok)throw new Error(`Audio HTTP ${response.status}`);
      const buffer=trimSilence(this.context,await this.context.decodeAudioData(await response.arrayBuffer()));
      this.buffers.set(text,buffer);
    }));
  }
  start(events,elapsed=0,muted=false){
    this.stop();this.gain.gain.value=muted?0:1;
    this.epoch=this.context.currentTime+0.03-elapsed;
    events.forEach((event,index)=>{
      const buffer=this.buffers.get(event.speech);
      if(!buffer)throw new Error(`Audio not prepared: ${event.speech}`);
      const node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.gain);
      const slot=events[index+1]?events[index+1].time-event.time:Infinity;
      node.playbackRate.value=Math.max(1,buffer.duration/Math.max(0.05,slot-0.025));
      node.onended=()=>{this.nodes.delete(node);node.disconnect();};
      this.nodes.add(node);node.start(this.epoch+event.time);
    });
  }
  elapsed(){return Math.max(0,this.context.currentTime-this.epoch);}
  mute(value){if(this.gain)this.gain.gain.value=value?0:1;}
  stop(){for(const node of this.nodes){node.stop();node.disconnect();}this.nodes.clear();}
}
