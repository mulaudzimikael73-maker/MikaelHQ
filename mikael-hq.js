(() => {
"use strict";
const WORKER = "https://lizzyos-notifications.mulaudzimikael73.workers.dev/";
const KEY = "mikaelHQKeyV1";
const $=id=>document.getElementById(id);
let apiKey=sessionStorage.getItem(KEY)||"";
let chessGame=null, selected=null, chessState=null, syncTimer=null;

function headers(){return {"Content-Type":"application/json","X-Mikael-HQ-Key":apiKey};}
async function api(action, body={}){
  const payload={action,...body,hqKey:apiKey};
  try{
    const r=await fetch(WORKER,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false)throw new Error(d.error||`HTTP ${r.status}`);
    return d;
  }catch(e){
    if(e instanceof TypeError)throw new Error("Could not reach the HQ Worker. Make sure the latest cloudflare-worker.js is deployed.");
    throw e;
  }
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function time(s){try{return new Date(s).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}catch{return s||""}}
function toast(msg,good=true){const e=document.createElement("div");e.textContent=msg;e.style.cssText="position:fixed;right:22px;bottom:22px;z-index:99;padding:13px 17px;border-radius:12px;background:#201321;border:1px solid #70405a;color:#ffd7e8;box-shadow:0 15px 40px #000";document.body.appendChild(e);setTimeout(()=>e.remove(),3000);}

async function login(){
  apiKey=$("hqKey").value.trim();
  if(!apiKey){$("loginStatus").textContent="Enter your HQ key.";return;}
  try{await api("hq_ping");sessionStorage.setItem(KEY,apiKey);$("login").classList.add("hidden");$("app").classList.remove("hidden");start();}
  catch(e){$("loginStatus").innerHTML=`<span class="err">${esc(e.message||"Access denied")}</span>`;}
}
$("loginBtn").onclick=login;$("hqKey").onkeydown=e=>{if(e.key==="Enter")login()};
$("logoutBtn").onclick=()=>{sessionStorage.removeItem(KEY);location.reload()};

function show(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  $(view).classList.remove("hidden");
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const titles={dashboard:"Good to see you, Mr Perfect.",letters:"Letters from Lizzy",chess:"Mikael × Lizzy Chess",escape:"Two-player escape room",rap:"Mikael × Lizzy Rap Battle",create:"Leave something for Lizzy",activity:"Shared activity"};
  $("viewTitle").textContent=titles[view]||"Mikael HQ";
  if(view==="letters")loadLetters();if(view==="chess")loadChess();if(view==="escape")loadEscape();if(view==="rap")loadRapHQ();if(view==="activity")loadActivity();
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>show(b.dataset.view));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));

async function loadLetters(){
  try{
    const d=await api("hq_letters");
    $("lettersList").innerHTML=d.letters?.length?d.letters.map(l=>`
      <article class="letter ${l.status==="unread"?"unread":""}">
        <div class="letter-head"><div><h3>💌 ${esc(l.subject||"A letter from Lizzy")}</h3><div class="letter-meta">${esc(l.from||"Lizzy")} · ${time(l.createdAt)} ${l.status==="unread"?'<span class="badge">UNREAD</span>':""}</div></div></div>
        <div class="letter-body">${esc(l.text)}</div>
        ${l.reply?`<div class="letter-body"><b>🖤 Your reply</b><br>${esc(l.reply)}</div>`:""}
        ${!l.reply?`<div class="reply"><textarea data-reply="${esc(l.id)}" placeholder="Write your reply…"></textarea><button class="primary replyBtn" data-id="${esc(l.id)}">Reply</button></div>`:""}
      </article>`).join(""):`<div class="card empty">No letters yet. When Lizzy writes to Mikael, they will appear here.</div>`;
    document.querySelectorAll(".replyBtn").forEach(b=>b.onclick=()=>replyLetter(b.dataset.id));
    $("letterBadge").textContent=(d.letters||[]).filter(x=>x.status==="unread").length||"";
  }catch(e){$("lettersList").innerHTML=`<div class="card err">${esc(e.message)}</div>`}
}
async function replyLetter(id){
  const t=document.querySelector(`[data-reply="${CSS.escape(id)}"]`);
  if(!t?.value.trim())return;
  try{await api("reply_letter",{id,reply:t.value.trim()});toast("Reply sent to Lizzy ❤️");loadLetters();loadDashboard();}catch(e){toast(e.message,false)}
}

async function loadDashboard(){
  try{
    const d=await api("hq_dashboard");
    $("statLetters").textContent=d.unreadLetters||0;$("statQuestions").textContent=d.openQuestions||0;$("statGames").textContent=d.activeGames||0;$("statActivity").textContent=d.activityCount||0;
    $("latestLetter").innerHTML=d.latestLetter?`<b>${esc(d.latestLetter.subject||"Letter")}</b><p>${esc(d.latestLetter.text).slice(0,260)}${d.latestLetter.text.length>260?"…":""}</p>`:"No letters yet.";
    $("gameStatus").innerHTML=d.chess?`♟️ ${esc(d.chess.status||"Game active")}<br><span class="muted">Turn: ${esc(d.chess.turn||"—")}</span>`:"No active game.";
    $("lastSync").textContent="Synced "+new Date().toLocaleTimeString();
  }catch(e){$("apiDot").style.color="#ff6677";$("lastSync").textContent="Offline"}
}

function boardPiece(p){const map={p:"♟",r:"♜",n:"♞",b:"♝",q:"♛",k:"♚",P:"♙",R:"♖",N:"♘",B:"♗",Q:"♕",K:"♔"};return map[p]||""}
function renderBoard(){
  const b=$("chessBoard");if(!chessGame)return;b.innerHTML="";
  const board=chessGame.board();
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const sq=String.fromCharCode(97+c)+(8-r),p=board[r][c]?.type?(board[r][c].color==="w"?board[r][c].type.toUpperCase():board[r][c].type):null;
    const el=document.createElement("button");el.className=`sq ${(r+c)%2?"dark":"light"} ${selected===sq?"selected":""}`;
    el.innerHTML=boardPiece(p);
    if(selected){try{const moves=chessGame.moves({square:selected,verbose:true});if(moves.some(m=>m.to===sq))el.classList.add("legal")}catch{}}
    el.onclick=()=>clickSquare(sq);b.appendChild(el);
  }
  $("chessTurn").textContent=chessGame.turn()==="w"?"White — Lizzy's turn":"Black — Mikael's turn";
}
async function clickSquare(sq){
  if(!chessGame)return;
  if(!selected){const p=chessGame.get(sq);if(!p)return;if((chessGame.turn()==="w"&&p.color!=="w")||(chessGame.turn()==="b"&&p.color!=="b"))return;selected=sq;renderBoard();return;}
  try{
    const move=chessGame.move({from:selected,to:sq,promotion:"q"});
    if(!move){selected=sq;renderBoard();return}
    selected=null;renderBoard();
    await api("chess_move",{fen:chessGame.fen(),pgn:chessGame.pgn(),lastMove:move.san,turn:chessGame.turn()});
    toast(`Move played: ${move.san}`);
  }catch(e){toast(e.message,false);loadChess()}
}
async function loadChess(){
  try{
    const d=await api("chess_state");chessState=d.state;
    if(!chessGame)chessGame=new Chess();
    if(d.state?.fen && d.state.fen!=="start")chessGame.load(d.state.fen); else if(d.state?.fen==="start"){chessGame.reset();}
    renderBoard();
    $("moveHistory").textContent=d.state?.pgn||"No moves yet.";
    $("helpRequests").innerHTML=d.requests?.length?d.requests.map(x=>`<div class="request"><b>🌸 ${time(x.createdAt)}</b><br>${esc(x.text)}<br><button class="primary resolveHelp" data-id="${esc(x.id)}">Mark handled</button></div>`).join(""):"<span class='empty'>Lizzy hasn't asked for help yet.</span>";
    document.querySelectorAll(".resolveHelp").forEach(b=>b.onclick=()=>resolveHelp(b.dataset.id));
    if(d.state?.gameOver){$("chessTurn").textContent="🏁 Game over — start a new game when you're ready."}
  }catch(e){$("chessBoard").innerHTML=`<div class="empty">${esc(e.message)}</div>`}
}
async function resolveHelp(id){try{await api("resolve_chess_help",{id});loadChess()}catch(e){toast(e.message,false)}}
$("refreshChess").onclick=loadChess;
$("resetChess").onclick=async()=>{if(!confirm("Start a new chess game?"))return;try{await api("chess_reset");chessGame=new Chess();selected=null;loadChess()}catch(e){toast(e.message,false)}};
$("sendHint").onclick=async()=>{const text=$("hintText").value.trim();if(!text)return;try{await api("send_chess_hint",{text});$("hintText").value="";toast("Hint sent to Lizzy 🎓")}catch(e){toast(e.message,false)}};

let selectedEscapeRoom=localStorage.getItem("mikaelEscapeRoom")||"timeline", escapeRooms=[];
function renderEscapeRoomsHQ(rooms){escapeRooms=rooms||[];const box=$("escapeRooms");if(!box)return;box.innerHTML=escapeRooms.map(r=>`<button class="escape-room-card ${r.id===selectedEscapeRoom?"active":""}" data-room="${esc(r.id)}"><span>${esc(r.tag)}</span><b>${esc(r.title)}</b><small>${r.locks} locks • ${esc(r.desc)}</small></button>`).join("");box.querySelectorAll("[data-room]").forEach(b=>b.onclick=()=>{selectedEscapeRoom=b.dataset.room;localStorage.setItem("mikaelEscapeRoom",selectedEscapeRoom);loadEscape()})}
async function loadEscape(){
 try{const d=await api("escape_state",{roomId:selectedEscapeRoom}),s=d.state||{},total=Object.keys(s.stageInfo||{}).length||5,stage=Number(s.stage||1),info=s.stageInfo?.[stage],solved=Array.isArray(s.solvedStages)?s.solvedStages:[];
  renderEscapeRoomsHQ(d.rooms);$("escapeRoomTitle").textContent=s.roomTitle||"Choose an escape room";$("escapeRoomTag").textContent=s.roomTag||"";$("escapeRoomDesc").textContent=s.roomDesc||"";
  $("escapeProgress").innerHTML=Array.from({length:total},(_,i)=>i+1).map(n=>`<div class="lock-step ${solved.includes(n)?"solved":""} ${s.status==="active"&&stage===n&&!solved.includes(n)?"current":""}">${solved.includes(n)?"🔓":"🔒"} Lock ${n}</div>`).join("");
  $("mikaelClues").innerHTML=(s.mikaelClues||[]).map((c,i)=>`<div class="clue"><b>Clue ${i+1}</b><br>${esc(c)}</div>`).join("");
  $("escapeStatus").innerHTML=`<p><b>${esc(s.status||"ready")}</b></p><p class="muted">${esc(s.progress||"Waiting for both agents.")}</p>`;
  $("escapePuzzle").dataset.stage=String(stage);$("escapePuzzle").innerHTML=s.status==="solved"?`<b>🎉 The door is open.</b><br>You escaped <b>${esc(s.roomTitle)}</b> together. ❤️`:(s.status!=="active"?`<b>🔐 Room not started.</b><br>Press Start / Reset Room to begin.`:`<b>Lock ${stage}: ${esc(info?.title||"Current lock")}</b><br>${esc(info?.hint||"Compare your clue with Lizzy's and enter the combined answer.")}`);
  $("hqEscapeAnswer").disabled=s.status!=="active"||solved.includes(stage);$("hqEscapeSolve").disabled=s.status!=="active"||solved.includes(stage);$("hqEscapeAnswer").placeholder=s.status==="active"?"Combined answer":"Start the room first";
  $("roomChat").innerHTML=(s.chat||[]).map(x=>`<div class="chat"><b>${esc(x.from)}:</b> ${esc(x.text)}</div>`).join("");$("roomChat").scrollTop=$("roomChat").scrollHeight;
 }catch(e){$("escapeStatus").innerHTML=`<span class="err">${esc(e.message)}</span>`}
}
async function solveEscapeHQ(){const answer=$("hqEscapeAnswer").value.trim();if(!answer)return;try{const d=await api("hq_escape_solve",{roomId:selectedEscapeRoom,stage:Number($("escapePuzzle").dataset.stage||1),answer});$("hqEscapeAnswer").value="";$("hqEscapeResult").textContent=d.correct?"🔓 Correct — lock opened.":"❌ Not quite. Talk to Lizzy and combine both clues.";loadEscape()}catch(e){$("hqEscapeResult").textContent=e.message}}
$("hqEscapeSolve").onclick=solveEscapeHQ;$("hqEscapeAnswer").onkeydown=e=>{if(e.key==="Enter")solveEscapeHQ()};
$("startEscape").onclick=async()=>{try{await api("escape_start",{roomId:selectedEscapeRoom});loadEscape();toast("Escape room started 🔐")}catch(e){toast(e.message,false)}};
$("sendChat").onclick=async()=>{const t=$("chatInput").value.trim();if(!t)return;try{await api("escape_chat",{roomId:selectedEscapeRoom,text:t});$("chatInput").value="";loadEscape()}catch(e){toast(e.message,false)}};$("chatInput").onkeydown=e=>{if(e.key==="Enter")$("sendChat").click()};


let rapHQState=null;
function rapHQTotals(s){let l=0,m=0;Object.values(s.scores||{}).forEach(x=>{l+=Number(x.lizzy?.total||0);m+=Number(x.mikael?.total||0)});return [l,m]}
function rapHQPhase(s,mine){const b=$("hqRapPhaseBadge");if(!b)return;b.textContent=s.status!=="active"?"BATTLE NOT STARTED":!mine?"STEP 1 • WRITE":s.phase==="revealed"?"STEP 3 • JUDGED":"STEP 2 • WAITING FOR OPPONENT";}
function renderRapHQ(s,rounds){
 rapHQState=s;const n=Number(s.round||1),info=(rounds||[])[n-1]||{},[ls,ms]=rapHQTotals(s),mine=s.submissions?.mikael;
 $("hqLizzyScore").textContent=ls;$("hqMikaelScore").textContent=ms;$("hqRapRound").innerHTML=s.status==="solved"?"🏆 BATTLE COMPLETE":`ROUND ${n} / 5 <small>LIVE</small>`;$("hqRapTitle").textContent=`Round ${n} — ${info.title||""}`;$("hqRapPrompt").textContent=info.prompt||"";
 $("hqRapSubmit").disabled=s.status!=="active"||!!mine;$("hqRapText").disabled=s.status!=="active"||!!mine;rapHQPhase(s,mine);
 $("hqRapStatus").innerHTML=s.status!=="active"?"Waiting for Mikael to start the battle.":!mine?"🎤 Write your verse and submit it.":s.phase==="revealed"?"⚖️ AI written-bar judging complete.":s.submissions?.lizzy?"🕒 Both verses are in — judging…":"🔒 Your verse is submitted. Waiting for Lizzy…";
 const wait=$("hqRapWaiting");if(wait)wait.textContent=s.status!=="active"?"":"Both players submit their written verses. The AI judge scores the round automatically once both are in.";
 if(s.phase==="revealed"){
   const sc=s.scores?.[n]||{},w=s.roundWinners?.[n-1],winner=w==="lizzy"?"🩷 LIZZY WINS THE ROUND":w==="mikael"?"🖤 MIKAEL WINS THE ROUND":"🤝 ROUND TIED",h=s.history?.[n-1]||{};
   $("hqRapReveal").innerHTML=`<div class="winner">${winner}</div><div class="ai-verdict">🤖 AI WRITTEN-BAR JUDGING</div><div class="verses"><article><b>🩷 Lizzy — ${sc.lizzy?.total||0}/100</b><p>${esc(h.submissions?.lizzy?.text||"")}</p><small>${esc(sc.lizzy?.feedback||"")}</small></article><article><b>🖤 Mikael — ${sc.mikael?.total||0}/100</b><p>${esc(h.submissions?.mikael?.text||"")}</p><small>${esc(sc.mikael?.feedback||"")}</small></article></div>`;
   $("hqRapNext").classList.remove("hidden");$("hqRapNext").textContent=n>=5?"🏆 Finish Battle":"Next Round →";
 }else{$("hqRapReveal").innerHTML=`<div class="waiting">${mine?"🔒 Your verse is locked. Waiting for Lizzy to submit her verse…":"The arena is ready. Waiting for both verses."}</div>`;$("hqRapNext").classList.add("hidden")}
 $("hqRapHistory").innerHTML=(s.history||[]).slice().reverse().map(h=>`<div class="history-row"><b>Round ${h.round} — ${esc(h.title)}</b><span>${h.winner==="lizzy"?"🩷 Lizzy":h.winner==="mikael"?"🖤 Mikael":"🤝 Tie"} · ${h.scores.lizzy.total}–${h.scores.mikael.total}</span></div>`).join("")||"<span class='empty'>No rounds judged yet.</span>";
}
async function loadRapHQ(){try{const d=await api("hq_rap_state");renderRapHQ(d.state,d.rounds)}catch(e){$("hqRapStatus").textContent=e.message}}
async function submitRapHQ(){const t=$("hqRapText").value.trim();if(!t)return;try{const d=await api("hq_rap_submit",{text:t});$("hqRapText").value="";$("hqRapResult").textContent=d.state.phase==="revealed"?"⚖️ Both verses are in. The AI judge has decided!":"🔒 Written verse submitted. Waiting for Lizzy…";renderRapHQ(d.state,d.rounds)}catch(e){$("hqRapResult").textContent=e.message}}
async function nextRapHQ(){try{const d=await api("hq_rap_next");$("hqRapResult").textContent="";renderRapHQ(d.state,d.rounds)}catch(e){$("hqRapResult").textContent=e.message}}
$("hqRapText").oninput=()=>$('hqRapCount').textContent=`${$("hqRapText").value.length} / 1600`;
$("hqRapSubmit").onclick=submitRapHQ;$("hqRapNext").onclick=nextRapHQ;$("startRap").onclick=async()=>{try{const d=await api("rap_start");renderRapHQ(d.state,d.rounds);toast("Rap battle started 🎤")}catch(e){toast(e.message,false)}};

async function loadActivity(){
  try{const d=await api("hq_activity");$("activityList").innerHTML=(d.activity||[]).map(x=>`<div class="activity"><b>${esc(x.type||"Activity")}</b><p>${esc(x.text||x.details||"")}</p><time>${time(x.createdAt)}</time></div>`).join("")||`<div class="card empty">Nothing yet.</div>`}
  catch(e){$("activityList").innerHTML=`<div class="card err">${esc(e.message)}</div>`}
}
$("refreshLetters").onclick=loadLetters;$("refreshActivity").onclick=loadActivity;
$("messageForm").onsubmit=async e=>{e.preventDefault();try{await api("hq_message",{text:$("messageText").value.trim()});$("messageText").value="";$("messageResult").innerHTML="<span class='ok'>Sent to Lizzy ❤️</span>";}catch(x){$("messageResult").innerHTML=`<span class='err'>${esc(x.message)}</span>`}};
$("questionForm").onsubmit=async e=>{e.preventDefault();try{await api("hq_question",{text:$("questionText").value.trim()});$("questionText").value="";$("questionResult").innerHTML="<span class='ok'>Question sent.</span>";}catch(x){$("questionResult").innerHTML=`<span class='err'>${esc(x.message)}</span>`}};

function start(){show("dashboard");loadDashboard();loadLetters();syncTimer=setInterval(()=>{loadDashboard();if(!document.getElementById("chess").classList.contains("hidden"))loadChess();if(!document.getElementById("escape").classList.contains("hidden"))loadEscape();if(!document.getElementById("rap").classList.contains("hidden"))loadRapHQ()},5000)}
})();