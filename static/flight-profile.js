const svgNS='http://www.w3.org/2000/svg';
const colors={green:'#43a879',red:'#e87573',brown:'#956846',yellow:'#d8a923'};
export function pointAtX(x){
  return {x,y:x<=54||x>=254?118:118-86*Math.sin(Math.PI*(x-54)/200)**2};
}
export function profilePosition(phase){
  const progress=Math.max(0,Math.min(1,phase.progress));
  let bounds;
  if(phase.index===0)bounds=phase.t<0?[18,54]:[254,290];
  else bounds=({1:[54,116],2:[116,126],3:[126,194],4:[194,201],5:[201,254]})[phase.index];
  return pointAtX(bounds[0]+(bounds[1]-bounds[0])*progress);
}
function pathBetween(start,end){
  const steps=Math.ceil(end-start);
  const points=Array.from({length:steps+1},(_,i)=>pointAtX(start+(end-start)*i/steps));
  return points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}
export function createFlightProfile(svg){
  const track=svg.querySelector('.profile-track');
  for(const [start,end,color] of [[18,54,'green'],[54,116,'red'],[116,126,'brown'],[126,194,'yellow'],[194,201,'brown'],[201,254,'red'],[254,290,'green']]){
    const path=document.createElementNS(svgNS,'path');
    path.setAttribute('d',pathBetween(start,end));path.setAttribute('stroke',colors[color]);track.append(path);
  }
  svg.querySelector('.profile-area').setAttribute('d',`${pathBetween(18,290)} L290,130 L18,130 Z`);
  const marker=svg.querySelector('.profile-marker');
  const guide=svg.querySelector('.profile-guide');
  const description=svg.querySelector('desc');
  return phase=>{
    const {x,y}=profilePosition(phase);
    marker.setAttribute('transform',`translate(${x.toFixed(3)} ${y.toFixed(3)})`);
    marker.style.color=colors[phase.color];
    guide.setAttribute('x1',x);guide.setAttribute('x2',x);guide.setAttribute('y1',y+9);
    description.textContent=`Current position: ${phase.name.toLowerCase()}, ${phase.g} g. The dot follows the training timer.`;
  };
}
