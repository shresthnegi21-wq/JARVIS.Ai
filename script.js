const $=s=>document.querySelector(s);
const core=$('#core'),stat=$('#status'),log=$('#log'),mic=$('#mic');
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let lang=localStorage.jl||'en-IN',rec,on=false,hist=[];
const SITES={youtube:'youtube.com','यूट्यूब':'youtube.com',google:'google.com','गूगल':'google.com',gmail:'mail.google.com','जीमेल':'mail.google.com',whatsapp:'web.whatsapp.com','व्हाट्सएप':'web.whatsapp.com',instagram:'instagram.com','इंस्टाग्राम':'instagram.com',facebook:'facebook.com','फेसबुक':'facebook.com',twitter:'x.com',github:'github.com',maps:'maps.google.com','मैप्स':'maps.google.com',wikipedia:'wikipedia.org',amazon:'amazon.in','अमेज़न':'amazon.in',flipkart:'flipkart.com','फ्लिपकार्ट':'flipkart.com'};

function state(s,t){core.className=s;stat.textContent=t||s}
function add(cls,txt,link){const d=document.createElement('div');d.className=cls;d.textContent=txt;
  if(link){const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener';a.textContent=' Tap to open';d.append(a)}
  log.append(d);log.scrollTop=log.scrollHeight}
function speak(txt){return new Promise(res=>{
  if(!window.speechSynthesis){state('idle','Standby');return res()}
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(txt);
  u.lang=/[\u0900-\u097F]/.test(txt)?'hi-IN':'en-IN';
  const v=speechSynthesis.getVoices().find(v=>v.lang.replace('_','-')===u.lang);if(v)u.voice=v;
  u.onstart=()=>state('speaking','Speaking');
  u.onend=u.onerror=()=>{state('idle','Standby');res()};
  speechSynthesis.speak(u)})}
async function say(txt,link){add('j',txt,link);await speak(txt)}

async function brain(text){
  const proxy=localStorage.jproxy;
  if(!proxy)return say('My AI brain is not connected yet. Tap the gear icon and paste your proxy URL.');
  state('thinking','Thinking');
  hist.push({role:'user',content:text});
  try{
    const r=await fetch(proxy,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:hist.slice(-10)})});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const {reply}=await r.json();
    hist.push({role:'assistant',content:reply});
    await say(reply);
  }catch(e){hist.pop();await say('Brain connection failed. '+e.message)}
}

async function handle(raw){
  add('u',raw);
  const q=raw.toLowerCase().replace(/^(hey |ok |हे )?(jarvis|जार्विस|जारविस)[, ]*/,'').trim();
  const now=new Date(),hi=/[\u0900-\u097F]/.test(q);
  if(/\btime\b|समय|टाइम|कितने बजे/.test(q))
    return say((hi?'अभी समय है ':'The time is ')+now.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}));
  if(/\b(date|day)\b|तारीख|तारिख|कौन सा दिन|आज कौन/.test(q)&&!/\b(open|search)\b/.test(q))
    return say((hi?'आज की तारीख है ':'Today is ')+now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
  const s=q.match(/^(?:search|google|सर्च)\s+(?:for\s+)?(.+)/);
  if(s){const u='https://www.google.com/search?q='+encodeURIComponent(s[1]);window.open(u,'_blank');return say('Searching for '+s[1],u)}
  const o=/(open|launch|go to|खोलो|खोलिए|खोल दो|खोल|ओपन करो|ओपन)/;
  if(o.test(q)){
    const name=q.replace(new RegExp(o,'g'),'').replace(/\b(the|website|please)\b|करो|दो|वेबसाइट/g,'').trim();
    let host=SITES[name]||Object.entries(SITES).find(([k])=>name.includes(k))?.[1];
    if(!host&&/^[\w-]+(\.[\w-]+)+$/.test(name))host=name;
    const u=host?'https://'+host:'https://www.google.com/search?q='+encodeURIComponent(name);
    window.open(u,'_blank');
    return say((hi?'खोल रहा हूँ ':'Opening ')+(host||name),u);
  }
  return brain(raw);
}

async function listen(){
  if(!SR)return say('This browser has no voice recognition. Open the app in Chrome, or type.');
  if(on){rec.stop();return}
  speechSynthesis.cancel();
  try{const m=await navigator.mediaDevices.getUserMedia({audio:true});m.getTracks().forEach(t=>t.stop())}
  catch(e){return say('Microphone is blocked. In Chrome: menu, Settings, Site settings, Microphone, allow this site.')}
  let heard=false,err=false;
  rec=new SR();rec.lang=lang;rec.interimResults=true;rec.maxAlternatives=1;
  rec.onstart=()=>{on=true;mic.classList.add('on');state('listening','Listening')};
  rec.onresult=e=>{heard=true;const r=e.results[e.results.length-1];stat.textContent=r[0].transcript;if(r.isFinal)handle(r[0].transcript)};
  rec.onerror=e=>{err=true;add('j','Mic error: '+e.error+(e.error==='network'?' (needs internet)':/not-allowed/.test(e.error)?' (allow the microphone and the Google voice service)':''))};
  rec.onend=()=>{on=false;mic.classList.remove('on');if(!heard&&!err)add('j',"I didn't catch anything. Tap the mic, wait for Listening, then speak.");if(core.className==='listening')state('idle','Standby')};
  rec.start();
}

mic.onclick=listen;
$('#f').onsubmit=e=>{e.preventDefault();const v=$('#t').value.trim();if(v){$('#t').value='';handle(v)}};
const lb=$('#lang');lb.textContent=lang==='hi-IN'?'HI-IN':'EN-IN';
lb.onclick=()=>{lang=lang==='en-IN'?'hi-IN':'en-IN';localStorage.jl=lang;lb.textContent=lang==='hi-IN'?'HI-IN':'EN-IN'};
$('#cfg').onclick=()=>{const v=prompt('Paste your Cloudflare Worker URL (the AI proxy):',localStorage.jproxy||'');if(v!==null){localStorage.jproxy=v.trim();say('Settings saved.')}};
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js'));
add('j','Systems online. Tap the microphone and speak, or type a command.');
