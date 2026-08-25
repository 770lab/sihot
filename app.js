/* Si'hot du Rabbi par paracha — 770lab.com/sihot */
(function(){
const $=s=>document.querySelector(s);
const P=window.PARSHIOT, BOOKS=window.BOOKS;
const bySlug=Object.fromEntries(P.map(p=>[p[0],p]));
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9֐-׿]+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let INDEX=null, cache={}, weekSlugs=[];
const V='?v=9291c7ce';

/* ---------- volume label ---------- */
const HEBNUM={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ל':30,'מ':40};
function volNum(volname){ // "חלק כט" → 29
  const m=volname.replace('חלק','').replace(/["'״׳]/g,'').trim();
  let n=0; for(const c of m) n+=HEBNUM[c]||0; return n||volname;
}

/* ---------- data ---------- */
async function loadIndex(){ if(INDEX) return INDEX; INDEX=await (await fetch('data/index.json'+V)).json(); return INDEX; }
async function loadParsha(slug){
  if(cache[slug]) return cache[slug];
  const [he,fr]=await Promise.all([
    fetch(`data/he/${slug}.json`+V).then(r=>r.json()),
    fetch(`data/fr/${slug}.json`+V).then(r=>r.ok?r.json():null).catch(()=>null)
  ]);
  cache[slug]={he,fr}; return cache[slug];
}

/* ---------- search ---------- */
function matches(q){
  q=norm(q); if(!q) return [];
  return P.filter(p=>{
    const hay=norm(p[1]+' '+p[2]+' '+p[3]+' '+p[0]);
    return q.split(' ').every(w=>hay.includes(w));
  }).slice(0,8);
}
const qi=$('#q'), sg=$('#sugg'); let sel=-1;
qi.addEventListener('input',()=>{const r=matches(qi.value); sel=-1; renderSugg(r);});
qi.addEventListener('keydown',e=>{
  const btns=[...sg.querySelectorAll('button')];
  if(e.key==='ArrowDown'){sel=Math.min(sel+1,btns.length-1);hl(btns);e.preventDefault();}
  else if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);hl(btns);e.preventDefault();}
  else if(e.key==='Enter'){const r=matches(qi.value); const p=r[sel>=0?sel:0]; if(p){go(p[0]);}}
  else if(e.key==='Escape'){sg.hidden=true;}
});
function hl(btns){btns.forEach((b,i)=>b.classList.toggle('on',i===sel));}
function renderSugg(r){
  if(!r.length){sg.hidden=true;return;}
  sg.innerHTML=r.map(p=>`<button type="button" data-s="${p[0]}"><span>${esc(p[1])}</span><span class="he">${esc(p[2])}</span></button>`).join('');
  sg.hidden=false;
  sg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.s)));
}
document.addEventListener('click',e=>{if(!e.target.closest('.search')) sg.hidden=true;});
function go(slug){qi.value='';sg.hidden=true;location.hash=slug;}

/* ---------- parsha of the week (Hebcal, Paris) ---------- */
const HEBCAL_ALIAS={'reeh':'reah','vezothaberakhah':'vzot-haberachah','achreimot':'acharei-mot','shlach':'shlach','vayera':'vayeira','vaera':'vaeira','behaalotcha':'behaalotecha','chayeisara':'chayei-sarah','kiteitzei':'ki-teitzei','kitavo':'ki-tavo','kitisa':'ki-tisa','lechlecha':'lech-lecha','vayeilech':'vayelech','vayetzei':'vayetze','mikeitz':'miketz','bechukotai':'bechukotai','beharbechukotai':null};
function hebcalToSlug(name){
  const parts=name.replace(/^Parashat\s+/i,'').split(/[-–]/).map(s=>s.trim());
  return parts.map(part=>{
    const k=part.toLowerCase().replace(/[^a-z]/g,'');
    if(HEBCAL_ALIAS[k]) return HEBCAL_ALIAS[k];
    const hit=P.find(p=>p[0].replace(/-/g,'')===k||norm(p[3]).replace(/ /g,'').includes(k));
    return hit?hit[0]:null;
  }).filter(Boolean);
}
async function loadWeek(){
  try{
    const r=await fetch('https://www.hebcal.com/shabbat?cfg=json&geonameid=2988507&M=on&leyning=off');
    const j=await r.json();
    const it=(j.items||[]).find(i=>i.category==='parashat');
    if(!it) return;
    weekSlugs=hebcalToSlug(it.title);
    if(!weekSlugs.length) return;
    const w=$('#week'); w.hidden=false; w.href='#'+weekSlugs[0];
    w.innerHTML=`Cette semaine&nbsp;: <b>${esc(weekSlugs.map(s=>bySlug[s][1]).join(' – '))}</b>`;
    document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('now',weekSlugs.includes(c.dataset.s)));
  }catch(e){}
}

/* ---------- home ---------- */
async function renderHome(){
  const idx=await loadIndex(); const cnt=Object.fromEntries(idx.map(i=>[i.slug,i]));
  const frOk=await frAvailable();
  const el=$('#books'); el.innerHTML='';
  for(const b of [1,2,3,4,5]){
    const list=P.filter(p=>p[4]===b);
    el.insertAdjacentHTML('beforeend',`<div class="book"><h2>${BOOKS[b]}</h2><div class="grid">${list.map(p=>{
      const c=cnt[p[0]]||{n:0};
      return `<a class="chip ${weekSlugs.includes(p[0])?'now':''}" href="#${p[0]}" data-s="${p[0]}"><b>${esc(p[1])}</b><span class="he">${esc(p[2])}</span><small>${c.n} si'hot${frOk.has(p[0])?' · <span class="fr-ok">français</span>':''}</small></a>`;
    }).join('')}</div></div>`);
  }
}
let _frSet=null;
async function frAvailable(){
  if(_frSet) return _frSet;
  try{ const r=await fetch('data/fr/index.json'+V); _frSet=new Set(r.ok?await r.json():[]); }catch(e){_frSet=new Set();}
  return _frSet;
}

/* ---------- parsha view ---------- */
let view=localStorage.getItem('sihot_view')||'resume', showHoss=true;
async function renderParsha(slug){
  const p=bySlug[slug]; if(!p){location.hash='';return;}
  const sec=$('#parsha'); sec.hidden=false; $('#home').hidden=true;
  sec.innerHTML='<p class="empty">Chargement…</p>';
  document.title=`${p[1]} — Si'hot du Rabbi`;
  const {he,fr}=await loadParsha(slug);
  const entries=he.entries.map((e,i)=>({he:e,fr:fr?.entries?.[i]&&fr.entries[i].sid===e.sid?fr.entries[i]:null,i}));
  const nS=entries.filter(x=>x.he.kitzur||!/^הוספות/.test(x.he.title)).length;
  const nH=entries.length-nS;
  const vols=[...new Set(entries.map(x=>x.he.vol))];
  const i=P.findIndex(x=>x[0]===slug), prev=P[(i+53)%54], next=P[(i+1)%54];
  if(!fr && view!=='he' && view!=='line') view='line';
  sec.innerHTML=`
    <div class="phead"><h1>${esc(p[1])}<span class="he">${esc(p[2])}</span></h1>
      <div class="nav"><a href="#${prev[0]}">← ${esc(prev[1])}</a><a href="#">Toutes</a><a href="#${next[0]}">${esc(next[1])} →</a></div></div>
    ${fr?`<p class="intro">${esc(fr.intro)}</p>`:''}
    <div class="stats"><div class="stat"><b>${entries.length}</b><span>entrées Mafteiach</span></div><div class="stat"><b>${nS}</b><span>si'hot</span></div><div class="stat"><b>${nH}</b><span>hossafot</span></div><div class="stat"><b>${vols.length}</b><span>volumes</span></div></div>
    ${fr?'':'<p class="pending">La version française de cette paracha est en cours de rédaction. En attendant : le résumé d\'une ligne et le kitsour en hébreu (Mafteiach).</p>'}
    <div class="tabs" role="tablist">
      <button role="tab" data-v="resume" ${fr?'':'disabled'}>Résumés</button>
      <button role="tab" data-v="line" ${fr?'':'title="Hébreu tant que le français n\'est pas prêt"'}>En une ligne</button>
      <button role="tab" data-v="he">Kitsour hébreu</button>
      <button role="tab" data-v="cours" ${fr?'':'disabled'}>${fr?.courses?.length?`${fr.courses.length} chiourim`:'Chiourim'}</button>
      <span class="sp"></span>
      <label><input type="checkbox" id="hoss" ${showHoss?'checked':''}> hossafot</label>
    </div>
    <div id="content"></div>`;
  sec.querySelectorAll('.tabs [data-v]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.v;localStorage.setItem('sihot_view',view);paint();}));
  $('#hoss').addEventListener('change',e=>{showHoss=e.target.checked;paint();});
  function paint(){
    sec.querySelectorAll('.tabs [data-v]').forEach(b=>{const on=b.dataset.v===view;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);});
    const c=$('#content');
    if(view==='cours'){ c.innerHTML=renderCourses(fr); bindCourses(c,fr); return; }
    let html='';
    if(fr?.threads?.length && view!=='he') html+=`<div class="threads"><h3>Fils rouges</h3><ul>${fr.threads.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`;
    for(const v of vols){
      const rows=entries.filter(x=>x.he.vol===v).filter(x=>showHoss||!isHoss(x));
      if(!rows.length) continue;
      html+=`<div class="vol"><h3>Volume ${volNum(v)} · ${rows.length} entrée${rows.length>1?'s':''}</h3>${rows.map(renderRow).join('')}</div>`;
    }
    c.innerHTML=html||'<p class="empty">Rien à afficher.</p>';
  }
  function isHoss(x){ return x.fr?x.fr.kind==='hossafa':(!x.he.kitzur||/^הוספות/.test(x.he.title)); }
  function renderRow(x){
    const f=x.fr, h=x.he, hoss=isHoss(x);
    const ref=f?`<b>${esc(f.ref)}</b>${esc(f.suffix)}`:`<b>${esc(h.title)}</b>`;
    const links=h.links.map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener">${labelLink(l.label)}</a>`).join('')+(h.id?`<a href="https://www.mafteiach.app/likkutei_sichos/${h.id}/kitzur" target="_blank" rel="noopener">Kitsour · Mafteiach</a>`:'')
      +`<a href="#" class="ask-i" data-ask="${esc((f?f.ref+' '+f.suffix:h.title).trim())}">En parler à Claude</a>`;
    let body='';
    if(view==='he'){ body=`<p class="kz">${esc(h.kitzur||h.oneliner)}</p>`; }
    else if(view==='line'){ body=f?`<p class="line">${esc(f.line)}</p>`:`<p class="kz">${esc(h.oneliner)}</p>`; }
    else if(f){ body=(f.verse?`<p class="verse">${esc(f.verse)}</p>`:'')+`<p>${esc(f.resume)}</p>`+(f.lesson?`<p class="lesson">${esc(f.lesson)}</p>`:''); }
    else { body=`<p class="kz">${esc(h.kitzur||h.oneliner)}</p>`; }
    return `<div class="s ${hoss?'hoss':''}"><div class="ref">${ref}${f?`<span class="he">${esc(h.title)}</span>`:''}${f?.theme?`<span class="tag">${esc(f.theme)}</span>`:''}${hoss?'<span class="tag h">hossafa</span>':''}</div><div class="body">${body}<div class="links">${links}</div></div></div>`;
  }
  paint();
  window.scrollTo({top:0});
}
function labelLink(l){ return {'שיחה':'Si\'ha (PDF)','מתורגם':'Traduction hébraïque','קיצור':'Kitsour'}[l]||esc(l); }

function renderCourses(fr){
  const list=fr?.courses||[];
  if(!list.length) return '<p class="empty">Pas encore de chiour pour cette paracha.</p>';
  const jump=`<nav class="cjump" aria-label="Les ${list.length} chiourim"><span>${list.length} chiourim, ${list.length} angles&nbsp;:</span>${
    list.map((k,i)=>`<a href="#" data-j="${i}">${esc(k.title)}${k.minutes?` <em>${k.minutes}\u00a0min</em>`:''}</a>`).join('')}</nav>`;
  return jump+list.map((c,i)=>`
    <article class="cours" id="chiour-${i}">
      <p class="cnum">Chiour ${i+1} sur ${list.length}${c.minutes?` · environ ${c.minutes} minutes`:''}</p>
      <h2>${esc(c.title)}</h2>
      <p class="angle">${esc(c.angle)}</p>
      <p class="refs">${esc(c.refs.join(' · '))}</p>
      ${c.steps.map(s=>`<div class="t"><div class="min">${esc(s.t)}</div><div><h4>${esc(s.h)}</h4><p>${esc(s.p)}</p>${s.src?`<p class="src">${esc(s.src)}</p>`:''}</div></div>`).join('')}
      <div class="actions"><button data-copy="${i}">Copier ce chiour</button><button data-print="1">Imprimer les ${list.length} chiourim</button></div>
    </article>`).join('');
}
function bindCourses(c,fr){
  const list=fr?.courses||[];
  c.querySelectorAll('[data-j]').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    document.getElementById('chiour-'+a.dataset.j)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  c.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>{
    const k=list[+b.dataset.copy];
    const txt=`${k.title}\n${k.angle}\n${k.refs.join(' · ')}\n\n`+k.steps.map(s=>`[${s.t}] ${s.h}\n${s.p}${s.src?`\n(${s.src})`:''}`).join('\n\n');
    navigator.clipboard.writeText(txt).then(()=>{const t=b.textContent;b.textContent='Copié ✓';setTimeout(()=>b.textContent=t,1500);});
  }));
  c.querySelectorAll('[data-print]').forEach(b=>b.addEventListener('click',()=>window.print()));
}

/* ---------- router ---------- */
function route(){
  const slug=decodeURIComponent(location.hash.replace('#','')).trim();
  if(slug&&bySlug[slug]) renderParsha(slug);
  else { $('#parsha').hidden=true; $('#home').hidden=false; document.title="Si'hot du Rabbi par paracha"; renderHome(); }
}
window.addEventListener('hashchange',route);
route(); loadWeek();
})();
