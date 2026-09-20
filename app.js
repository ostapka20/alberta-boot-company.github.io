const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
let records = [];
let currentUser = null;
let editingId = null;

const $ = id => document.getElementById(id);
const today = () => new Date().toISOString().slice(0,10);
const fmt = n => Number(n || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const typeLabel = t => ({leather_added:"Leather Added",scrap:"Scrap",production:"Pairs Made"}[t]||t);

function toast(msg){$("toast").textContent=msg;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2500)}
function showPage(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  $("page-"+page).classList.remove("hidden");
  document.querySelectorAll(".nav-item[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  const titles={dashboard:["Dashboard","Daily production overview"],database:["Database","Search and filter all records"],leather:["Leather","Leather additions and scrap"],production:["Production","Pairs made"],add:["Add Data","Create a new record"]};
  $("pageTitle").textContent=titles[page][0];$("pageSubtitle").textContent=titles[page][1];
  if(page==="dashboard") loadDashboard(); if(page==="database") renderDatabase(); if(page==="leather") renderLeather(); if(page==="production") renderProduction();
}
function setAddType(t){$("recordType").value=t; updateAddForm(); showPage("add")}
function updateAddForm(){
  const t=$("recordType").value;
  $("leatherTypeWrap").classList.toggle("hidden",t==="production");
  $("sqftWrap").classList.toggle("hidden",t==="production");
  $("pairsWrap").classList.toggle("hidden",t!=="production");
  $("leatherType").required=t!=="production"; $("sqft").required=t!=="production";
}
async function loadRecords(){
  const {data,error}=await db.from("production_records").select("*").order("date",{ascending:false}).order("created_at",{ascending:false});
  if(error){toast(error.message);return} records=data||[]; renderCurrentPage();
}
function renderCurrentPage(){const p=document.querySelector(".nav-item.active")?.dataset.page||"dashboard";showPage(p)}
function dateRecords(date){return records.filter(r=>r.date===date)}
function loadDashboard(){
  const date=$("dashboardDate").value||today(), rows=dateRecords(date);
  const added=rows.filter(r=>r.record_type==="leather_added").reduce((s,r)=>s+Number(r.sqft||0),0);
  const scrap=rows.filter(r=>r.record_type==="scrap").reduce((s,r)=>s+Number(r.sqft||0),0);
  const pairs=rows.filter(r=>r.record_type==="production").reduce((s,r)=>s+Number(r.pairs||0),0);
  $("dashAdded").textContent=`${fmt(added)} SqFt`; $("dashScrap").textContent=`${fmt(scrap)} SqFt`; $("dashPairs").textContent=pairs.toLocaleString(); $("dashNet").textContent=`${fmt(added-scrap)} SqFt`;
  const inv={}; records.filter(r=>r.record_type!=="production").forEach(r=>{const k=(r.leather_type||"Unknown").trim();inv[k]=(inv[k]||0)+(r.record_type==="scrap"?-Number(r.sqft||0):Number(r.sqft||0))});
  const rowsHtml=Object.entries(inv).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${fmt(v)} SqFt</td></tr>`).join("");
  $("inventoryTable").innerHTML=rowsHtml?`<table class="table"><thead><tr><th>Leather Type</th><th>Current Inventory</th></tr></thead><tbody>${rowsHtml}</tbody></table>`:`<div class="empty">No leather inventory yet.</div>`;
}
function rowActions(r){return `<button class="action-btn" onclick="openEdit('${r.id}')">Edit</button><button class="action-btn danger" onclick="deleteRecord('${r.id}')">Delete</button>`}
function renderTable(list, target){
  if(!list.length){$(target).innerHTML='<div class="empty">No records found.</div>';return}
  const body=list.map(r=>`<tr><td>${r.date}</td><td>${typeLabel(r.record_type)}</td><td>${esc(r.leather_type||"—")}</td><td>${r.record_type==="production"?Number(r.pairs||0).toLocaleString():fmt(r.sqft)}</td><td>${rowActions(r)}</td></tr>`).join("");
  $(target).innerHTML=`<table class="table"><thead><tr><th>Date</th><th>Type</th><th>Leather</th><th>Quantity</th><th>Actions</th></tr></thead><tbody>${body}</tbody></table>`;
}
function renderLeather(){renderTable(records.filter(r=>r.record_type!=="production"),"leatherTable")}
function renderProduction(){renderTable(records.filter(r=>r.record_type==="production"),"productionTable")}
function renderDatabase(){
  const q=$("dbSearch").value.toLowerCase(),from=$("dbFrom").value,to=$("dbTo").value,type=$("dbType").value;
  const list=records.filter(r=>(!q||(r.leather_type||"").toLowerCase().includes(q))&&(!from||r.date>=from)&&(!to||r.date<=to)&&(type==="all"||r.record_type===type));
  renderTable(list,"databaseTable");
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("authMessage").textContent="";const {error}=await db.auth.signInWithPassword({email:$("loginEmail").value,password:$("loginPassword").value});if(error)$("authMessage").textContent=error.message});
$("logoutBtn").onclick=()=>db.auth.signOut();
document.querySelectorAll(".nav-item[data-page]").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.querySelectorAll("[data-open-add]").forEach(b=>b.onclick=()=>setAddType(b.dataset.openAdd));
$("dashboardDate").value=today(); $("recordDate").value=today();
$("dashboardDate").onchange=loadDashboard;
$("dbFilter").onclick=renderDatabase;
$("dbClear").onclick=()=>{$("dbSearch").value="";$("dbFrom").value="";$("dbTo").value="";$("dbType").value="all";renderDatabase()};
$("recordType").onchange=updateAddForm;
$("cancelEdit").onclick=()=>showPage("dashboard");
$("recordForm").addEventListener("submit",async e=>{
  e.preventDefault(); const t=$("recordType").value;
  const payload={date:$("recordDate").value,record_type:t,leather_type:t==="production"?null:$("leatherType").value.trim(),sqft:t==="production"?null:Number($("sqft").value||0),pairs:t==="production"?Number($("pairs").value||0):null,created_by:currentUser.id};
  const {error}=await db.from("production_records").insert(payload);
  if(error){toast(error.message);return} toast("Record saved");e.target.reset();$("recordDate").value=today();updateAddForm();await loadRecords();showPage("dashboard");
});
window.openEdit=(id)=>{
  const r=records.find(x=>x.id===id);if(!r)return;editingId=id;
  $("editId").value=id;$("editDate").value=r.date;$("editType").value=r.record_type;$("editLeatherType").value=r.leather_type||"";$("editSqft").value=r.sqft??"";$("editPairs").value=r.pairs??"";
  const prod=r.record_type==="production";$("editLeatherWrap").classList.toggle("hidden",prod);$("editSqftWrap").classList.toggle("hidden",prod);$("editPairsWrap").classList.toggle("hidden",!prod);$("modal").classList.remove("hidden");
};
$("closeModal").onclick=()=>{$("modal").classList.add("hidden");editingId=null};
$("editForm").addEventListener("submit",async e=>{
  e.preventDefault();const r=records.find(x=>x.id===editingId);const prod=r.record_type==="production";
  const payload={date:$("editDate").value,leather_type:prod?null:$("editLeatherType").value.trim(),sqft:prod?null:Number($("editSqft").value||0),pairs:prod?Number($("editPairs").value||0):null};
  const {error}=await db.from("production_records").update(payload).eq("id",editingId);if(error){toast(error.message);return}
  $("modal").classList.add("hidden");toast("Record updated");await loadRecords();
});
window.deleteRecord=async id=>{
  if(!confirm("Delete this record?"))return;const {error}=await db.from("production_records").delete().eq("id",id);if(error){toast(error.message);return}toast("Record deleted");await loadRecords();
};

async function init(){
  if(!window.SUPABASE_URL||window.SUPABASE_URL.includes("YOUR_")){ $("loading").textContent="Open config.js and add your Supabase URL and publishable key."; return; }
  const {data:{session}}=await db.auth.getSession();
  $("loading").classList.add("hidden");
  if(session){currentUser=session.user;$("userEmail").textContent=session.user.email;$("appView").classList.remove("hidden");await loadRecords();showPage("dashboard")}
  else $("authView").classList.remove("hidden");
  db.auth.onAuthStateChange((_event,s)=>{if(s){currentUser=s.user;$("authView").classList.add("hidden");$("appView").classList.remove("hidden");$("userEmail").textContent=s.user.email;loadRecords()}else{$("appView").classList.add("hidden");$("authView").classList.remove("hidden")}});
}
init();
