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
async function escapeLoad(){
  try{
    const d=await api("coop_escape"),s=d.state||{};
    const solved=Array.isArray(s.solvedStages)?s.solvedStages:[];
    $("escapeStatus").textContent=s.status==="solved"?"🎉 You escaped!":(s.status==="active"?`🟢 Lock ${s.stage||1} is active`:"Waiting for Mikael to start the room");
    [1,2,3].forEach(n=>{const el=$("lock"+n);el.classList.toggle("solved",solved.includes(n));el.classList.toggle("current",s.status==="active"&&Number(s.stage)===n&&!solved.includes(n));el.textContent=solved.includes(n)?`🔓 Lock ${n} — Open`:((s.status==="active"&&Number(s.stage)===n)?`🔐 Lock ${n} — Current`:`🔒 Lock ${n}`)});
    $("lizzyClues").innerHTML=(s.lizzyClues||[]).map(x=>`<div class="clue">${esc(x)}</div>`).join("");
    const stage=Number(s.stage||1),info=s.stageInfo?.[stage];
    $("currentPuzzle").innerHTML=s.status==="solved"?`<h4>🎉 The door is open</h4><div>You and Mikael solved all three locks. Teamwork wins. ❤️</div>`:s.status!=="active"?`<h4>🔐 Room not started</h4><div>Mikael needs to start the room from HQ first.</div>`:`<h4>Lock ${stage}: ${esc(info?.title||"Current lock")}</h4><div>Talk to Mikael, combine your clues, then enter the answer together.</div>`;
    $("solveResult").textContent=solved.includes(stage)?"🔓 This lock is already open.":(s.status==="active"?"Your answer is checked against the shared room. No guessing alone — talk first. ✨":"");
    $("escapeAnswer").disabled=s.status!=="active"||solved.includes(stage);$("escapeSolve").disabled=s.status!=="active"||solved.includes(stage);
    $("chat").innerHTML=(s.chat||[]).map(x=>`<div><b>${esc(x.from)}:</b> ${esc(x.text)}</div>`).join("");$("chat").scrollTop=$("chat").scrollHeight;
  }catch(e){$("escapeStatus").textContent="Escape room unavailable: "+(e.message||"Worker error")}
}
async function solveEscape(){const answer=$("escapeAnswer").value.trim();if(!answer)return;try{const d=await api("lizzy_escape_solve",{stage:Number(document.querySelector(".lock-step.current")?.id?.replace("lock","")||1),answer});$("escapeAnswer").value="";$("solveResult").textContent=d.correct?"🔓 Correct! The lock opens. Talk to Mikael about the next one. ❤️":"❌ Not quite. Compare both sets of clues and try again.";escapeLoad()}catch(e){$("solveResult").textContent=e.message}}
$("escapeSolve").onclick=solveEscape;
$("escapeAnswer").onkeydown=e=>{if(e.key==="Enter")solveEscape()};
$("chatSend").onclick=async()=>{const t=$("chatInput").value.trim();if(!t)return;try{await api("lizzy_escape_chat",{text:t});$("chatInput").value="";escapeLoad()}catch(e){alert(e.message)}};
$("chatInput").onkeydown=e=>{if(e.key==="Enter")$("chatSend").click()};


let rapState=null;
function rapTotals(s){let l=0,m=0;Object.values(s.scores||{}).forEach(x=>{l+=Number(x.lizzy?.total||0);m+=Number(x.mikael?.total||0)});return [l,m]}
function renderRap(s,rounds){
 rapState=s; const round=Number(s.round||1), info=(rounds||[])[round-1]||{}; const [ls,ms]=rapTotals(s);
 $("lizzyScore").textContent=ls;$("mikaelScore").textContent=ms;$("rapRound").textContent=s.status==="solved"?"🏆 Battle complete":`Round ${round} / 5`;
 $("rapTitle").textContent=info.title||"Rap Battle";$("rapPrompt").textContent=info.prompt||"";
 $("rapStatus").textContent=s.status!=="active"?"Waiting for Mikael to start":s.phase==="writing"?(s.submissions?.lizzy?"🕒 Verse submitted — waiting for Mikael…":"🎤 Write your verse"):(s.phase==="revealed"?"⚔️ Round judged":"🏆 Finished");
 const mine=s.submissions?.lizzy; $("rapSubmit").disabled=s.status!=="active"||s.phase!=="writing"||!!mine;
 if(s.phase==="revealed"){
   const sc=s.scores?.[round]||{}, w=s.roundWinners?.[round-1];
   const winner=w==="lizzy"?"🩷 LIZZY WINS THE ROUND":w==="mikael"?"🖤 MIKAEL WINS THE ROUND":"🤝 ROUND TIED";
   $("rapReveal").innerHTML=`<div class="winner">${winner}</div><div class="verses"><article><b>🩷 Lizzy — ${sc.lizzy?.total||0}/100</b><p>${esc(s.history?.[round-1]?.submissions?.lizzy?.text||"")}</p><small>${esc(sc.lizzy?.feedback||"")}</small></article><article><b>🖤 Mikael — ${sc.mikael?.total||0}/100</b><p>${esc(s.history?.[round-1]?.submissions?.mikael?.text||"")}</p><small>${esc(sc.mikael?.feedback||"")}</small></article></div>`;
   $("rapNext").classList.remove("hidden");$("rapNext").textContent=round>=5?"🏆 Finish Battle":"Next Round →";
 } else {$("rapReveal").innerHTML=s.phase==="writing"?`<div class="waiting">${mine?"Your verse is locked in. Waiting for Mikael's verse…":"The judge is waiting for both verses."}</div>`:`<div class="waiting">The battle is ready.</div>`;$("rapNext").classList.add("hidden")}
 $("rapText").disabled=s.status!=="active"||s.phase!=="writing"||!!mine;if(mine)$("rapText").value="";
 $("rapHistory").innerHTML=(s.history||[]).slice().reverse().map(h=>`<div class="history-row"><b>Round ${h.round} — ${esc(h.title)}</b><span>${h.winner==="lizzy"?"🩷 Lizzy":h.winner==="mikael"?"🖤 Mikael":"🤝 Tie"} · ${h.scores.lizzy.total}–${h.scores.mikael.total}</span></div>`).join("")||"<span class='empty'>No rounds judged yet.</span>";
}
async function loadRap(){try{const d=await api("coop_rap");renderRap(d.state,d.rounds)}catch(e){$("rapStatus").textContent="Rap battle unavailable: "+e.message}}
async function submitRap(){const t=$("rapText").value.trim();if(!t)return;try{const d=await api("lizzy_rap_submit",{text:t});$("rapText").value="";$("rapResult").textContent=d.state.phase==="revealed"?"⚖️ Both verses are in. The website has judged the round.":"🔒 Verse submitted. Waiting for Mikael…";renderRap(d.state,d.rounds)}catch(e){$("rapResult").textContent=e.message}}
async function nextRap(){try{const d=await api("lizzy_rap_next");$("rapResult").textContent="";renderRap(d.state,d.rounds)}catch(e){$("rapResult").textContent=e.message}}
// Co-op tabs
 document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.add("hidden"));$(b.dataset.tab).classList.remove("hidden");document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));if(b.dataset.tab==="rap")loadRap();});
$("rapText").oninput=()=>$("rapCount").textContent=`${$("rapText").value.length} / 1600`;
$("rapSubmit").onclick=submitRap;$("rapNext").onclick=nextRap;

$("back").onclick=()=>history.back();
loadChess();loadMessages();loadRap();setInterval(loadChess,3000);setInterval(loadMessages,2500);setInterval(()=>{if(!$("escape").classList.contains("hidden"))escapeLoad();if(!$("rap").classList.contains("hidden"))loadRap()},3000);
})();
