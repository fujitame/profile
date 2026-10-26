const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('email-engagement.js','utf8');
function harness(token='a'.repeat(64)){
 const events=[],listeners={},states=new Map(),frames=new Map();let tick,time=0,position=0,hidden=false,replaced=false;
 const c={URLSearchParams,Blob,Set,Map,innerHeight:900,innerWidth:1200,location:{hash:token?'#rt='+token:'',pathname:'/profile/',search:''},history:{replaceState:()=>{replaced=true;}},performance:{now:()=>time},navigator:{sendBeacon:(url,body)=>{events.push(body);return true;}},document:{readyState:'complete',get visibilityState(){return hidden?'hidden':'visible';},hasFocus:()=>!hidden,addEventListener:(type,fn)=>listeners[type]=fn,getElementById:id=>{if(!frames.has(id))frames.set(id,{getBoundingClientRect:()=>({width:600,height:300,top:1,left:1,bottom:301,right:601})});return frames.get(id);},querySelector:()=>null,head:{appendChild:()=>{}},createElement:()=>({})},setInterval:fn=>tick=fn,fetch:()=>{throw Error('unexpected fetch');},YT:{Player:function(id,options){const p={state:0,getPlayerState:()=>p.state,getCurrentTime:()=>position,getVideoData:()=>({video_id:'video'})};states.set(id,p);return p;}}};
 c.window=c;vm.createContext(c);vm.runInContext(source,c);
 return {events,listeners,states,replaced,hide:x=>hidden=x,advance:(n,step=1)=>{for(let i=0;i<n;i++){time+=1000;position+=step;tick?.();}}};
}
async function names(h){return Promise.all(h.events.map(async b=>JSON.parse(await b.text()).event));}
(async()=>{
 const no=harness('');assert(!no.replaced);no.advance(40);assert.equal(no.events.length,0);
 const h=harness();assert(h.replaced);h.advance(20);assert.equal(h.events.length,0);
 h.listeners.pointerdown({isTrusted:false});h.advance(20);assert.equal(h.events.length,0);
 h.listeners.pointerdown({isTrusted:true});h.hide(true);h.advance(20);assert.equal(h.events.length,0);h.hide(false);h.advance(15);
 assert((await names(h)).includes('profile_active_15s'));assert.equal((await names(h)).filter(n=>n==='profile_interaction').length,1);
 h.states.get('iframe-primary').state=1;h.hide(true);h.advance(40);assert(!(await names(h)).includes('video_start'));
 h.hide(false);h.advance(20,10);assert((await names(h)).includes('video_start'));assert(!(await names(h)).includes('video_30s'));
 h.advance(31);assert((await names(h)).includes('video_30s'));h.advance(40);assert.equal((await names(h)).filter(n=>n==='video_30s').length,1);
 const pdf={hasAttribute:()=>true,getAttribute:()=>'/resume.pdf'};h.listeners.click({isTrusted:false,target:{closest:()=>pdf}});assert(!(await names(h)).includes('resume_click'));
 h.listeners.click({isTrusted:true,target:{closest:()=>pdf}});assert((await names(h)).includes('resume_click'));
 console.log('PASS: attributed visits only; trusted gestures; foreground dwell; hidden playback excluded; seek excluded; 30s playback; bounded dedup; Resume click. DOM/YouTube mocked.');
})().catch(e=>{console.error(e);process.exitCode=1;});
