(() => {
'use strict';
const stability = (a, pe) => (a - pe) / (1 - pe);
const reliability = (s, n) => s > 0 && n > 0 ? 100 * Math.sqrt(s * n) : 0;
const pooledAUC = (positives, negatives) => positives.reduce((sum,p) => sum + negatives.reduce((n,q) => n + (p > q ? 1 : p === q ? .5 : 0),0),0) / (positives.length * negatives.length);
if (typeof document === 'undefined') { module.exports = {stability, reliability, pooledAUC}; return; }
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const data = window.BENCHMARK, models = data.models;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f = (n,d=2) => n == null ? '—' : n.toFixed(d);
const short = {'Sentiment & Emotion Understanding':'Sentiment & Emotion','Task Completion Verification':'Completion Verification','Text-based Web Interaction':'Web Interaction','Knowledge & Commonsense':'Knowledge & Commonsense'};
let selectedModel = null;
function visibleModels() {
 const query = $('#model-search').value.trim().toLowerCase(), filter=$('#access-filter').value, key=$('#sort-by').value;
 return models.filter(m => m.name.toLowerCase().includes(query) && (filter === 'all' || (filter === 'measured' ? m.R != null : m.access === filter))).sort((a,b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity) || a.rank - b.rank);
}
function scoreCell(value, type) { return value == null ? '<span class="na" title="Not measured">—</span>' : `<span class="num">${f(value)}</span><div class="score-track ${type}"><i style="width:${value}%"></i></div>`; }
function renderBoard() {
 const ms=visibleModels();
 $('#model-rows').innerHTML=ms.map((m,index)=>`<tr class="${selectedModel===m.name?'selected':''}"><td>${String(index+1).padStart(2,'0')}</td><th scope="row" class="model-name">${esc(m.name)}<small>${m.access==='open_weights'?'Open weights':'Closed API'}${m.name==='SII-Decision-4B'?' · reliability: +fla':''}</small></th><td class="score-cell">${scoreCell(m.C,'')}</td><td class="score-cell">${scoreCell(m.R,'reliability')}</td><td class="num">${f(m.S)}</td><td class="num">${f(m.N)}</td><td><button class="inspect" data-model="${esc(m.name)}" aria-label="Inspect ${esc(m.name)}">Inspect ↗</button></td></tr>`).join('');
 $('#model-count').textContent=`${ms.length} / 21 models`; $('#no-results').hidden=ms.length!==0;
 $('#board-status').textContent=`${ms.length} models, sorted by ${$('#sort-by').selectedOptions[0].textContent}. Row numbers follow the current display order.`;
 $$('#model-rows .inspect').forEach(b=>b.onclick=()=>inspect(b.dataset.model)); renderScatter(ms); renderRankBars(ms);
}
function renderRankBars(ms) {
 const key=$('#sort-by').value, signed=key==='S'||key==='N';
 $('#rank-unit').textContent={C:'C / 100',R:'100R',S:'S',N:'N'}[key];
 $('#rank-scale').innerHTML=(signed?[-1,-.5,0,.5,1]:[0,25,50,75,100]).map(v=>`<span>${v}</span>`).join('');
 $('#rank-bars').innerHTML=ms.map((m,index)=>{
  const raw=m[key], pct=raw==null?0:signed?raw*50:raw, left=signed?(raw<0?50+pct:50):0;
  return `<button class="rank-row ${m.access==='closed_api'?'api':''} ${selectedModel===m.name?'active':''}" data-rank-model="${esc(m.name)}" aria-label="Position ${index+1}, ${esc(m.name)}, ${key} ${raw==null?'not measured':f(raw)}. Inspect model."><span class="rank-label"><span class="rank-number">${String(index+1).padStart(2,'0')}</span><span class="rank-model">${esc(m.name)}</span></span><span class="rank-track ${signed?'signed':''}"><i style="left:${left}%;width:${Math.abs(pct)}%"></i></span><b>${f(raw)}</b></button>`;
 }).join('');
 $('#rank-empty').hidden=ms.length!==0;
 $$('[data-rank-model]').forEach(b=>b.onclick=()=>{inspect(b.dataset.rankModel);$('#model-detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});});
}
function inspect(name) {
 const m=models.find(m=>m.name===name); selectedModel=name;
 $('#model-detail').hidden=false;
 $('#model-detail').innerHTML=`<div class="detail-top"><h3>${esc(m.name)}</h3><button id="close-detail" aria-label="Close model details">×</button></div><div class="detail-scores"><span>Rank C #${m.rank}</span><span>C ${f(m.C)}</span><span>100R ${f(m.R)}</span><span>S ${f(m.S)} · N ${f(m.N)}</span></div><div class="detail-grid">${data.domains.map(d=>`<div>${esc(short[d]||d)}<b>${f(m.domains[d])}</b></div>`).join('')}</div><p class="small">${m.R==null?'Reliability has not been measured for this configuration.':`Reliability configuration: ${esc(m.reliabilityConfiguration)}. R uses separate runs and fixed subsets.`}</p>`;
 $('#close-detail').onclick=()=>{selectedModel=null;$('#model-detail').hidden=true;renderBoard();};
 $('#score-model').value=name;renderScoring();renderBoard();
}
function renderScatter(ms) {
 const measured=ms.filter(m=>m.R!=null), W=1200,H=740;
 const x=r=>85+10.5*r,y=c=>650-5.8*c;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='17px Arial';
 const points=measured.map(m=>({m,x:x(m.R),y:y(m.C)}));
 const boxes=[],labels=[];
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const names={'SII-Decision-4B':'SII-Decision-4B (+fla)','KnowLine-31B-Gen1':'KnowLine-31B','GPT-6 Luna Responses · medium':'GPT-6 Luna','GPT-6 Sol Responses · medium':'GPT-6 Sol'};
 // Fit labels around exact, unshifted data coordinates. Leaders connect displaced labels.
 for(const p of [...points].sort((a,b)=>b.m.C-a.m.C)) {
  const label=names[p.m.name]||p.m.name,w=ctx.measureText(label).width+10,h=24;
  const candidates=[];
  for(let radius=0;radius<=300;radius+=28){for(const dy of radius===0?[0]:[-radius,radius]){for(const dx of [16,-w-16,40,-w-40])candidates.push({x:p.x+dx,y:p.y+dy-h/2,w,h});}}
  let box=candidates.find(b=>b.x>=90&&b.x+b.w<=1160&&b.y>=30&&b.y+b.h<=637&&!boxes.some(q=>overlaps(b,q))&&!points.some(q=>overlaps(b,{x:q.x-10,y:q.y-10,w:20,h:20})));
  if(!box)box={x:90,y:35+labels.length*26,w,h};
  boxes.push(box);labels.push({p,label,box});
 }
 let svg='<svg viewBox="0 0 1200 740" role="group" aria-label="Competence versus reliability. Every measured model is labeled; select a point or name for exact scores.">';
 for(let n=0;n<=100;n+=20)svg+=`<path d="M${x(n)} 70V650 M85 ${y(n)}H1135" stroke="#e2e8f2" fill="none"/><text x="${x(n)}" y="681" text-anchor="middle" font-size="19" fill="#53647d">${n}</text><text x="67" y="${y(n)+6}" text-anchor="end" font-size="19" fill="#53647d">${n}</text>`;
 svg+='<text x="610" y="724" text-anchor="middle" font-size="23" fill="#273b58">Reliability · 100R</text><text x="25" y="360" text-anchor="middle" transform="rotate(-90 25 360)" font-size="23" fill="#273b58">Competence · C</text>';
 for(const {p,box} of labels){const endX=Math.max(box.x,Math.min(p.x,box.x+box.w)),endY=box.y+box.h/2;svg+=`<path d="M${p.x} ${p.y}L${endX} ${endY}" stroke="#a2afc4" stroke-width="1.2" fill="none"/>`;}
 for(const p of points){const m=p.m;svg+=`<circle class="point" cx="${p.x}" cy="${p.y}" r="${m.name===selectedModel?9:7}" fill="${m.access==='closed_api'?'#bc7b12':'#3558e8'}" tabindex="0" role="button" data-point="${esc(m.name)}" aria-label="${esc(m.name)}, competence ${f(m.C)}, reliability ${f(m.R)}"><title>${esc(m.name)} · C ${f(m.C)} · 100R ${f(m.R)}</title></circle>`;}
 for(const {p,label,box} of labels)svg+=`<text class="model-plot-label" x="${box.x+5}" y="${box.y+18}" font-size="17" fill="${p.m.access==='closed_api'?'#94600c':'#253b59'}" data-label-model="${esc(p.m.name)}" tabindex="0" role="button" aria-label="Inspect ${esc(p.m.name)}">${esc(label)}<title>C ${f(p.m.C)} · 100R ${f(p.m.R)}</title></text>`;
 $('#scatter').innerHTML=svg+'</svg>';
 $$('[data-point], [data-label-model]').forEach(p=>{const select=()=>inspect(p.dataset.point||p.dataset.labelModel);p.onclick=select;p.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}};});
}
function setupTabs(selector, onChange) {
 const buttons=$$(selector);
 function activate(b, focus=false){buttons.forEach(t=>{const active=t===b;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;$('#'+t.getAttribute('aria-controls')).hidden=!active;});if(focus)b.focus();onChange?.(b);}
 buttons.forEach((b,i)=>{b.onclick=()=>activate(b);b.onkeydown=e=>{let j;if(e.key==='ArrowRight')j=(i+1)%buttons.length;else if(e.key==='ArrowLeft')j=(i+buttons.length-1)%buttons.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=buttons.length-1;if(j!==undefined){e.preventDefault();activate(buttons[j],true);}};});
}
setupTabs('.board-tabs [role=tab]');
['#model-search','#access-filter','#sort-by'].forEach(s=>$(s).addEventListener('input',renderBoard));
// Fixed distinct permutations; the original order is excluded. These are teaching inputs only.
const options=['3','4','7','9'];
function permutations(xs){if(!xs.length)return [[]];return xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(p=>[x,...p]));}
const orders=permutations(options).filter(p=>p.join()!==options.join());
// Choose a spread across the permutation space so both behaviors are visible.
const orderIndices=[6,14,2,19,10,0,21,4,16,8,12,22], demoOrders=orderIndices.map(i=>orders[i]);
let shuffleStep=0, agreements=[], shuffleMode='stable';
$('#shuffle-options').innerHTML=options.map(v=>`<div class="option" data-option="${v}"><span class="option-label"></span><span class="option-value">${v}</span><span class="selected-tag">SELECTED</span></div>`).join('');
function showOrder(order){const selected=shuffleMode==='stable'?'4':order[1];options.forEach(v=>{const el=$(`[data-option="${v}"]`),pos=order.indexOf(v);el.style.transform=`translateY(${pos*51}px)`;el.querySelector('.option-label').textContent=String.fromCharCode(65+pos);el.classList.toggle('selected',v===selected);});return selected==='4';}
function renderTrials(){ $('#trial-strip').innerHTML=Array.from({length:12},(_,i)=>`<span class="${i<agreements.length?(agreements[i]?'pass':'fail'):''}" title="${i<agreements.length?(agreements[i]?'Agrees':'Disagrees'):'Pending'}">${i<agreements.length?(agreements[i]?'✓':'×'):i+1}</span>`).join(''); }
function resetShuffle(){shuffleStep=0;agreements=[];showOrder(options);renderTrials();$('#shuffle-count').textContent='Original order';$('#shuffle-status').textContent=`Illustrative behavior: ${shuffleMode==='stable'?'stable answer identity':'position-biased selection'}. Original selected outcome: 4.`;$('#shuffle-math').textContent='Demo: 4 options → pₑ = 0.25';}
function nextShuffle(){if(shuffleStep>=12){return;}const agrees=showOrder(demoOrders[shuffleStep]);agreements.push(agrees);shuffleStep++;renderTrials();const a=agreements.filter(Boolean).length/shuffleStep;$('#shuffle-count').textContent=`Shuffle ${shuffleStep} / 12`;$('#shuffle-status').textContent=agrees?'Same outcome selected, even though its position may have changed.':'The selected outcome changed. Matching the position label does not count as agreement.';$('#shuffle-math').textContent=`Illustrative ${shuffleStep<12?'running ':''}A = ${f(a,3)}; pₑ = 0.25; S = ${f(stability(a,.25),3)}. Official S averages 939 items × 12 shuffles.`;}
let removed=false;
function renderNull(){ $('#removable').classList.toggle('removed',removed);$('#removable').setAttribute('aria-hidden',String(removed));$('#null-state').textContent=removed?'Correct answer removed':'Answer present';$('#null-prob-bar').style.width=removed?'92%':'8%';$('#null-prob-value').textContent=removed?'0.92':'0.08';$('#null-status').textContent=removed?'No even number remains. The illustrative model assigns high null probability (low p(yes)).':'A correct option is available. The illustrative model assigns low null probability (high p(yes)).';}
function renderAUC(){const separation=.8;const neg=[.1,.25,.4,.55];const pos=[.1,.25,.4,.55].map(v=>Math.max(0,Math.min(1,Math.round((v+(separation-.5)*.9)*1000)/1000)));const auc=pooledAUC(pos,neg);let svg='<svg viewBox="0 0 500 112" role="img" aria-label="Illustrative pooled null-probability distributions"><line x1="110" y1="88" x2="480" y2="88" stroke="#b9c4d8"/><text x="0" y="29" font-size="10" fill="#64728a">Answer present</text><text x="0" y="63" font-size="10" fill="#64728a">Answer removed</text><text x="110" y="106" font-size="9" fill="#64728a">0</text><text x="475" y="106" font-size="9" fill="#64728a">1</text><text x="290" y="106" text-anchor="middle" font-size="9" fill="#64728a">p_null</text>';
 neg.forEach(v=>svg+=`<circle cx="${110+370*v}" cy="25" r="5" fill="#8292b5"><title>Answer present: ${v}</title></circle>`);pos.forEach(v=>svg+=`<circle cx="${110+370*v}" cy="60" r="5" fill="#3558e8"><title>Answer removed: ${v}</title></circle>`);$('#auc-dots').innerHTML=svg+'</svg>';$('#auc-readout').textContent=`AUC = ${f(auc,3)} → N = 2 × ${f(auc,3)} − 1 = ${f(2*auc-1,3)}`;}
function renderR(){const s=Number($('#s-slider').value),n=Number($('#n-slider').value);$('#s-value').textContent=f(s);$('#n-value').textContent=f(n);$('#r-value').textContent=f(reliability(s,n));}
$('#s-slider').oninput=renderR;$('#n-slider').oninput=renderR;$$('[data-preset]').forEach(b=>b.onclick=()=>{const[s,n]=b.dataset.preset.split(',');$('#s-slider').value=s;$('#n-slider').value=n;renderR();});
$('#score-model').innerHTML=models.map(m=>`<option value="${esc(m.name)}">${esc(m.name)}</option>`).join('');
function renderScoring(){const m=models.find(m=>m.name===$('#score-model').value);$('#domain-bars').innerHTML=data.domains.map(d=>`<button class="domain-row" data-domain="${esc(d)}" aria-label="${esc(d)}: ${f(m.domains[d])}. Inspect task selection."><span>${esc(short[d]||d)}</span><span class="domain-track"><i style="width:${m.domains[d]}%"></i></span><b>${f(m.domains[d])}</b></button>`).join('');const sum=Object.values(m.domains).reduce((a,b)=>a+b,0);$('#competence-total').textContent=f(sum/11);$('#competence-rank').textContent=`Rank #${m.rank} / 21`;$('#score-sum').textContent=`Sum of domain scores: ${f(sum,4)}
÷ 11 = ${f(sum/11,4)}`;$('#domain-description').textContent='Each bar shows the domain score. Every domain has the same 1/11 weight.';$$('[data-domain]').forEach(b=>b.onclick=()=>{const d=b.dataset.domain;$$('[data-domain]').forEach(x=>x.classList.toggle('active',x===b));const tier=data.tiers[d]===null?'All tasks (untiered)':d==='Math'?'Hard + Very Hard (70 + 30, pooled per task)':'Hard tier';$('#domain-description').textContent=`${d}: ${data.counts[d]} natural tasks · ${tier}. Domain score ${f(m.domains[d])}; contribution to C = ${f(m.domains[d]/11,3)} points.`;});}
$('#score-model').onchange=renderScoring;
// Scripted sandbox illustration. State is illustrative; no backend or model calls occur.
let sandboxStep=0,sandboxScenario='success';
const successFrames=[
 ['OBSERVE','PUBLIC OBSERVATION','goal: move report.txt\nsource: /inbox\ndestination: /archive','The goal and environment expose these paths.','Read the goal, current state, and full public history.'],
 ['GROUND OPTIONS','PUBLIC CANDIDATE MENU','move_file(\n  source="/inbox/report.txt",\n  destination="/archive/report.txt"\n)\nfinish()','Argument values come from the task and observed environment.','Build admissible choices from public functions and grounded values.'],
 ['DECIDE','MODEL CHOICE','selected: move_file\nsource: /inbox/report.txt\ndestination: /archive/report.txt','The model chooses an action through its typed decision interface.','Select an action; no reference answer is shown to the model.'],
 ['EXECUTE','DETERMINISTIC EXECUTOR','validate required arguments\nexecute move_file(...)\n→ environment transition','Execution moves the file in the simulated state.','Execute the selected valid call; no auxiliary model fills arguments.'],
 ['FEEDBACK','NEXT PUBLIC STATE','status: success\n/inbox: []\n/archive: [report.txt]','The updated observation returns to the model.','Append feedback to public history; continue the decision loop if needed.'],
 ['CHECK','NATIVE TASK CHECKER','goal state: satisfied\nsource file: absent\ndestination file: present\nillustrative credit: 1.0','Terminal outcome is scored by the task checker.','Check native success conditions, accepting valid alternative tool routes.']
];
const missingFrames=[successFrames[0],['GROUND OPTIONS','GROUNDED VALUES ONLY','source: /inbox/report.txt\nrequired: destination\nselected call omits destination','A required argument is missing from the selected call.','The example exposes an invalid selection; no value is invented.'],['DECIDE','MODEL CHOICE','move_file(\n  source="/inbox/report.txt"\n)\n# destination is missing','An incomplete call was selected.','The model’s selection still consumes the applicable attempt budget.'],['EXECUTE','ARGUMENT CHECK','validate required arguments\n→ missing destination\nDO NOT execute move_file','Validation fails. The environment is unchanged.','The invalid call is not executed and no missing parameter is filled.'],['FEEDBACK','PUBLIC ERROR FEEDBACK','error: missing required argument\nfield: destination\nstate: unchanged','The error returns to the model for its next decision.','Continue the loop; allow the model to correct the choice within budget.'],['CHECK','EPISODE NOT TERMINAL','checker: waiting\nnext: observe → choose again\nno task score yet','One invalid call is feedback, not an invented terminal score.','Score only the eventual terminal episode or native budget outcome.']];
function renderSandbox(){const bad=sandboxScenario==='missing',frame=(bad?missingFrames:successFrames)[sandboxStep],moved=!bad&&sandboxStep>=3;$$('[data-stage]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.stage)===sandboxStep);b.classList.toggle('done',Number(b.dataset.stage)<sandboxStep);b.setAttribute('aria-current',Number(b.dataset.stage)===sandboxStep?'step':'false');});$('#sandbox-stage-name').textContent=`0${sandboxStep+1} / ${frame[0]}`;$('#sandbox-panel-label').textContent=frame[1];$('#sandbox-code').textContent=frame[2];$('#sandbox-feedback').textContent=frame[3];$('#sandbox-feedback').className='sandbox-feedback'+(bad&&sandboxStep>=2?' error':moved?' success':'');$('#sandbox-stage-description').textContent=frame[4];$('#sandbox-narration').textContent=`Step ${sandboxStep+1}: ${frame[4]}`;$('#sandbox-step-counter').textContent=`${sandboxStep+1} / 6`;$('#file-origin').hidden=moved;$('#file-destination').hidden=!moved;$('#empty-folder').hidden=moved;}
renderBoard();resetShuffle();renderNull();renderAUC();renderR();renderScoring();renderSandbox();
// Non-interactive explanatory loops. Avoid hidden-tab work and respect reduced motion.
let loopTimer=null;
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
function startDemoLoops(){
 clearInterval(loopTimer);loopTimer=null;
 if(document.hidden||motionPreference.matches)return;
 loopTimer=setInterval(()=>{
  if(document.hidden||motionPreference.matches){clearInterval(loopTimer);loopTimer=null;return;}
  if(shuffleStep>=12){shuffleMode=shuffleMode==='stable'?'position':'stable';resetShuffle();}else nextShuffle();
  removed=!removed;renderNull();
  if(sandboxStep>=5){sandboxStep=0;sandboxScenario=sandboxScenario==='success'?'missing':'success';}else sandboxStep++;
  renderSandbox();
 },2400);
}
document.addEventListener('visibilitychange',startDemoLoops);
motionPreference.addEventListener('change',startDemoLoops);
startDemoLoops();

})();
