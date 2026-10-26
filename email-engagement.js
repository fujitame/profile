(() => {
 "use strict";
 const hash=new URLSearchParams(location.hash.slice(1)),token=hash.get("rt")||"";
 if(!/^[0-9a-f]{64}$/.test(token))return;
 // Keep the email attribution token in memory, never in outgoing links, storage or referrers.
 history.replaceState(null,"",location.pathname+location.search);
 if(navigator.webdriver)return;
 const endpoint="https://cjrabdfdtrufbpjmqddh.supabase.co/functions/v1/recruiting-email-events";
 const sent=new Set(),players=new Map();let interacted=false,activeSeconds=0,lastTick=performance.now();
 const visible=()=>document.visibilityState==="visible"&&document.hasFocus();
 function signal(event,video_slot=""){
  const key=event+":"+video_slot;if(sent.has(key))return;sent.add(key);
  const body=JSON.stringify({token,event,video_slot});
  try{if(navigator.sendBeacon?.(endpoint,new Blob([body],{type:"text/plain;charset=UTF-8"})))return;}catch{}
  fetch(endpoint,{method:"POST",headers:{"content-type":"text/plain;charset=UTF-8"},body,keepalive:true,credentials:"omit",referrerPolicy:"no-referrer"}).catch(()=>{});
 }
 function gesture(e){if(e.isTrusted&&visible())interacted=true;}
 for(const event of ["pointerdown","keydown","wheel","touchstart"])document.addEventListener(event,gesture,{passive:true,capture:true});
 document.addEventListener("click",e=>{
  if(!e.isTrusted||!visible())return;interacted=true;
  const link=e.target.closest?.("a");if(!link)return;
  if(link.hasAttribute("download")||/\.pdf(?:$|[?#])/i.test(link.getAttribute("href")||""))signal("resume_click");
  if(link.id==="link-primary")signal("profile_youtube_click","primary");
  if(link.id==="link-secondary")signal("profile_youtube_click","secondary");
 },true);
 const inView=frame=>{const r=frame.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;};
 function attachPlayers(){
  if(!window.YT?.Player)return;
  for(const [id,slot] of [["iframe-primary","primary"],["iframe-secondary","secondary"]]){
   const frame=document.getElementById(id);if(!frame||players.has(slot))continue;
   const entry={frame,player:null,seconds:0,lastPosition:null,video:""};players.set(slot,entry);
   entry.player=new YT.Player(id,{events:{onStateChange:e=>{
    if(e.data===1&&visible()&&inView(entry.frame)){interacted=true;signal("video_start",slot);}
   }}});
  }
 }
 const previous=window.onYouTubeIframeAPIReady;
 window.onYouTubeIframeAPIReady=()=>{try{previous?.();}finally{attachPlayers();}};
 function initialize(){
  if(window.YT?.Player)attachPlayers();
  else if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";s.async=true;document.head.appendChild(s);}
  setInterval(()=>{
   const now=performance.now(),elapsed=Math.min(Math.max((now-lastTick)/1000,0),2);lastTick=now;
   if(visible()&&interacted){activeSeconds+=elapsed;if(activeSeconds>=5)signal("profile_interaction");if(activeSeconds>=15)signal("profile_active_15s");}
   for(const [slot,e] of players){
    try{
     const position=e.player?.getCurrentTime?.(),video=e.player?.getVideoData?.()?.video_id||"";
     if(video!==e.video){e.video=video;e.seconds=0;e.lastPosition=null;}
     const playing=e.player?.getPlayerState?.()===1,delta=e.lastPosition==null?0:position-e.lastPosition;
     if(playing&&visible()&&inView(e.frame)){
      signal("video_start",slot);
      // Count playback progress only while visible. Seeking forward does not earn watched time.
      if(Number.isFinite(delta)&&delta>0&&delta<=3)e.seconds+=Math.min(elapsed,delta);
      if(e.seconds>=30)signal("video_30s",slot);
     }
     e.lastPosition=position;
    }catch{}
   }
  },1000);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();
