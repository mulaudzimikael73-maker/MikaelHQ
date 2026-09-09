(()=>{"use strict";
const WORKER=window.LIZZY_TELEGRAM_WORKER_URL||"https://lizzyos-notifications.mulaudzimikael73.workers.dev/";
const $=id=>document.getElementById(id);
async function sendLetter(){
 const subject=($("mikaelLetterSubject")?.value||"").trim()||"A letter for Mikael";
 const text=($("mikaelLetterText")?.value||"").trim();
 const status=$("mikaelLetterStatus");if(!text){status.textContent="Write something first ❤️";return}
 status.textContent="Sending…";
 try{
  const r=await fetch(WORKER,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify({action:"submit_letter",subject,text,from:"Lizzy",source:"LizzyOS Letter Room"})});
  const d=await r.json();if(!r.ok||d.success===false)throw new Error(d.error||"Could not send");
  $("mikaelLetterText").value="";$("mikaelLetterSubject").value="";
  status.textContent="💌 Letter delivered to Mikael.";
 }catch(e){status.textContent="Could not send right now. Please try again."}
}
$("writeMikaelLetter")?.addEventListener("click",()=>{$("mikaelLetterForm")?.classList.remove("hidden");$("writeMikaelLetter").classList.add("hidden");$("mikaelLetterText")?.focus()});
$("cancelMikaelLetter")?.addEventListener("click",()=>{$("mikaelLetterForm")?.classList.add("hidden");$("writeMikaelLetter").classList.remove("hidden")});
$("sendMikaelLetter")?.addEventListener("click",sendLetter);
})();