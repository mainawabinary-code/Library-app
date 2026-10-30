const KEY="knowledge_vault_v2";
let state=JSON.parse(localStorage.getItem(KEY)||'{"topics":[]}');
let active=null,view="library",editingConcept=null;

const $=id=>document.getElementById(id);
const esc=s=>(s??"").toString().replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const id=()=>crypto.randomUUID?.()||Date.now()+"-"+Math.random();

function normalizeImage(x){return typeof x==="string"?{id:id(),data:x,caption:""}:{id:x?.id||id(),data:x?.data||"",caption:x?.caption||""}}
function normalizeConcept(x){
  if(typeof x==="string")return {id:id(),title:x,detail:"",images:[]};
  return {id:x?.id||id(),title:x?.title||"Untitled concept",detail:x?.detail||x?.description||"",images:Array.isArray(x?.images)?x.images.map(normalizeImage):[]};
}
function normalizeTopic(t){
  return {
    id:t?.id||id(),title:t?.title||"Untitled topic",desc:t?.desc||"",notes:t?.notes||"",
    images:Array.isArray(t?.images)?t.images.map(normalizeImage):[],
    noteImages:Array.isArray(t?.noteImages)?t.noteImages.map(normalizeImage):[],
    concepts:Array.isArray(t?.concepts)?t.concepts.map(normalizeConcept):[],
    sources:Array.isArray(t?.sources)?t.sources:[],links:Array.isArray(t?.links)?t.links:[],
    subtopics:Array.isArray(t?.subtopics)?t.subtopics.map(normalizeTopic):[],
    favorite:!!t?.favorite,updated:t?.updated||Date.now()
  };
}
state.topics=(Array.isArray(state.topics)?state.topics:[]).map(normalizeTopic);

function save(){localStorage.setItem(KEY,JSON.stringify(state));if($("saveStatus"))$("saveStatus").textContent="Saved locally • "+new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
function topic(){return state.topics.find(t=>t.id===active)}
function currentRecord(){return window.__subtopicContext?.child||topic()}
function initials(s){return (s||"?").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function allTopicImages(t){return t.images.length+t.noteImages.length+t.concepts.reduce((n,c)=>n+c.images.length,0)+t.subtopics.reduce((n,s)=>n+allTopicImages(s),0)}
function allConcepts(t){return t.concepts.length+t.subtopics.reduce((n,s)=>n+allConcepts(s),0)}
function hasNotes(t){return !!t.notes.trim()||t.noteImages.length>0||t.subtopics.some(hasNotes)}
function closeMenu(){ $("sidebar")?.classList.remove("open");$("mobileShade")?.classList.add("hidden") }
function openMenu(){ $("sidebar")?.classList.add("open");$("mobileShade")?.classList.remove("hidden") }

function render(){
  let q=$("search").value.toLowerCase().trim(),ts=[...state.topics];
  if(view==="recent")ts.sort((a,b)=>b.updated-a.updated);
  if(view==="favorites")ts=ts.filter(t=>t.favorite);
  if(q)ts=ts.filter(t=>(t.title+" "+t.desc+" "+t.notes+" "+t.concepts.map(c=>c.title+" "+c.detail).join(" ")+" "+t.subtopics.map(s=>s.title+" "+s.desc).join(" ")).toLowerCase().includes(q));
  $("cards").innerHTML=ts.map(t=>`<article class="card" data-id="${t.id}"><div><div class="cardIcon">${esc(initials(t.title))}</div><h3>${esc(t.title)} ${t.favorite?"★":""}${t.subtopics.length?`<span class="subBadge">${t.subtopics.length} inside</span>`:""}</h3><p>${esc(t.desc||"No description yet.")}</p></div><div class="meta"><span>${hasNotes(t)?"Notes":"No notes"}</span><span>${allTopicImages(t)} images</span><span>${allConcepts(t)} concepts</span></div></article>`).join("");
  $("empty").classList.toggle("hidden",ts.length>0);$("cards").classList.toggle("hidden",!ts.length);
  $("statTopics").textContent=state.topics.length;
  $("statNotes").textContent=state.topics.filter(hasNotes).length;
  $("statImages").textContent=state.topics.reduce((n,t)=>n+allTopicImages(t),0);
  $("statConcepts").textContent=state.topics.reduce((n,t)=>n+allConcepts(t),0);
  document.querySelectorAll(".card").forEach(c=>c.onclick=()=>open(c.dataset.id));
}

function open(i){
  clearSubtopicContext();active=i;let t=topic();if(!t)return;
  $("title").value=t.title;$("notes").value=t.notes;$("fav").textContent=t.favorite?"★":"☆";
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelector('.tab[data-tab="notes"]').classList.add("active");
  document.querySelectorAll(".tabpane").forEach(x=>x.classList.add("hidden"));$("tab-notes").classList.remove("hidden");
  $("closeEditor").textContent="← Library";renderImages();renderNoteImages();renderConcepts();renderChildTopics();renderSources();renderConnections();$("editor").classList.remove("hidden");closeMenu();
}
function touchRecord(t=currentRecord()){if(!t)return;t.updated=Date.now();save();render()}

function imageData(file,max=1500,quality=.82){return new Promise(resolve=>{let r=new FileReader;r.onload=()=>{let img=new Image;img.onload=()=>{let scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));let c=document.createElement("canvas");c.width=w;c.height=h;let x=c.getContext("2d");x.drawImage(img,0,0,w,h);resolve({id:id(),data:c.toDataURL("image/jpeg",quality),caption:file.name})};img.src=r.result};r.readAsDataURL(file)})}
async function addImagesTo(list,files){let t=currentRecord();for(const f of files){if(!f.type.startsWith("image/"))continue;list.push(await imageData(f))}touchRecord(t)}
function imageCard(x,i,collection,captionAttr="caption"){return `<div class="imageCard"><img src="${x.data}" alt="${esc(x.caption||"Saved image")}"><input data-img-caption="${collection}" data-img-index="${i}" value="${esc(x.caption||"")}" placeholder="Caption / context"><div class="imageActions"><button class="remove" data-remove-img="${collection}" data-img-index="${i}">Remove image</button></div></div>`}
function bindImageControls(){
 document.querySelectorAll("[data-img-caption]").forEach(e=>e.oninput=()=>{let t=topic(),collection=e.dataset.imgCaption,arr=collection==="topic"?t.images:collection==="note"?t.noteImages:null;if(arr){arr[+e.dataset.imgIndex].caption=e.value;touch()}});
 document.querySelectorAll("[data-remove-img]").forEach(b=>b.onclick=()=>{let t=topic(),c=b.dataset.removeImg,i=+b.dataset.imgIndex,arr=c==="topic"?t.images:c==="note"?t.noteImages:null;if(arr){arr.splice(i,1);touch();c==="topic"?renderImages():renderNoteImages()}})
}
function renderImages(){let t=topic();$("imageGrid").innerHTML=t.images.map((x,i)=>imageCard(x,i,"topic")).join("");bindImageControls()}
function renderNoteImages(){let t=topic();$("noteImageGrid").innerHTML=t.noteImages.map((x,i)=>imageCard(x,i,"note")).join("");bindImageControls()}

function renderConcepts(){
 let t=topic();
 $("concepts").innerHTML=t.concepts.map((x,i)=>`<article class="conceptCard"><div class="conceptCardHead"><div class="conceptTitle">${esc(x.title)}</div><button class="secondary mini" data-edit-concept="${i}">Edit</button></div>${x.detail?`<div class="conceptDetail">${esc(x.detail)}</div>`:`<div class="conceptDetail">No explanation yet.</div>`}${x.images.length?`<div class="conceptThumbs">${x.images.slice(0,4).map(y=>`<img src="${y.data}" alt="${esc(y.caption||"Concept image")}">`).join("")}</div>`:""}<div class="conceptActions"><button class="secondary mini" data-concept-images="${i}">＋ Add images</button><input class="hidden" id="conceptFile-${i}" type="file" accept="image/*" multiple></div></article>`).join("");
 document.querySelectorAll("[data-edit-concept]").forEach(b=>b.onclick=()=>editConcept(+b.dataset.editConcept));
 document.querySelectorAll("[data-concept-images]").forEach(b=>{let i=+b.dataset.conceptImages,f=$("conceptFile-"+i);b.onclick=()=>f.click();f.onchange=async e=>{await addImagesTo(t.concepts[i].images,[...e.target.files]);renderConcepts();e.target.value=""}})
 $("conceptEmpty").classList.toggle("hidden",t.concepts.length>0)
}
function editConcept(i){let t=topic(),c=t.concepts[i];editingConcept=i;$("conceptDialogTitle").textContent="Edit concept";$("conceptName").value=c.title;$("conceptDetail").value=c.detail;$("conceptDialog").showModal()}
function createConcept(){editingConcept=null;$("conceptDialogTitle").textContent="Create concept";$("conceptName").value="";$("conceptDetail").value="";$("conceptDialog").showModal()}

function renderChildTopics(){
  renderChildTopicsFor(currentRecord());
}
function childCard(s,i){
  const hasChildren=s.subtopics.length>0;
  return `<article class="childTopicCard" data-child-open="${i}">
    <div class="childTopicIcon">${esc(initials(s.title))}</div>
    <div class="childTopicMain"><h4>${esc(s.title)}</h4><p>${esc(s.desc||"Single topic")}</p></div>
    <div class="childTopicMeta">${hasChildren?`${s.subtopics.length} inside · `:""}${s.notes.trim()?"Notes · ":""}${allTopicImages(s)} images · ${allConcepts(s)} concepts</div>
    <div class="childTopicArrow">›</div>
  </article>`;
}
function renderChildTopicsFor(t){
  const panel=$("childTopicsPanel");
  const list=$("childTopicList");
  if(!panel||!list)return;
  const hasChildren=Array.isArray(t.subtopics)&&t.subtopics.length>0;
  // Progressive hierarchy: a single topic stays clean. The child-topic area appears only when it is actually being used.
  panel.classList.toggle("hidden",!hasChildren);
  if(!hasChildren){list.innerHTML="";return;}
  list.innerHTML=t.subtopics.map((s,i)=>childCard(s,i)).join("");
  $("childTopicEmpty").classList.add("hidden");
  $("childTopicsTitle").textContent="Topics inside this topic";
  $("childTopicsHint").textContent="Child topics live directly inside this container. Each opens the same full knowledge workspace.";
  document.querySelectorAll("[data-child-open]").forEach(b=>b.onclick=()=>openChildTopic(+b.dataset.childOpen));
}
function openChildTopic(i){
  const parent=currentRecord(),s=parent.subtopics[i];
  if(!s)return;
  renderSubtopicAsEditor(parent,s);
}
function renderSubtopicAsEditor(parent,s){
  $("title").value=s.title;$("notes").value=s.notes;$("fav").textContent=s.favorite?"★":"☆";
  $("editor").classList.remove("hidden");
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelector('.tab[data-tab="notes"]').classList.add("active");document.querySelectorAll(".tabpane").forEach(x=>x.classList.add("hidden"));$("tab-notes").classList.remove("hidden");
  window.__subtopicContext={parent,child:s};$("closeEditor").textContent="← Parent topic";renderImagesFor(s);renderNoteImagesFor(s);renderConceptsFor(s);renderChildTopicsFor(s);renderSourcesFor(s);renderConnectionsFor(s);
}
function clearSubtopicContext(){window.__subtopicContext=null}
function renderImagesFor(t){$("imageGrid").innerHTML=t.images.map((x,i)=>imageCardFor(x,i,"topic",t)).join("");bindImageControlsFor(t)}
function renderNoteImagesFor(t){$("noteImageGrid").innerHTML=t.noteImages.map((x,i)=>imageCardFor(x,i,"note",t)).join("");bindImageControlsFor(t)}
function imageCardFor(x,i,collection,t){return `<div class="imageCard"><img src="${x.data}" alt="${esc(x.caption||"Saved image")}"><input data-child-caption="${collection}" data-child-index="${i}" value="${esc(x.caption||"")}" placeholder="Caption / context"><div class="imageActions"><button class="remove" data-child-remove="${collection}" data-child-index="${i}">Remove image</button></div></div>`}
function bindImageControlsFor(t){document.querySelectorAll("[data-child-caption]").forEach(e=>e.oninput=()=>{let arr=e.dataset.childCaption==="topic"?t.images:t.noteImages;arr[+e.dataset.childIndex].caption=e.value;save()});document.querySelectorAll("[data-child-remove]").forEach(b=>b.onclick=()=>{let arr=b.dataset.childRemove==="topic"?t.images:t.noteImages;arr.splice(+b.dataset.childIndex,1);save();b.dataset.childRemove==="topic"?renderImagesFor(t):renderNoteImagesFor(t)})}
function renderConceptsFor(t){
  $("concepts").innerHTML=t.concepts.map((x,i)=>{
    const thumbs=x.images.length?`<div class="conceptThumbs">${x.images.slice(0,4).map(y=>`<img src="${y.data}" alt="${esc(y.caption||"Concept image")}">`).join("")}</div>`:"";
    return `<article class="conceptCard"><div class="conceptCardHead"><div class="conceptTitle">${esc(x.title)}</div><button class="secondary mini" data-child-edit-concept="${i}">Edit</button></div><div class="conceptDetail">${esc(x.detail||"No explanation yet.")}</div>${thumbs}<div class="conceptActions"><button class="secondary mini" data-child-concept-images="${i}">＋ Add images</button><input class="hidden" id="childConceptFile-${i}" type="file" accept="image/*" multiple></div></article>`;
  }).join("");
  document.querySelectorAll("[data-child-edit-concept]").forEach(b=>b.onclick=()=>editChildConcept(t,+b.dataset.childEditConcept));
  document.querySelectorAll("[data-child-concept-images]").forEach(b=>{let i=+b.dataset.childConceptImages,f=$("childConceptFile-"+i);b.onclick=()=>f.click();f.onchange=async e=>{for(const file of [...e.target.files])t.concepts[i].images.push(await imageData(file));touchRecord(t);renderConceptsFor(t);e.target.value=""}})
  $("conceptEmpty").classList.toggle("hidden",t.concepts.length>0)
}
function editChildConcept(t,i){editingConcept={child:t,index:i};let c=t.concepts[i];$("conceptDialogTitle").textContent="Edit concept";$("conceptName").value=c.title;$("conceptDetail").value=c.detail;$("conceptDialog").showModal()}
function renderChildTopicsForNested(t){renderChildTopicsFor(t)}
function renderSourcesFor(t){$("sources").innerHTML=t.sources.map((x,i)=>`<div class="source"><b>${esc(x.name)}</b><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a><button class="remove" data-s-child="${i}">×</button></div>`).join("");document.querySelectorAll("[data-s-child]").forEach(b=>b.onclick=()=>{t.sources.splice(+b.dataset.sChild,1);save();renderSourcesFor(t)})}
function renderConnectionsFor(t){$("connections").innerHTML=state.topics.filter(x=>x.id!==t.id).map(x=>`<div class="connection"><span>${esc(x.title)}</span><label><input type="checkbox" data-child-link="${x.id}" ${t.links.includes(x.id)?"checked":""}> connect</label></div>`).join("");document.querySelectorAll("[data-child-link]").forEach(c=>c.onchange=()=>{let other=state.topics.find(x=>x.id===c.dataset.childLink);if(c.checked){if(!t.links.includes(other.id))t.links.push(other.id);if(!other.links.includes(t.id))other.links.push(t.id)}else{t.links=t.links.filter(x=>x!==other.id);other.links=other.links.filter(x=>x!==t.id)}save()})}

function renderSources(){renderSourcesFor(currentRecord())}
function renderConnections(){renderConnectionsFor(currentRecord())}
function renderCurrentEditor(){let t=currentRecord();$("title").value=t.title;$("notes").value=t.notes;$("fav").textContent=t.favorite?"★":"☆";renderImagesFor(t);renderNoteImagesFor(t);renderConceptsFor(t);renderChildTopicsFor(t);renderSourcesFor(t);renderConnectionsFor(t)}

function markdown(t){return `# ${t.title}\n\n${t.desc}\n\n## What I learned\n\n${t.notes}\n\n## Key concepts\n\n${t.concepts.map(x=>`### ${x.title}\n\n${x.detail}`).join("\n\n")}\n\n## Subtopics\n\n${t.subtopics.map(x=>`- ${x.title}: ${x.desc}`).join("\n")}\n\n## Sources\n\n${t.sources.map(x=>"- "+x.name+": "+x.url).join("\n")}\n\n## Screenshots\n\n${t.images.map((x,i)=>"- Screenshot "+(i+1)+": "+(x.caption||"")).join("\n")}`}
function download(name,data,type="text/plain"){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function context(){return state.topics.map(t=>`### ${t.title}\n${t.desc}\nConcepts: ${t.concepts.map(c=>c.title+": "+c.detail).join("; ")}\nNotes:\n${t.notes}\nSubtopics: ${t.subtopics.map(s=>s.title).join(", ")}\nConnections: ${t.links.map(x=>state.topics.find(y=>y.id===x)?.title).filter(Boolean).join(", ")}`).join("\n\n")}
function ai(kind){let prompts={explain:"Explain the following knowledge at an institutional/graduate finance level. Correct errors and introduce important mechanisms I may be missing.",connect:"Analyze my knowledge base and identify meaningful connections between concepts. Explain the mechanism linking them.",gaps:"Audit these notes. Identify important missing concepts, distinctions, mechanisms, terminology, or questions I should investigate next.",quiz:"Create a difficult active-recall quiz from these notes. Do not reveal answers until I answer.",chapter:"Turn these notes into a coherent, publication-quality chapter while preserving my observations and clearly separating facts from interpretation.",compare:"Build a rigorous comparison of the relevant concepts in these notes. Highlight structural, legal, economic and market differences."};$("aiPrompt").value=prompts[kind]+"\n\nMY KNOWLEDGE:\n"+context()}

$("newTopic").onclick=$("emptyNew").onclick=()=>$("newDialog").showModal();
$("newForm").onsubmit=e=>{e.preventDefault();let t={id:id(),title:$("newName").value.trim(),desc:$("newDesc").value.trim(),notes:"",images:[],noteImages:[],concepts:[],sources:[],links:[],subtopics:[],favorite:false,updated:Date.now()};state.topics.unshift(t);save();$("newForm").reset();$("newDialog").close();render();open(t.id)};
$("search").oninput=render;
document.querySelectorAll(".nav[data-view]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav[data-view]").forEach(x=>x.classList.remove("active"));b.classList.add("active");view=b.dataset.view;if(view==="graph")renderGraph();else{$("graphView").classList.add("hidden");$("libraryView").classList.remove("hidden")}render();closeMenu()});
$("closeEditor").onclick=()=>{if(window.__subtopicContext){let p=window.__subtopicContext.parent;window.__subtopicContext=null;$("closeEditor").textContent="← Library";$("title").value=p.title;$("notes").value=p.notes;$("fav").textContent=p.favorite?"★":"☆";renderImagesFor(p);renderNoteImagesFor(p);renderConceptsFor(p);renderChildTopicsFor(p);renderSourcesFor(p);renderConnectionsFor(p);return}$("editor").classList.add("hidden");clearSubtopicContext()};
$("title").oninput=e=>{let t=currentRecord();t.title=e.target.value;save();render()};
$("notes").oninput=e=>{let t=currentRecord();t.notes=e.target.value;save();render()};
$("fav").onclick=()=>{let t=currentRecord();t.favorite=!t.favorite;save();renderCurrentEditor();render()};

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".tabpane").forEach(x=>x.classList.add("hidden"));$("tab-"+b.dataset.tab).classList.remove("hidden")});
$("noteImagesBtn").onclick=()=>$("noteImages").click();
$("noteImages").onchange=async e=>{await addImagesTo(currentRecord().noteImages,[...e.target.files]);renderNoteImagesFor(currentRecord());e.target.value=""};
$("images").onchange=async e=>{await addImagesTo(currentRecord().images,[...e.target.files]);renderImagesFor(currentRecord());e.target.value=""};
$("newConcept").onclick=createConcept;
$("conceptForm").onsubmit=e=>{e.preventDefault();let target=currentRecord(),v=$("conceptName").value.trim();if(!v)return;if(editingConcept===null)target.concepts.push({id:id(),title:v,detail:$("conceptDetail").value.trim(),images:[]});else if(typeof editingConcept==="object")target.concepts[editingConcept.index].title=v,target.concepts[editingConcept.index].detail=$("conceptDetail").value.trim();else target.concepts[editingConcept].title=v,target.concepts[editingConcept].detail=$("conceptDetail").value.trim();save();$("conceptDialog").close();renderConceptsFor(target);editingConcept=null};
function openSubtopicDialog(){$("subtopicName").value="";$('subtopicDesc').value="";$('subtopicDialog').showModal()}
$("newSubtopic").onclick=openSubtopicDialog;
$("newSubtopicTop").onclick=openSubtopicDialog;
$("subtopicForm").onsubmit=e=>{e.preventDefault();let t=currentRecord();t.subtopics.push({id:id(),title:$("subtopicName").value.trim(),desc:$("subtopicDesc").value.trim(),notes:"",images:[],noteImages:[],concepts:[],sources:[],links:[],subtopics:[],favorite:false,updated:Date.now()});save();$("subtopicDialog").close();renderChildTopicsFor(t);render()};
$("addSource").onclick=()=>{let t=currentRecord(),n=$("sourceName").value.trim(),u=$("sourceUrl").value.trim();if(u){t.sources.push({name:n||u,url:u});$("sourceName").value="";$("sourceUrl").value="";save();renderSourcesFor(t)}};
$("cleanExport").onclick=()=>{let t=currentRecord();download(t.title.replace(/[^a-z0-9]+/gi,"-")+".md",markdown(t),"text/markdown")};
$("exportAll").onclick=$("backup").onclick=()=>download("knowledge-vault-v2-backup.json",JSON.stringify(state,null,2),"application/json");
$("restore").onchange=async e=>{try{let x=JSON.parse(await e.target.files[0].text());if(!Array.isArray(x.topics))throw 0;state.topics=x.topics.map(normalizeTopic);save();render();alert("Library restored.")}catch{alert("Invalid backup.")}};
$("aiPack").onclick=()=>{$("aiPanel").classList.remove("hidden");ai("explain");closeMenu()};$("closeAI").onclick=()=>$("aiPanel").classList.add("hidden");$("aiTopic").onclick=()=>{$("aiPanel").classList.remove("hidden");ai("explain")};document.querySelectorAll("[data-ai]").forEach(b=>b.onclick=()=>ai(b.dataset.ai));
$("copyAI").onclick=async()=>{await navigator.clipboard.writeText($("aiPrompt").value);$("copyAI").textContent="Copied ✓";setTimeout(()=>$("copyAI").textContent="Copy prompt",1200)};$("downloadAI").onclick=()=>download("ai-prompt.txt",$("aiPrompt").value);
$("menuToggle").onclick=openMenu;$("mobileShade").onclick=closeMenu;
function renderGraph(){ $("libraryView").classList.add("hidden");$("graphView").classList.remove("hidden");let c=$("graph"),d=devicePixelRatio||1,cx=c.getBoundingClientRect();c.width=cx.width*d;c.height=cx.height*d;let x=c.getContext("2d");x.scale(d,d);let W=cx.width,H=cx.height,N=state.topics.length;if(!N)return;x.clearRect(0,0,W,H);let pos=state.topics.map((t,i)=>({t,x:W/2+Math.cos(i/N*6.28)*(Math.min(W,H)*.34),y:H/2+Math.sin(i/N*6.28)*(Math.min(W,H)*.34)}));x.strokeStyle="#39465a";state.topics.forEach((t,i)=>t.links.forEach(l=>{let j=state.topics.findIndex(q=>q.id===l);if(j>i){x.beginPath();x.moveTo(pos[i].x,pos[i].y);x.lineTo(pos[j].x,pos[j].y);x.stroke()}}));pos.forEach(p=>{x.beginPath();x.fillStyle="#a9b7b0";x.arc(p.x,p.y,23,0,7);x.fill();x.fillStyle="#f3f5f8";x.font="12px system-ui";x.textAlign="center";x.fillText(p.t.title.slice(0,18),p.x,p.y+4)})}
render();
