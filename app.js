const PEOPLE = ["Alex Riff","Marta Stone","Dani Volt","Lucía Rock","Pablo Thunder","Nerea Blues","Javi Metal","Clara Gibson","Sergio Crash","Eva Riot"];
const QUESTIONS = [
  {text:"Ha vivido una temporada en Japón.", answer:"Marta Stone"},
  {text:"Sabe tocar tres instrumentos musicales.", answer:"Pablo Thunder"},
  {text:"Una vez apareció en la televisión.", answer:"Eva Riot"},
  {text:"Tiene miedo a las alturas.", answer:"Dani Volt"},
  {text:"Ha corrido una media maratón.", answer:"Clara Gibson"},
  {text:"Colecciona vinilos de bandas de los años 70.", answer:"Alex Riff"},
  {text:"Habla cuatro idiomas.", answer:"Nerea Blues"},
  {text:"Se ha teñido el pelo de azul alguna vez.", answer:"Javi Metal"},
  {text:"No sabe montar en bicicleta.", answer:"Lucía Rock"},
  {text:"Ha conocido a un músico famoso entre bastidores.", answer:"Sergio Crash"}
];
const $ = id => document.getElementById(id);
let player = "", current = 0, answers = Array(QUESTIONS.length).fill("");
let supabaseClient = null, session = null, submissions = [];

function show(id){ document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); $(id).classList.add("active"); window.scrollTo(0,0); }
function configured(){ return window.PETRA_CONFIG && window.PETRA_CONFIG.SUPABASE_URL.startsWith("https://") && window.PETRA_CONFIG.SUPABASE_ANON_KEY.startsWith("ey"); }
if (!window.PETRA_CONFIG?.DEMO_MODE && configured() && window.supabase) {
  supabaseClient = window.supabase.createClient(PETRA_CONFIG.SUPABASE_URL, PETRA_CONFIG.SUPABASE_ANON_KEY);
}
$("startBtn").onclick=()=>show("nameScreen");
$("beginQuiz").onclick=()=>{
  const n=$("playerName").value.trim();
  if(!n){$("playerName").focus();return;}
  player=n; current=0; answers=Array(QUESTIONS.length).fill(""); renderQuestion(); show("quizScreen");
};
$("playerName").addEventListener("keydown",e=>{if(e.key==="Enter")$("beginQuiz").click();});
function renderQuestion(){
  const q=QUESTIONS[current]; $("qNumber").textContent=String(current+1).padStart(2,"0");
  $("progressText").textContent=`${String(current+1).padStart(2,"0")} / ${QUESTIONS.length}`;
  $("progressBar").style.width=`${(current+1)/QUESTIONS.length*100}%`;
  $("questionText").textContent=q.text;
  $("choices").innerHTML="";
  PEOPLE.forEach(name=>{
    const b=document.createElement("button"); b.className="choice"+(answers[current]===name?" selected":""); b.textContent=name;
    b.onclick=()=>{answers[current]=name;renderQuestion();}; $("choices").appendChild(b);
  });
  $("backBtn").disabled=current===0;
  $("nextBtn").textContent=current===QUESTIONS.length-1?"ENVIAR RESPUESTAS ✓":"SIGUIENTE →";
}
$("backBtn").onclick=()=>{if(current>0){current--;renderQuestion();}};
$("nextBtn").onclick=async()=>{
  if(!answers[current]){alert("Elige una persona antes de continuar.");return;}
  if(current<QUESTIONS.length-1){current++;renderQuestion();return;}
  await submitAnswers();
};
async function submitAnswers(){
  const record={player_name:player,answers,score:answers.reduce((n,a,i)=>n+(a===QUESTIONS[i].answer?1:0),0)};
  try{
    if(supabaseClient){const {error}=await supabaseClient.from("petra_submissions").insert({player_name:player,answers,score:record.score});if(error)throw error;}
    else {const all=JSON.parse(localStorage.getItem("petra_demo_submissions")||"[]");all.push({...record,created_at:new Date().toISOString()});localStorage.setItem("petra_demo_submissions",JSON.stringify(all));}
    $("saveMessage").textContent="¡Respuestas guardadas! Gracias, "+player+".";
  }catch(e){$("saveMessage").textContent="No se han podido guardar las respuestas: "+e.message;return;}
  show("doneScreen");
}
$("homeBtn").onclick=()=>{ $("playerName").value=""; show("home"); };
$("adminLink").onclick=e=>{e.preventDefault();show("adminScreen");};
$("logoutBtn").onclick=()=>{if(supabaseClient)supabaseClient.auth.signOut();$("adminResults").hidden=true;$("adminLogin").hidden=false;show("home");};
$("loginBtn").onclick=async()=>{
  $("loginError").textContent="";
  if(!supabaseClient){$("loginError").textContent="La administración compartida requiere configurar Supabase. En modo demo, consulta los resultados en este mismo navegador.";return;}
  const {data,error}=await supabaseClient.auth.signInWithPassword({email:$("adminEmail").value,password:$("adminPassword").value});
  if(error){$("loginError").textContent=error.message;return;}
  session=data.session; await loadResults();
};
async function loadResults(){
  if(supabaseClient){
    const {data,error}=await supabaseClient.from("petra_submissions").select("*").order("created_at",{ascending:true});
    if(error){$("loginError").textContent=error.message;return;} submissions=data||[];
  } else submissions=JSON.parse(localStorage.getItem("petra_demo_submissions")||"[]");
  renderResults();
}
$("refreshBtn").onclick=loadResults;
function renderResults(){
  $("adminLogin").hidden=true;$("adminResults").hidden=false;
  const sorted=[...submissions].sort((a,b)=>b.score-a.score);
  $("countLabel").textContent=`${sorted.length} participante${sorted.length===1?"":"s"}`;
  $("leaderboard").innerHTML="";
  if(!sorted.length){$("leaderboard").innerHTML='<p class="muted">Todavía no hay respuestas.</p>';return;}
  const max=sorted[0].score;
  sorted.forEach((r,i)=>{
    const row=document.createElement("div");row.className="rank";
    row.innerHTML=`<span class="rankno">${i===0?"🏆":i+1+"º"}</span><strong></strong><span class="points">${r.score}/10</span>`;
    row.querySelector("strong").textContent=r.player_name;
    if(r.score===max)row.classList.add("winner");$("leaderboard").appendChild(row);
  });
  const winners=sorted.filter(r=>r.score===max).map(r=>r.player_name);
  const win=document.createElement("div");win.className="winnerbox";win.textContent=`🏆 ${max}/10 · ${winners.length>1?"EMPATE: ":"GANADOR/A: "}${winners.join(", ")}`;$("leaderboard").prepend(win);
}
$("exportBtn").onclick=()=>{
  const rows=[["Participante","Aciertos","Respuestas"],...submissions.map(r=>[r.player_name,r.score,(r.answers||[]).join(" | ")])];
  const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(";")).join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="petra-resultados.csv";a.click();URL.revokeObjectURL(a.href);
};
if(PETRA_CONFIG?.DEMO_MODE){
  $("adminLogin").hidden=true;
  const demoBtn=document.createElement("button");demoBtn.className="primary";demoBtn.textContent="VER MARCADOR DE PRUEBA";
  demoBtn.onclick=loadResults;$("adminLogin").before(demoBtn);
  $("adminLogin").innerHTML='<p class="small">Modo demostración: las respuestas se guardan solo en este navegador. Para participantes en móviles distintos, conecta Supabase siguiendo el README.</p>';
}
