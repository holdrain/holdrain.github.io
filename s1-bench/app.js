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
 $('#model-rows').innerHTML=ms.map(m=>`<tr class="${selectedModel===m.name?'selected':''}"><td>${String(m.rank).padStart(2,'0')}</td><th scope="row" class="model-name">${esc(m.name)}<small>${m.access==='open_weights'?'Open weights':'Closed API'}${m.name==='SII-Decision-4B'?' · reliability: +fla':''}</small></th><td class="score-cell">${scoreCell(m.C,'')}</td><td class="score-cell">${scoreCell(m.R,'reliability')}</td><td class="num">${f(m.S)}</td><td class="num">${f(m.N)}</td><td><button class="inspect" data-model="${esc(m.name)}" aria-label="Inspect ${esc(m.name)}">Inspect ↗</button></td></tr>`).join('');
 $('#model-count').textContent=`${ms.length} / 21 models`; $('#no-results').hidden=ms.length!==0;
 $('#board-status').textContent=`${ms.length} models, sorted by ${$('#sort-by').selectedOptions[0].textContent}. Competence ranks remain unchanged.`;
 $$('#model-rows .inspect').forEach(b=>b.onclick=()=>inspect(b.dataset.model)); renderScatter(ms);
}
function inspect(name) {
 const m=models.find(m=>m.name===name); selectedModel=name;
 $('#model-detail').hidden=false;
 $('#model-detail').innerHTML=`<div class="detail-top"><h3>${esc(m.name)}</h3><button id="close-detail" aria-label="Close model details">×</button></div><div class="detail-scores"><span>Rank C #${m.rank}</span><span>C ${f(m.C)}</span><span>100R ${f(m.R)}</span><span>S ${f(m.S)} · N ${f(m.N)}</span></div><div class="detail-grid">${data.domains.map(d=>`<div>${esc(short[d]||d)}<b>${f(m.domains[d])}</b></div>`).join('')}</div><p class="small">${m.R==null?'Reliability has not been measured for this configuration.':`Reliability configuration: ${esc(m.reliabilityConfiguration)}. R uses separate runs and fixed subsets.`}</p>`;
 $('#close-detail').onclick=()=>{selectedModel=null;$('#model-detail').hidden=true;renderBoard();};
 $('#score-model').value=name;renderScoring();renderBoard();
}
function renderScatter(ms) {
 const measured=ms.filter(m=>m.R!=null); let svg='<svg viewBox="0 0 650 450" role="group" aria-label="Competence versus reliability scatter plot. Select a model point to inspect scores.">';
 const x=r=>60+5.45*r,y=c=>390-3.4*c;
 for(let n=0;n<=100;n+=20)svg+=`<path d="M${x(n)} 50V390 M60 ${y(n)}H605" stroke="#e4e9f2" fill="none"/><text x="${x(n)}" y="412" text-anchor="middle" font-size="11" fill="#64728a">${n}</text><text x="47" y="${y(n)+4}" text-anchor="end" font-size="11" fill="#64728a">${n}</text>`;
 svg+='<text x="335" y="442" text-anchor="middle" font-size="12" fill="#64728a">Reliability · 100R</text><text x="15" y="220" text-anchor="middle" transform="rotate(-90 15 220)" font-size="12" fill="#64728a">Competence · C</text>';
 for(const m of measured)svg+=`<circle class="point" cx="${x(m.R)}" cy="${y(m.C)}" r="${m.name===selectedModel?8:5.5}" fill="${m.access==='closed_api'?'#bc7b12':'#3558e8'}" tabindex="0" role="button" data-point="${esc(m.name)}" aria-label="${esc(m.name)}, competence ${f(m.C)}, reliability ${f(m.R)}"><title>${esc(m.name)} · C ${f(m.C)} · 100R ${f(m.R)}</title></circle>`;
 svg+='</svg>';$('#scatter').innerHTML=svg;
 $$('[data-point]').forEach(p=>{p.onclick=()=>inspect(p.dataset.point);p.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(p.dataset.point);}};});
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
let shuffleStep=0, agreements=[], shuffleTimer=null;
$('#shuffle-options').innerHTML=options.map(v=>`<div class="option" data-option="${v}"><span class="option-label"></span><span class="option-value">${v}</span><span class="selected-tag">SELECTED</span></div>`).join('');
function stopShuffle(){clearInterval(shuffleTimer);shuffleTimer=null;$('#shuffle-play').textContent=shuffleStep===12?'↻ Replay 12 shuffles':'▶ Run 12 shuffles';}
function showOrder(order){const selected=$('#shuffle-mode').value==='stable'?'4':order[1];options.forEach(v=>{const el=$(`[data-option="${v}"]`),pos=order.indexOf(v);el.style.transform=`translateY(${pos*51}px)`;el.querySelector('.option-label').textContent=String.fromCharCode(65+pos);el.classList.toggle('selected',v===selected);});return selected==='4';}
function renderTrials(){ $('#trial-strip').innerHTML=Array.from({length:12},(_,i)=>`<span class="${i<agreements.length?(agreements[i]?'pass':'fail'):''}" title="${i<agreements.length?(agreements[i]?'Agrees':'Disagrees'):'Pending'}">${i<agreements.length?(agreements[i]?'✓':'×'):i+1}</span>`).join(''); }
function resetShuffle(){stopShuffle();shuffleStep=0;agreements=[];showOrder(options);renderTrials();$('#shuffle-count').textContent='Original order';$('#shuffle-status').textContent='Original selected outcome: 4. Run a shuffle to compare identities.';$('#shuffle-math').textContent='Demo: 4 options → pₑ = 0.25';$('#shuffle-play').textContent='▶ Run 12 shuffles';}
function nextShuffle(){if(shuffleStep>=12){stopShuffle();return;}const agrees=showOrder(demoOrders[shuffleStep]);agreements.push(agrees);shuffleStep++;renderTrials();const a=agreements.filter(Boolean).length/shuffleStep;$('#shuffle-count').textContent=`Shuffle ${shuffleStep} / 12`;$('#shuffle-status').textContent=agrees?'Same outcome selected, even though its position may have changed.':'The selected outcome changed. Matching the position label does not count as agreement.';$('#shuffle-math').textContent=`Illustrative ${shuffleStep<12?'running ':''}A = ${f(a,3)}; pₑ = 0.25; S = ${f(stability(a,.25),3)}. Official S averages 939 items × 12 shuffles.`;if(shuffleStep===12)stopShuffle();}
$('#shuffle-step').onclick=()=>{stopShuffle();if(shuffleStep===12)resetShuffle();nextShuffle();};$('#shuffle-reset').onclick=resetShuffle;$('#shuffle-mode').onchange=resetShuffle;
$('#shuffle-play').onclick=()=>{if(shuffleTimer){stopShuffle();return;}if(shuffleStep===12)resetShuffle();nextShuffle();if(shuffleStep<12){shuffleTimer=setInterval(nextShuffle,1100);$('#shuffle-play').textContent='Ⅱ Pause';}};
let removed=false,nullTimer=null;
function stopNull(){clearInterval(nullTimer);nullTimer=null;$('#null-play').textContent='▶ Play sequence';}
function renderNull(){ $('#removable').classList.toggle('removed',removed);$('#removable').setAttribute('aria-hidden',String(removed));$('#null-state').textContent=removed?'Correct answer removed':'Answer present';$('#null-prob-bar').style.width=removed?'92%':'8%';$('#null-prob-value').textContent=removed?'0.92':'0.08';$('#null-toggle').textContent=removed?'Restore the correct answer ←':'Remove the correct answer →';$('#null-status').textContent=removed?'No even number remains. The illustrative model assigns high null probability (low p(yes)).':'A correct option is available. The illustrative model assigns low null probability (high p(yes)).';}
$('#null-toggle').onclick=()=>{stopNull();removed=!removed;renderNull();};$('#null-play').onclick=()=>{if(nullTimer){stopNull();return;}removed=!removed;renderNull();nullTimer=setInterval(()=>{removed=!removed;renderNull();},2200);$('#null-play').textContent='Ⅱ Pause';};
function renderAUC(){const separation=Number($('#auc-separation').value)/100;const neg=[.1,.25,.4,.55];const pos=[.1,.25,.4,.55].map(v=>Math.max(0,Math.min(1,Math.round((v+(separation-.5)*.9)*1000)/1000)));const auc=pooledAUC(pos,neg);let svg='<svg viewBox="0 0 500 112" role="img" aria-label="Illustrative pooled null-probability distributions"><line x1="110" y1="88" x2="480" y2="88" stroke="#b9c4d8"/><text x="0" y="29" font-size="10" fill="#64728a">Answer present</text><text x="0" y="63" font-size="10" fill="#64728a">Answer removed</text><text x="110" y="106" font-size="9" fill="#64728a">0</text><text x="475" y="106" font-size="9" fill="#64728a">1</text><text x="290" y="106" text-anchor="middle" font-size="9" fill="#64728a">p_null</text>';
 neg.forEach(v=>svg+=`<circle cx="${110+370*v}" cy="25" r="5" fill="#8292b5"><title>Answer present: ${v}</title></circle>`);pos.forEach(v=>svg+=`<circle cx="${110+370*v}" cy="60" r="5" fill="#3558e8"><title>Answer removed: ${v}</title></circle>`);$('#auc-dots').innerHTML=svg+'</svg>';$('#auc-readout').textContent=`AUC = ${f(auc,3)} → N = 2 × ${f(auc,3)} − 1 = ${f(2*auc-1,3)}`;}
$('#auc-separation').oninput=renderAUC;
function renderR(){const s=Number($('#s-slider').value),n=Number($('#n-slider').value);$('#s-value').textContent=f(s);$('#n-value').textContent=f(n);$('#r-value').textContent=f(reliability(s,n));}
$('#s-slider').oninput=renderR;$('#n-slider').oninput=renderR;$$('[data-preset]').forEach(b=>b.onclick=()=>{const[s,n]=b.dataset.preset.split(',');$('#s-slider').value=s;$('#n-slider').value=n;renderR();});
setupTabs('.lab-tabs [role=tab]',()=>{stopShuffle();stopNull();});
$('#score-model').innerHTML=models.map(m=>`<option value="${esc(m.name)}">${esc(m.name)}</option>`).join('');
function renderScoring(){const m=models.find(m=>m.name===$('#score-model').value);$('#domain-bars').innerHTML=data.domains.map(d=>`<button class="domain-row" data-domain="${esc(d)}" aria-label="${esc(d)}: ${f(m.domains[d])}. Inspect task selection."><span>${esc(short[d]||d)}</span><span class="domain-track"><i style="width:${m.domains[d]}%"></i></span><b>${f(m.domains[d])}</b></button>`).join('');const sum=Object.values(m.domains).reduce((a,b)=>a+b,0);$('#competence-total').textContent=f(sum/11);$('#competence-rank').textContent=`Rank #${m.rank} / 21`;$('#score-sum').textContent=`Sum of domain scores: ${f(sum,4)}
÷ 11 = ${f(sum/11,4)}`;$('#domain-description').textContent='Each bar shows the domain score. Every domain has the same 1/11 weight.';$$('[data-domain]').forEach(b=>b.onclick=()=>{const d=b.dataset.domain;$$('[data-domain]').forEach(x=>x.classList.toggle('active',x===b));const tier=data.tiers[d]===null?'All tasks (untiered)':d==='Math'?'Hard + Very Hard (70 + 30, pooled per task)':'Hard tier';$('#domain-description').textContent=`${d}: ${data.counts[d]} natural tasks · ${tier}. Domain score ${f(m.domains[d])}; contribution to C = ${f(m.domains[d]/11,3)} points.`;});}
$('#score-model').onchange=renderScoring;
// Scripted sandbox illustration. State is illustrative; no backend or model calls occur.
let sandboxStep=0,sandboxTimer=null;
const successFrames=[
 ['OBSERVE','PUBLIC OBSERVATION','goal: move report.txt\nsource: /inbox\ndestination: /archive','The goal and environment expose these paths.','Read the goal, current state, and full public history.'],
 ['GROUND OPTIONS','PUBLIC CANDIDATE MENU','move_file(\n  source="/inbox/report.txt",\n  destination="/archive/report.txt"\n)\nfinish()','Argument values come from the task and observed environment.','Build admissible choices from public functions and grounded values.'],
 ['DECIDE','MODEL CHOICE','selected: move_file\nsource: /inbox/report.txt\ndestination: /archive/report.txt','The model chooses an action through its typed decision interface.','Select an action; no reference answer is shown to the model.'],
 ['EXECUTE','DETERMINISTIC EXECUTOR','validate required arguments\nexecute move_file(...)\n→ environment transition','Execution moves the file in the simulated state.','Execute the selected valid call; no auxiliary model fills arguments.'],
 ['FEEDBACK','NEXT PUBLIC STATE','status: success\n/inbox: []\n/archive: [report.txt]','The updated observation returns to the model.','Append feedback to public history; continue the decision loop if needed.'],
 ['CHECK','NATIVE TASK CHECKER','goal state: satisfied\nsource file: absent\ndestination file: present\nillustrative credit: 1.0','Terminal outcome is scored by the task checker.','Check native success conditions, accepting valid alternative tool routes.']
];
const missingFrames=[successFrames[0],['GROUND OPTIONS','GROUNDED VALUES ONLY','source: /inbox/report.txt\nrequired: destination\nselected call omits destination','A required argument is missing from the selected call.','The example exposes an invalid selection; no value is invented.'],['DECIDE','MODEL CHOICE','move_file(\n  source="/inbox/report.txt"\n)\n# destination is missing','An incomplete call was selected.','The model’s selection still consumes the applicable attempt budget.'],['EXECUTE','ARGUMENT CHECK','validate required arguments\n→ missing destination\nDO NOT execute move_file','Validation fails. The environment is unchanged.','The invalid call is not executed and no missing parameter is filled.'],['FEEDBACK','PUBLIC ERROR FEEDBACK','error: missing required argument\nfield: destination\nstate: unchanged','The error returns to the model for its next decision.','Continue the loop; allow the model to correct the choice within budget.'],['CHECK','EPISODE NOT TERMINAL','checker: waiting\nnext: observe → choose again\nno task score yet','One invalid call is feedback, not an invented terminal score.','Score only the eventual terminal episode or native budget outcome.']];
function stopSandbox(){clearInterval(sandboxTimer);sandboxTimer=null;$('#sandbox-play').textContent=sandboxStep===5?'↻ Replay execution':'▶ Play execution loop';}
function renderSandbox(){const bad=$('#sandbox-scenario').value==='missing',frame=(bad?missingFrames:successFrames)[sandboxStep],moved=!bad&&sandboxStep>=3;$$('[data-stage]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.stage)===sandboxStep);b.classList.toggle('done',Number(b.dataset.stage)<sandboxStep);b.setAttribute('aria-current',Number(b.dataset.stage)===sandboxStep?'step':'false');});$('#sandbox-stage-name').textContent=`0${sandboxStep+1} / ${frame[0]}`;$('#sandbox-panel-label').textContent=frame[1];$('#sandbox-code').textContent=frame[2];$('#sandbox-feedback').textContent=frame[3];$('#sandbox-feedback').className='sandbox-feedback'+(bad&&sandboxStep>=2?' error':moved?' success':'');$('#sandbox-stage-description').textContent=frame[4];$('#sandbox-narration').textContent=`Step ${sandboxStep+1}: ${frame[4]}`;$('#sandbox-step-counter').textContent=`${sandboxStep+1} / 6`;$('#file-origin').hidden=moved;$('#file-destination').hidden=!moved;$('#empty-folder').hidden=moved;$('#sandbox-step').textContent=sandboxStep===5?'Restart →':'Next step →';}
function nextSandbox(){if(sandboxStep>=5){stopSandbox();return;}sandboxStep++;renderSandbox();if(sandboxStep===5)stopSandbox();}
$('#sandbox-step').onclick=()=>{stopSandbox();sandboxStep=(sandboxStep+1)%6;renderSandbox();};$('#sandbox-reset').onclick=()=>{stopSandbox();sandboxStep=0;renderSandbox();};$('#sandbox-scenario').onchange=()=>{stopSandbox();sandboxStep=0;renderSandbox();};$$('[data-stage]').forEach(b=>b.onclick=()=>{stopSandbox();sandboxStep=Number(b.dataset.stage);renderSandbox();});$('#sandbox-play').onclick=()=>{if(sandboxTimer){stopSandbox();return;}if(sandboxStep===5)sandboxStep=0;renderSandbox();sandboxTimer=setInterval(nextSandbox,1900);$('#sandbox-play').textContent='Ⅱ Pause';};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopShuffle();stopNull();stopSandbox();}});
renderBoard();resetShuffle();renderNull();renderAUC();renderR();renderScoring();renderSandbox();
})();
