(()=>{"use strict";
const W=window.LIZZY_TELEGRAM_WORKER_URL||"https://lizzyos-notifications.mulaudzimikael73.workers.dev/";
const $=id=>document.getElementById(id);let game=new Chess(),selected=null,lastFen="",lastMessageIds=new Set();
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const api=async(action,body={})=>{const has=Object.keys(body).length;const r=await fetch(W+"?action="+encodeURIComponent(action),{method:has?"POST":"GET",headers:{"Content-Type":"application/json"},body:has?JSON.stringify({action,...body}):undefined,cache:"no-store"});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.error||`Request failed (${r.status})`);return d};
const glyph={p:"♟",r:"♜",n:"♞",b:"♝",q:"♛",k:"♚",P:"♙",R:"♖",N:"♘",B:"♗",K:"♔",Q:"♕"};
function render(){const b=$("board");b.innerHTML="";const bd=game.board();for(let r=0;r<8;r++)for(let c=0;c<8;c++){const sq=String.fromCharCode(97+c)+(8-r),p=bd[r][c];const x=document.createElement("button");x.className="sq "+((r+c)%2?"dark":"light");if(selected===sq)x.classList.add("selected");if(selected){try{if(game.moves({square:selected,verbose:true}).some(m=>m.to===sq))x.classList.add("legal")}catch{}}x.textContent=p?(p.color==="w"?glyph[p.type.toUpperCase()]:glyph[p.type]):"";x.onclick=()=>click(sq);b.appendChild(x)}$("turn").textContent=game.turn()==="w"?"🌸 Your turn — choose a white piece":"🖤 Mikael's turn — he's thinking…";$("moves").textContent=game.pgn()||"No moves yet."}
async function click(sq){if(game.turn()!=="w")return;if(!selected){const p=game.get(sq);if(!p||p.color!=="w")return;selected=sq;render();return}try{const m=game.move({from:selected,to:sq,promotion:"q"});if(!m){selected=sq;render();return}selected=null;render();await api("lizzy_chess_move",{fen:game.fen(),pgn:game.pgn(),turn:game.turn(),lastMove:m.san});}catch(e){alert(e.message);loadChess()}}
async function loadChess(){try{const d=await api("coop_chess"),s=d.state;if(s.fen&&s.fen!=="start"&&s.fen!==lastFen){game.load(s.fen);lastFen=s.fen}else if(s.fen==="start"&&lastFen!=="start"){game=new Chess();lastFen="start"}render()}catch(e){$("turn").textContent="Chess is unavailable: "+(e.message||"Worker error")}}
async function help(text){try{await api("lizzy_chess_help",{text});$("hintBox").textContent="💌 Mikael has been notified. His reply will appear here.";loadMessages()}catch(e){$("hintBox").textContent=e.message}}
function openPieceModal(){ $("pieceModal").classList.remove("hidden") }
function closePieceModal(){ $("pieceModal").classList.add("hidden") }
$("pieceHelpBtn").onclick=openPieceModal;$("closePieceModal").onclick=closePieceModal;document.querySelectorAll("[data-piece]").forEach(b=>b.onclick=()=>{closePieceModal();help(`How does the ${b.dataset.piece} move in chess? Please explain it simply to Lizzy and include a quick example.`)});
$("hintHelpBtn").onclick=()=>help("Give me a hint for my current position. Please tell me what I should look at without simply making the move for me.");
$("rescueHelpBtn").onclick=()=>help("I have no idea what to do 😭 Please look at my current position and give me a beginner-friendly suggestion.");
$("askHelp").onclick=()=>{const t=$("customHelp").value.trim();if(t){$("customHelp").value="";help(t)}};
async function loadMessages(){try{const d=await api("lizzy_messages"),msgs=d.messages||[];const inbox=$("mikaelInbox");if(!msgs.length){inbox.innerHTML='<span class="empty">Waiting for Mikael…</span>';return}inbox.innerHTML=msgs.slice(-12).reverse().map(m=>`<div class="inbox-msg ${m.status==="pending"?"new":""}"><div class="inbox-title">🖤 Mikael</div><div>${esc(m.text)}</div><time>${new Date(m.createdAt).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</time></div>`).join("");for(const m of msgs){if(m.status==="pending"&&!lastMessageIds.has(m.id)){lastMessageIds.add(m.id);try{await api("lizzy_message_seen",{id:m.id})}catch{}}}}catch(e){$("mikaelInbox").innerHTML=`<span class="empty">Could not load replies: ${esc(e.message)}</span>`}}
let selectedEscapeRoom=localStorage.getItem("lizzyEscapeRoom")||"timeline", escapeRooms=[];
function renderEscapeRooms(rooms){escapeRooms=rooms||[];const box=$("escapeRooms");if(!box)return;box.innerHTML=escapeRooms.map(r=>`<button class="escape-room-card ${r.id===selectedEscapeRoom?"active":""}" data-room="${esc(r.id)}"><span>${esc(r.tag)}</span><b>${esc(r.title)}</b><small>${r.locks} locks • ${esc(r.desc)}</small></button>`).join("");box.querySelectorAll("[data-room]").forEach(b=>b.onclick=()=>{selectedEscapeRoom=b.dataset.room;localStorage.setItem("lizzyEscapeRoom",selectedEscapeRoom);escapeLoad()})}
async function escapeLoad(){
 try{
  const d=await fetch(W+"?action=coop_escape&room="+encodeURIComponent(selectedEscapeRoom),{cache:"no-store"}).then(r=>r.json());if(!d.success)throw new Error(d.error||"Worker error");
  renderEscapeRooms(d.rooms);const s=d.state||{},total=Object.keys(s.stageInfo||{}).length||5,solved=Array.isArray(s.solvedStages)?s.solvedStages:[],stage=Number(s.stage||1),info=s.stageInfo?.[stage];
  $("escapeStatus").textContent=s.status==="solved"?"🎉 You escaped!":(s.status==="active"?`🟢 Lock ${stage} of ${total} is active`:"Waiting for Mikael to start this room");
  $("escapeRoomTitle").textContent=s.roomTitle||"Choose an escape room";$("escapeRoomTag").textContent=s.roomTag||"";$("escapeRoomDesc").textContent=s.roomDesc||"";
  $("escapeProgress").innerHTML=Array.from({length:total},(_,i)=>i+1).map(n=>`<div class="lock-step ${solved.includes(n)?"solved":""} ${s.status==="active"&&stage===n&&!solved.includes(n)?"current":""}">${solved.includes(n)?"🔓":"🔒"} Lock ${n}</div>`).join("");
  $("lizzyClues").innerHTML=(s.lizzyClues||[]).map((x,i)=>`<div class="clue"><b>Clue ${i+1}</b><br>${esc(x)}</div>`).join("");
  $("currentPuzzle").innerHTML=s.status==="solved"?`<h4>🎉 Door open</h4><div>You and Mikael escaped <b>${esc(s.roomTitle)}</b>. Teamwork wins. ❤️</div>`:s.status!=="active"?`<h4>🔐 Room not started</h4><div>Mikael needs to start this room from HQ.</div>`:`<h4>Lock ${stage}: ${esc(info?.title||"Current lock")}</h4><div>${esc(info?.hint||"Compare both sets of clues, talk, and solve together.")}</div>`;
  $("solveResult").textContent=solved.includes(stage)?"🔓 This lock is already open.":(s.status==="active"?"Talk to Mikael, combine both clues, then enter the answer. ✨":"");
  $("escapeAnswer").disabled=s.status!=="active"||solved.includes(stage);$("escapeSolve").disabled=s.status!=="active"||solved.includes(stage);$("escapeAnswer").placeholder=s.status==="active"?"Enter combined answer":"Start the room first";
  $("chat").innerHTML=(s.chat||[]).map(x=>`<div><b>${esc(x.from)}:</b> ${esc(x.text)}</div>`).join("");$("chat").scrollTop=$("chat").scrollHeight;
 }catch(e){$("escapeStatus").textContent="Escape room unavailable: "+(e.message||"Worker error")}
}
async function solveEscape(){const answer=$("escapeAnswer").value.trim();if(!answer)return;try{const d=await api("lizzy_escape_solve",{roomId:selectedEscapeRoom,stage:Number(document.querySelector(".lock-step.current")?.textContent?.match(/\d+/)?.[0]||1),answer});$("escapeAnswer").value="";$("solveResult").textContent=d.correct?"🔓 Correct! Lock opened. Talk to Mikael about the next one. ❤️":"❌ Not quite. Compare both sets of clues and try again.";escapeLoad()}catch(e){$("solveResult").textContent=e.message}}
$("escapeSolve").onclick=solveEscape;$("escapeAnswer").onkeydown=e=>{if(e.key==="Enter")solveEscape()};
$("chatSend").onclick=async()=>{const t=$("chatInput").value.trim();if(!t)return;try{await api("lizzy_escape_chat",{roomId:selectedEscapeRoom,text:t});$("chatInput").value="";escapeLoad()}catch(e){alert(e.message)}};$("chatInput").onkeydown=e=>{if(e.key==="Enter")$("chatSend").click()};


let rapState=null;
function rapTotals(s){let l=0,m=0;Object.values(s.scores||{}).forEach(x=>{l+=Number(x.lizzy?.total||0);m+=Number(x.mikael?.total||0)});return [l,m]}
function rapPhaseUI(s,mine){
 const badge=$("rapPhaseBadge"); if(!badge)return;
 if(s.status!=="active")badge.textContent="BATTLE NOT STARTED";else if(!mine)badge.textContent="STEP 1 • WRITE";else badge.textContent=s.phase==="revealed"?"STEP 3 • JUDGED":"STEP 2 • WAITING FOR OPPONENT";
}
function renderRap(s,rounds){
 rapState=s; const round=Number(s.round||1), info=(rounds||[])[round-1]||{}; const [ls,ms]=rapTotals(s), mine=s.submissions?.lizzy;
 $("lizzyScore").textContent=ls;$("mikaelScore").textContent=ms;$('rapRound').innerHTML=s.status==="solved"?"🏆 BATTLE COMPLETE":`ROUND ${round} / 5 <small>LIVE</small>`;
 $("rapTitle").textContent=info.title||"Rap Battle";$('rapPrompt').textContent=info.prompt||"";
 $("rapStatus").textContent=s.status!=="active"?"Waiting for Mikael to start":!mine?"🎤 Write your verse":s.phase==="revealed"?"⚖️ The AI judge has scored the round":s.submissions?.mikael?"🕒 Both verses are in — judging…":"🔒 Your verse is submitted. Waiting for Mikael…";
 rapPhaseUI(s,mine);
 $("rapSubmit").disabled=s.status!=="active"||!!mine;$("rapText").disabled=s.status!=="active"||!!mine;
 const wait=$("rapWaiting"); if(wait) wait.textContent=s.status!=="active"?"":"Both players submit their written verses. The AI judge will score them automatically once both are in.";
 if(s.phase==="revealed"){
   const sc=s.scores?.[round]||{}, w=s.roundWinners?.[round-1];
   const winner=w==="lizzy"?"🩷 LIZZY WINS THE ROUND":w==="mikael"?"🖤 MIKAEL WINS THE ROUND":"🤝 ROUND TIED";
   const hist=s.history?.[round-1]||{}, lsx=hist.submissions?.lizzy, msx=hist.submissions?.mikael;
   $("rapReveal").innerHTML=`<div class="winner">${winner}</div><div class="ai-verdict">🤖 AI WRITTEN-BAR JUDGING</div><div class="verses"><article><b>🩷 Lizzy — ${sc.lizzy?.total||0}/100</b><p>${esc(lsx?.text||"")}</p><small>${esc(sc.lizzy?.feedback||"")}</small></article><article><b>🖤 Mikael — ${sc.mikael?.total||0}/100</b><p>${esc(msx?.text||"")}</p><small>${esc(sc.mikael?.feedback||"")}</small></article></div>`;
   $("rapNext").classList.remove("hidden");$("rapNext").textContent=round>=5?"🏆 Finish Battle":"Next Round →";
 } else {$("rapReveal").innerHTML=`<div class="waiting">${mine?"🔒 Your verse is locked. Waiting for Mikael to submit his verse…":"The arena is ready. Waiting for both verses."}</div>`;$("rapNext").classList.add("hidden")}
 if(!mine)$('rapText').value="";
 $("rapHistory").innerHTML=(s.history||[]).slice().reverse().map(h=>`<div class="history-row"><b>Round ${h.round} — ${esc(h.title)}</b><span>${h.winner==="lizzy"?"🩷 Lizzy":h.winner==="mikael"?"🖤 Mikael":"🤝 Tie"} · ${h.scores.lizzy.total}–${h.scores.mikael.total}</span></div>`).join("")||"<span class='empty'>No rounds judged yet.</span>";
}
async function loadRap(){try{const d=await api("coop_rap");renderRap(d.state,d.rounds)}catch(e){$("rapStatus").textContent="Rap battle unavailable: "+e.message}}
let rapPollTimer=null;function startRapPolling(){clearInterval(rapPollTimer);rapPollTimer=setInterval(()=>{const tab=$("rap");if(tab&&!tab.classList.contains("hidden"))loadRap()},3000)}startRapPolling();
async function submitRap(){const t=$("rapText").value.trim();if(!t)return;try{const d=await api("lizzy_rap_submit",{text:t});$("rapText").value="";$("rapResult").textContent=d.state.phase==="revealed"?"⚖️ Both verses are in. The AI judge has decided!":"🔒 Written verse submitted. Waiting for Mikael…";renderRap(d.state,d.rounds)}catch(e){$("rapResult").textContent=e.message}}
async function nextRap(){try{const d=await api("lizzy_rap_next");$("rapResult").textContent="";renderRap(d.state,d.rounds)}catch(e){$("rapResult").textContent=e.message}}
// Co-op tabs

 document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.add("hidden"));$(b.dataset.tab).classList.remove("hidden");document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));if(b.dataset.tab==="rap")loadRap();});
$("rapText").oninput=()=>$("rapCount").textContent=`${$("rapText").value.length} / 1600`;
$("rapSubmit").onclick=submitRap;$("rapNext").onclick=nextRap;

})();
