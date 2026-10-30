const KEY="knowledge_vault_v2";
let state=loadState(), activeContainer=null, activeTopic=null, view="library", editingConcept=null;
const $=id=>document.getElementById(id);
const esc=s=>(s??"").toString().replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const uid=()=>crypto.randomUUID?.()||Date.now()+"-"+Math.random();

function image(x){return typeof x==="string"?{id:uid(),data:x,caption:""}:{id:x?.id||uid(),data:x?.data||"",caption:x?.caption||""}}
function concept(x){return typeof x==="string"?{id:uid(),title:x,detail:"",images:[]}:{id:x?.id||uid(),title:x?.title||"Untitled concept",detail:x?.detail||x?.description||"",images:Array.isArray(x?.images)?x.images.map(image):[]}}
function topic(t={}){return {id:t.id||uid(),title:t.title||"Untitled topic",desc:t.desc||"",notes:t.notes||"",images:Array.isArray(t.images)?t.images.map(image):[],noteImages:Array.isArray(t.noteImages)?t.noteImages.map(image):[],concepts:Array.isArray(t.concepts)?t.concepts.map(concept):[],sources:Array.isArray(t.sources)?t.sources.map(x=>({name:x?.name||"Source",url:x?.url||""})):[],links:Array.isArray(t.links)?t.links.slice():[],favorite:!!t.favorite,updated:t.updated||Date.now()}}
function container(c={}){return {id:c.id||uid(),title:c.title||"Untitled collection",desc:c.desc||"",topics:Array.isArray(c.topics)?c.topics.map(topic):[]}}
function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||"null");
    if(raw?.containers?.length)return {containers:raw.containers.map(container)};
    const old=Array.isArray(raw?.topics)?raw.topics:[];
    const containers=[];
    old.forEach(t=>{
      const base={...t}; const nested=Array.isArray(base.subtopics)?base.subtopics:[]; delete base.subtopics;
      const peers=[topic(base),...nested.map(topic)];
      containers.push(container({id:uid(),title:base.title||"Collection",desc:base.desc||"",topics:peers}));
    });
    return {containers};
  }catch{return {containers:[]}}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state)); if($("saveStatus"))$("saveStatus").textContent="Saved locally · "+new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
function current(){const c=state.containers.find(x=>x.id===activeContainer);return c?.topics.find(x=>x.id===activeTopic)||null}
function counts(){let topics=0,notes=0,images=0,concepts=0;state.containers.forEach(c=>c.topics.forEach(t=>{topics++;if(t.notes.trim()||t.noteImages.length)notes++;images+=t.images.length+t.noteImages.length+t.concepts.reduce((n,x)=>n+x.images.length,0);concepts+=t.concepts.length}));return {topics,notes,images,concepts,containers:state.containers.length}}
function closeMenu(){$("sidebar")?.classList.remove("open");$("mobileShade")?.classList.add("hidden")}
function openMenu(){$("sidebar")?.classList.add("open");$("mobileShade")?.classList.remove("hidden")}
function initials(s){return (s||"KV").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function topicStats(t){return `${t.concepts.length} concepts · ${t.images.length+t.noteImages.length} images`}
function render(){
  if(view==="graph"){renderGraph();return}
  $("graphView").classList.add("hidden");$("libraryView").classList.remove("hidden");
  const q=$("search").value.toLowerCase().trim();
  let cs=state.containers;
  if(view==="favorites")cs=cs.map(c=>({...c,topics:c.topics.filter(t=>t.favorite)})).filter(c=>c.topics.length);
  if(view==="recent")cs=cs.map(c=>({...c,topics:[...c.topics].sort((a,b)=>b.updated-a.updated)}));
  if(q)cs=cs.map(c=>({...c,topics:c.topics.filter(t=>(c.title+" "+c.desc+" "+t.title+" "+t.desc+" "+t.notes+" "+t.concepts.map(x=>x.title+" "+x.detail).join(" ")).toLowerCase().includes(q))})).filter(c=>c.topics.length);
  const area=$("cards");
  area.innerHTML=cs.map(c=>`<section class="collection" data-container="${c.id}">
    <div class="collectionHead"><div><span class="eyebrow">COLLECTION</span><h2>${esc(c.title)}</h2><p>${esc(c.desc||"A label for related areas of study.")}</p></div><button class="addTopicCompact" data-add-topic="${c.id}" title="Add another main topic">＋</button></div>
    <div class="topicGrid">${c.topics.map(t=>`<article class="topicCard" data-open-topic="${t.id}" data-container-id="${c.id}">
      <div class="topicTop"><div class="topicIcon">${esc(initials(t.title))}</div><button class="topicStar" data-fav-topic="${t.id}" data-fav-container="${c.id}">${t.favorite?"★":"☆"}</button></div>
      <div><div class="topicLabel">MAIN TOPIC</div><h3>${esc(t.title)}</h3><p>${esc(t.desc||"Build this subject here — notes, concepts, evidence and connections.")}</p></div>
      <div class="topicMeta"><span>${topicStats(t)}</span><span>Updated ${new Date(t.updated).toLocaleDateString()}</span></div>
    </article>`).join("")}</div>
  </section>`).join("");
  $("empty").classList.toggle("hidden",cs.length>0);
  const n=counts();$("statTopics").textContent=n.topics;$("statNotes").textContent=n.notes;$("statImages").textContent=n.images;$("statConcepts").textContent=n.concepts;
  if(!cs.length && state.containers.length) $("empty").innerHTML='<div class="emptyIcon">⌕</div><h2>No matches</h2><p>Try a different search or switch back to Library.</p>';
  bindLibrary();
}
function bindLibrary(){
  document.querySelectorAll("[data-open-topic]").forEach(e=>e.onclick=()=>open(e.dataset.containerId,e.dataset.openTopic));
  document.querySelectorAll("[data-add-topic]").forEach(e=>e.onclick=ev=>{ev.stopPropagation();openNewTopic(e.dataset.addTopic)});
  document.querySelectorAll("[data-fav-topic]").forEach(e=>e.onclick=ev=>{ev.stopPropagation();const t=state.containers.find(c=>c.id===e.dataset.favContainer)?.topics.find(t=>t.id===e.dataset.favTopic);if(t){t.favorite=!t.favorite;t.updated=Date.now();save();render()}});
}
function open(cid,tid){activeContainer=cid;activeTopic=tid;$("editor").classList.remove("hidden");renderEditor();}
function openNewTopic(cid){activeContainer=cid;$("topicDialog").showModal();$("topicName").value="";$("topicDesc").value="";setTimeout(()=>$('topicName').focus(),50)}
function renderEditor(){const t=current();if(!t)return;$("title").value=t.title;$("topicDescription").value=t.desc;$("fav").textContent=t.favorite?"★":"☆";renderNotes(t);renderScreens(t);renderConcepts(t);renderSources(t);renderConnections(t)}
function renderNotes(t){$("notes").value=t.notes;$("noteImageGrid").innerHTML=t.noteImages.map((x,i)=>imageCard(x,i,"note",t)).join("");bindImages(t,"note")}
function renderScreens(t){$("imageGrid").innerHTML=t.images.map((x,i)=>imageCard(x,i,"topic",t)).join("");bindImages(t,"topic")}
function imageCard(x,i,type,t){return `<article class="imageCard"><img src="${x.data}" alt=""><input data-caption-type="${type}" data-caption-index="${i}" value="${esc(x.caption)}" placeholder="Add caption…"><div class="imageActions"><button class="remove" data-remove-type="${type}" data-remove-index="${i}">Remove</button></div></article>`}
function bindImages(t,type){document.querySelectorAll(`[data-caption-type="${type}"]`).forEach(e=>e.oninput=()=>{const a=type==="topic"?t.images:t.noteImages;a[+e.dataset.captionIndex].caption=e.value;t.updated=Date.now();save()});document.querySelectorAll(`[data-remove-type="${type}"]`).forEach(b=>b.onclick=()=>{const a=type==="topic"?t.images:t.noteImages;a.splice(+b.dataset.removeIndex,1);t.updated=Date.now();save();type==="topic"?renderScreens(t):renderNotes(t)})}
function renderConcepts(t){$("concepts").innerHTML=t.concepts.map((c,i)=>`<article class="conceptCard"><div class="conceptHead"><div><div class="conceptTitle">${esc(c.title)}</div><div class="conceptDetail">${esc(c.detail||"No explanation yet.")}</div></div></div>${c.images.length?`<div class="conceptThumbs">${c.images.map(x=>`<img src="${x.data}" alt="">`).join("")}</div>`:""}<div class="conceptActions"><button class="secondary mini" data-edit-concept="${i}">Edit</button><button class="secondary mini" data-concept-img="${i}">＋ Images</button><input id="conceptFile-${i}" type="file" accept="image/*" multiple hidden></div></article>`).join("");$("conceptEmpty").classList.toggle("hidden",t.concepts.length>0);
  document.querySelectorAll("[data-edit-concept]").forEach(b=>b.onclick=()=>editConcept(+b.dataset.editConcept));
  document.querySelectorAll("[data-concept-img]").forEach(b=>b.onclick=()=>{const i=+b.dataset.conceptImg,f=$("conceptFile-"+i);f.click();f.onchange=async e=>{for(const file of [...e.target.files])t.concepts[i].images.push(await imageData(file));t.updated=Date.now();save();renderConcepts(t);e.target.value=""}})
}
function renderSources(t){$("sources").innerHTML=t.sources.map((x,i)=>`<div class="source"><div><b>${esc(x.name)}</b><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a></div><button class="remove" data-source="${i}">Remove</button></div>`).join("");document.querySelectorAll("[data-source]").forEach(b=>b.onclick=()=>{t.sources.splice(+b.dataset.source,1);t.updated=Date.now();save();renderSources(t)})}
function renderConnections(t){const others=[];state.containers.forEach(c=>c.topics.forEach(x=>{if(x.id!==t.id)others.push({x,c})}));$("connections").innerHTML=others.map(o=>`<div class="connection"><div><b>${esc(o.x.title)}</b><small>${esc(o.c.title)}</small></div><label><input type="checkbox" data-link="${o.x.id}" ${t.links.includes(o.x.id)?"checked":""}> connect</label></div>`).join("");document.querySelectorAll("[data-link]").forEach(c=>c.onchange=()=>{const other=others.find(o=>o.x.id===c.dataset.link)?.x;if(!other)return;if(c.checked){if(!t.links.includes(other.id))t.links.push(other.id);if(!other.links.includes(t.id))other.links.push(t.id)}else{t.links=t.links.filter(x=>x!==other.id);other.links=other.links.filter(x=>x!==t.id)}t.updated=other.updated=Date.now();save()})}
async function imageData(file){return new Promise(res=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const max=1500,scale=Math.min(1,max/img.width,max/img.height),c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);res({id:uid(),data:c.toDataURL("image/jpeg",.78),caption:""})};img.src=r.result};r.readAsDataURL(file)})}
async function addImages(arr,files,t){for(const f of files)arr.push(await imageData(f));t.updated=Date.now();save()}
function editConcept(i){const t=current(),c=t.concepts[i];editingConcept=i;$("conceptDialogTitle").textContent="Edit concept";$("conceptName").value=c.title;$("conceptDetail").value=c.detail;$("conceptDialog").showModal()}
function newConcept(){editingConcept=null;$("conceptDialogTitle").textContent="Create concept";$("conceptName").value="";$("conceptDetail").value="";$("conceptDialog").showModal()}
function markdown(t){return `# ${t.title}\n\n${t.desc}\n\n## Notes\n\n${t.notes}\n\n## Concepts\n\n${t.concepts.map(c=>`### ${c.title}\n\n${c.detail}`).join("\n\n")}\n\n## Sources\n\n${t.sources.map(s=>`- ${s.name}: ${s.url}`).join("\n")}`}
function download(name,data,type="text/plain"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800)}
function context(){return state.containers.map(c=>`COLLECTION: ${c.title}\n${c.desc}\n${c.topics.map(t=>`MAIN TOPIC: ${t.title}\n${t.desc}\nNOTES:\n${t.notes}\nCONCEPTS:\n${t.concepts.map(x=>x.title+": "+x.detail).join("; ")}`).join("\n\n")}`).join("\n\n")}
function ai(kind){const prompts={explain:"Explain the following knowledge at institutional/graduate level. Correct errors and introduce important mechanisms I may be missing.",connect:"Analyze this knowledge base and identify meaningful structural connections. Explain the mechanism linking them.",gaps:"Audit these notes. Identify important missing concepts, distinctions, mechanisms, terminology and questions to investigate next.",quiz:"Create a difficult active-recall quiz from these notes. Do not reveal answers until I answer.",chapter:"Turn these notes into a coherent publication-quality chapter while preserving my observations and separating facts from interpretation.",compare:"Build rigorous comparisons of relevant concepts. Highlight structural, legal, economic and market differences."};$("aiPrompt").value=prompts[kind]+"\n\nMY KNOWLEDGE:\n"+context()}

$("newTopic").onclick=()=>{$("collectionName").value="";$('collectionDesc').value="";$('collectionDialog').showModal()};
$("collectionForm").onsubmit=e=>{e.preventDefault();const c=container({title:$('collectionName').value.trim(),desc:$('collectionDesc').value.trim(),topics:[]});state.containers.unshift(c);save();$('collectionDialog').close();render();openNewTopic(c.id)};
$("topicForm").onsubmit=e=>{e.preventDefault();const c=state.containers.find(x=>x.id===activeContainer);if(!c)return;const t=topic({title:$('topicName').value.trim(),desc:$('topicDesc').value.trim()});c.topics.push(t);save();$('topicDialog').close();render();open(c.id,t.id)};
$("emptyNew").onclick=()=>$("newTopic").click();$("search").oninput=render;
document.querySelectorAll(".nav[data-view]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav[data-view]").forEach(x=>x.classList.remove("active"));b.classList.add("active");view=b.dataset.view;closeMenu();render()});
$("closeEditor").onclick=()=>{$("editor").classList.add("hidden");activeContainer=activeTopic=null};
$("title").oninput=e=>{const t=current();if(t){t.title=e.target.value;t.updated=Date.now();save()}};
$("topicDescription").oninput=e=>{const t=current();if(t){t.desc=e.target.value;t.updated=Date.now();save()}};
$("notes").oninput=e=>{const t=current();if(t){t.notes=e.target.value;t.updated=Date.now();save()}};
$("fav").onclick=()=>{const t=current();if(t){t.favorite=!t.favorite;t.updated=Date.now();save();renderEditor();render()}};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".tabpane").forEach(x=>x.classList.add("hidden"));$("tab-"+b.dataset.tab).classList.remove("hidden")});
$("noteImagesBtn").onclick=()=>$("noteImages").click();$("noteImages").onchange=async e=>{const t=current();if(t){await addImages(t.noteImages,[...e.target.files],t);renderNotes(t);e.target.value=""}};
$("images").onchange=async e=>{const t=current();if(t){await addImages(t.images,[...e.target.files],t);renderScreens(t);e.target.value=""}};
$("newConcept").onclick=newConcept;
$("conceptForm").onsubmit=e=>{e.preventDefault();const t=current(),v=$("conceptName").value.trim();if(!t||!v)return;if(editingConcept===null)t.concepts.push(concept({title:v,detail:$("conceptDetail").value.trim()}));else {t.concepts[editingConcept].title=v;t.concepts[editingConcept].detail=$("conceptDetail").value.trim()}t.updated=Date.now();save();$("conceptDialog").close();renderConcepts(t);editingConcept=null};
$("addSource").onclick=()=>{const t=current(),n=$("sourceName").value.trim(),u=$("sourceUrl").value.trim();if(t&&u){t.sources.push({name:n||u,url:u});t.updated=Date.now();save();$("sourceName").value="";$("sourceUrl").value="";renderSources(t)}};
$("cleanExport").onclick=()=>{const t=current();if(t)download(t.title.replace(/[^a-z0-9]+/gi,"-")+".md",markdown(t),"text/markdown")};
$("exportAll").onclick=$("backup").onclick=()=>download("knowledge-vault-v2-backup.json",JSON.stringify(state,null,2),"application/json");
$("restore").onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());if(!x.containers&&!Array.isArray(x.topics))throw 0;state=x.containers?{containers:x.containers.map(container)}:loadFromLegacy(x);save();render();alert("Library restored.")}catch{alert("Invalid backup.")}};
function loadFromLegacy(x){const cs=[];(x.topics||[]).forEach(t=>{const nested=t.subtopics||[];const base={...t};delete base.subtopics;cs.push(container({title:base.title,desc:base.desc,topics:[topic(base),...nested.map(topic)]}))});return {containers:cs}}
$("aiPack").onclick=()=>{$("aiPanel").classList.remove("hidden");ai("explain");closeMenu()};$("closeAI").onclick=()=>$("aiPanel").classList.add("hidden");$("aiTopic").onclick=()=>{$("aiPanel").classList.remove("hidden");ai("explain")};document.querySelectorAll("[data-ai]").forEach(b=>b.onclick=()=>ai(b.dataset.ai));
$("copyAI").onclick=async()=>{await navigator.clipboard.writeText($("aiPrompt").value);$("copyAI").textContent="Copied ✓";setTimeout(()=>$("copyAI").textContent="Copy prompt",1200)};$("downloadAI").onclick=()=>download("ai-prompt.txt",$("aiPrompt").value);
$("menuToggle").onclick=openMenu;$("mobileShade").onclick=closeMenu;
function renderGraph(){
  $("libraryView").classList.add("hidden");$("graphView").classList.remove("hidden");const c=$("graph"),d=devicePixelRatio||1,r=c.getBoundingClientRect();c.width=r.width*d;c.height=r.height*d;const x=c.getContext("2d");x.scale(d,d);const W=r.width,H=r.height,ts=[];state.containers.forEach(col=>col.topics.forEach(t=>ts.push({t,col})));x.clearRect(0,0,W,H);if(!ts.length)return;const pos=ts.map((o,i)=>({o,x:W/2+Math.cos(i/ts.length*Math.PI*2)*(Math.min(W,H)*.34),y:H/2+Math.sin(i/ts.length*Math.PI*2)*(Math.min(W,H)*.34)}));x.strokeStyle="#41505a";ts.forEach((o,i)=>o.t.links.forEach(l=>{const j=ts.findIndex(z=>z.o.t.id===l);if(j>i){x.beginPath();x.moveTo(pos[i].x,pos[i].y);x.lineTo(pos[j].x,pos[j].y);x.stroke()}}));pos.forEach(p=>{x.beginPath();x.fillStyle="#8ca99b";x.arc(p.x,p.y,25,0,Math.PI*2);x.fill();x.fillStyle="#f0f3f1";x.font="12px system-ui";x.textAlign="center";x.fillText(p.o.t.title.slice(0,18),p.x,p.y+4)});}
render();
