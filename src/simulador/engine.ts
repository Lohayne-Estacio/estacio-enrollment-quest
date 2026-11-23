// @ts-nocheck
/* Lógica do arquivo original Simulador_do_consultor_modo_game_4.html, sem alterações de regra.
 * As constantes de cálculo e as contas do painel "Meu GO" do Cap!GO ficam em ./rules.ts, cobertas por testes. */
import { P_MES, P_CICLO, NUC_BONUS, NUC_BONUS1, TH, VAL, LV, FAIXA, band, nucB, comm, PB, PL, proximaFaixa, prioridades } from "./rules";

export function initSimulador() {

const $=id=>document.getElementById(id);
const MOD=['Presencial','Semipresencial','Ao vivo','EAD'],MODV=[...MOD,'Med. Vet. / Odonto'];
const STAR=['Psicologia','Enfermagem','Direito','Med. Vet. Presencial','Odontologia'];
const POS=['Pós Presencial','Pós 4.0 (Ao vivo)','Pós EAD'];
const ALL=[...MOD,...STAR,...POS,'Med. Vet. Semi'];
/* lista de cursos estrela para acompanhamento: Med. Vet. soma presencial + semi */
const starList=d=>[[d[4][0],d[4][1],d[4][2],4],[d[5][0],d[5][1],d[5][2],5],[d[6][0],d[6][1],d[6][2],6],['Medicina Veterinária',d[7][1],d[7][2]+d[12][2],7],[d[8][0],d[8][1],d[8][2],8]];
const f=n=>(+n).toLocaleString('pt-BR',{maximumFractionDigits:1});
const pc=n=>Math.round(n)+'%';
const v=id=>Math.max(0,+$(id).value||0);
const brl=n=>'R$ '+(+n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,x){try{localStorage.setItem(k,x)}catch(e){}}};

/* ===== Regra de cálculo (inalterada) + regra de pagamento ===== */
/* Regras de cálculo em ./rules.ts (PGE.05.235 e PGE.05.008) */
const nucName=()=>{const e=document.getElementById('nucSel');return e&&e.value?e.value:'Meu núcleo'};
const nucTxt=n=>n>=110?'+10%':n>=100?'+5%':'+5% a +10%';

/* ===== Tabelas de entrada ===== */
const head='<tr><th>Item</th><th>Meta</th><th>Realizado</th><th></th></tr>';
const rows=(names,off)=>names.map((n,i)=>`<tr><td>${n}</td><td><input type='number' min='0' id='m${i+off}' value='0'></td><td><input type='number' min='0' id='r${i+off}' value='0'></td><td style='white-space:nowrap'><button type='button' class='plus' data-i='${i+off}' data-d='-1' aria-label='menos 1'>−1</button> <button type='button' class='plus' data-i='${i+off}' data-d='1' aria-label='mais 1'>+1</button></td></tr>`).join('');
$('tm').innerHTML=head+rows(MOD,0);$('ts').innerHTML=head+rows(STAR,4)+rows(['Med. Vet. Semi'],12);$('m12').disabled=true;$('m12').value=0;$('m12').title='A meta de Med. Vet. fica na linha Med. Vet. Presencial (meta total do curso)';$('tp').innerHTML=head+rows(POS,9);

/* ===== Som (Web Audio, sem arquivos externos) ===== */
let AC=null,muted=ls.get('sim-som')==='0';
const ac=()=>{if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}if(AC.state==='suspended')AC.resume();return AC};
function tone(fq,t0,dur,type,vol){const a=AC,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(fq,t0);g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+.006);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g).connect(a.destination);o.start(t0);o.stop(t0+dur+.03)}
function noise(t0,dur,fq,vol){const a=AC,n=Math.max(1,a.sampleRate*dur|0),buf=a.createBuffer(1,n,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const s=a.createBufferSource(),bp=a.createBiquadFilter(),g=a.createGain();s.buffer=buf;bp.type='bandpass';bp.frequency.value=fq;bp.Q.value=1.4;g.gain.value=vol;s.connect(bp).connect(g).connect(a.destination);s.start(t0)}
function kaching(){if(muted||!ac())return;const t=AC.currentTime+.01;
  noise(t,.04,3200,.9);noise(t+.045,.07,1700,.7);noise(t+.1,.05,2600,.5); /* gaveta: cha-ka */
  [2637,3951,5274,7040].forEach((fq,i)=>tone(fq,t+.15,1.1-i*.22,'sine',.22/(i+1))); /* sino: ching */
  tone(1318.5,t+.15,.35,'triangle',.07);noise(t+.15,.35,7000,.12)}
function coinSfx(t){[1975,2637].forEach((fq,i)=>tone(fq,t+i*.06,.25,'square',.035))}
function levelSfx(){if(muted||!ac())return;const t=AC.currentTime+.02;[523.25,659.25,783.99,1046.5,1318.5].forEach((fq,i)=>tone(fq,t+i*.085,.22,'square',.06));[1046.5,1318.5,1568].forEach(fq=>tone(fq,t+.45,.9,'triangle',.07));for(let i=0;i<10;i++)coinSfx(t+.6+i*.13+Math.random()*.05)}
function blip(){if(muted||!ac())return;const t=AC.currentTime+.01;tone(880,t,.1,'square',.05);tone(1320,t+.08,.18,'square',.05)}
const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
function setSnd(){$('snd').textContent=muted?'🔇':'🔊'}
$('snd').addEventListener('click',()=>{muted=!muted;ls.set('sim-som',muted?'0':'1');setSnd();if(!muted)kaching()});setSnd();

/* ===== Efeitos visuais ===== */
const lowFx=matchMedia('(prefers-reduced-motion: reduce)').matches;
function rain(n){n=lowFx?Math.min(n,14):n;const L=document.createElement('div');L.className='rain';const S=['💵','💰','💸','🪙','💵','$','💵','$'];
  for(let i=0;i<n;i++){const s=document.createElement('span'),c=S[Math.random()*S.length|0];s.textContent=c;if(c==='$')s.className='usd';
    s.style.left=(Math.random()*100)+'vw';s.style.fontSize=(c==='$'?26:20)+Math.random()*24+'px';s.style.animationDuration=(2.2+Math.random()*2.2)+'s';s.style.animationDelay=(Math.random()*1.4)+'s';
    s.style.setProperty('--dx',(Math.random()*120-60)+'px');s.style.setProperty('--r',(Math.random()*720-360)+'deg');L.appendChild(s)}
  document.body.appendChild(L);setTimeout(()=>L.remove(),6000)}
function levelUp(e,t,s){const fl=document.createElement('div');fl.className='flash';document.body.appendChild(fl);setTimeout(()=>fl.remove(),1000);
  const d=document.createElement('div');d.className='lvup';d.innerHTML=`<div class='k'>LEVEL UP!</div>${getFoto()?`<div class='lvph' style='background-image:url(${getFoto()})'><span>${e}</span></div>`:`<div class='e'>${e}</div>`}<div class='t'>${t}</div><div class='s'>${s}</div>`;document.body.appendChild(d);setTimeout(()=>d.remove(),2900)}
function floatTxt(txt,r,cls){if(!r)return;const e=document.createElement('div');e.className='flt '+(cls||'');e.textContent=txt;e.style.left=Math.min(Math.max(r.left+r.width/2,60),innerWidth-60)+'px';e.style.top=Math.max(r.top-10,70)+'px';document.body.appendChild(e);setTimeout(()=>e.remove(),1400)}
let tq=[],tOn=false;
function toast(t){tq.push(t);if(!tOn)nextToast()}
function nextToast(){const t=tq.shift();if(!t){tOn=false;return}tOn=true;const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>{e.remove();nextToast()},2600)}
function countTo(el,to){const from=el._v==null?to:el._v;el._v=to;cancelAnimationFrame(el._raf);const t0=performance.now(),D=700;
  const step=now=>{const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,3);el.textContent=brl(from+(to-from)*e);if(k<1)el._raf=requestAnimationFrame(step)};el._raf=requestAnimationFrame(step);
  if(to>from+.004){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}}

/* ===== Sequência diária e missão do dia ===== */
const today=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
const yday=(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
let day={};try{day=JSON.parse(ls.get('sim-dia')||'{}')}catch(e){}

/* ===== Componentes ===== */
function ring(pct,lbl){const r=50,C=2*Math.PI*r,p1=Math.min(pct,100),ov=Math.min(Math.max(pct-100,0),100);
  return `<div class='ringw'><svg class='ring' viewBox='0 0 120 120'><circle cx='60' cy='60' r='${r}' class='rbg'/>${p1>0?`<circle cx='60' cy='60' r='${r}' class='rfg' stroke-dasharray='${C}' stroke-dashoffset='${C*(1-p1/100)}'/>`:''}${ov>0?`<circle cx='60' cy='60' r='${r-11}' class='rov' stroke-dasharray='${2*Math.PI*(r-11)}' stroke-dashoffset='${2*Math.PI*(r-11)*(1-ov/100)}'/>`:''}</svg><div class='rc'><b class='gt num'>${lbl==null?pc(pct):lbl}</b><small>DA META</small></div></div>`}
const mini=(m,r)=>{const fa=m-r,ok=m>0&&fa<=0;return `<div class='mini'><div><small>META</small><b>${f(m)}</b></div><div><small>REALIZADO</small><b>${f(r)}</b></div><div class='${ok?'ok':''}'><small>${ok?'SUPEROU':'FALTAM'}</small><b>${ok?'+':''}${f(Math.abs(fa))}</b></div></div>`};
function card(n,m,r,du,dec){
  const rem=Math.max(du-dec,0),falta=m-r,pct=m?r/m*100:0,need=rem>0?Math.max(falta,0)/rem:Math.max(falta,0),cur=dec>0?r/dec:0,proj=cur*du,pp=m?proj/m*100:0,ok=m>0&&falta<=0;
  return `<div class="card"><div class="top"><b>${n.toUpperCase()}</b><div class="p num">${m?pc(pct):'–'}</div><small>da meta</small></div>
  <div class="mid"><div class="big num">${f(r)}</div><p>MF realizadas de ${f(m)}</p><div class="bar"><i style="width:${Math.min(pct,100)}%"></i></div></div>
  <div class="tag ${ok?'ok':''}"><span>${ok?'Superou':'Faltam'}</span><span class="num">${ok?'+':''}${f(Math.abs(falta))} MF</span></div>
  <div class="pace"><div class="row">Pace/dia necessário <b>${f(need)} MF</b></div><div class="row">Pace/dia atual <b>${f(cur)} MF</b></div><div class="row">Projeção do mês <b>${f(proj)} MF (${m?pc(pp):'–'})</b></div></div></div>`}

/* ===== Estado do jogo ===== */
let S={money:0},prevB=null,prevPi=null,prevNuc=null,prevU=null,prevM=null;

function calc(){
  const du=Math.max(v('du'),1),dec=Math.min(v('dec'),du),d=ALL.map((n,i)=>[n,v('m'+i),v('r'+i)]);
  const G=[...d.slice(0,4),['Med. Vet. / Odonto',d[7][1]+d[8][1],d[7][2]+d[8][2]]],tm=G.reduce((a,x)=>a+x[1],0),tr=G.reduce((a,x)=>a+x[2],0);
  $('ctot').innerHTML=card('Total do consultor',tm,tr,du,dec);
  $('cmod').innerHTML=G.map(x=>card(x[0],x[1],x[2],du,dec)).join('');
  $('cstar').innerHTML=starList(d).map(x=>card(x[0],x[1],x[2],du,dec)).join('');
  $('cpos').innerHTML=d.slice(9,12).map(x=>card(x[0],x[1],x[2],du,dec)).join('');
  const nome=$('nome').value.trim(),pct=tm?tr/tm*100:0;
  $('hello').textContent=(nome?'Bora, '+nome.split(' ')[0]+'! ':'Bora! ')+'Hoje é dia de bater meta. 🦫';
  const ini=nome?nome.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase():'';
  paintAv(ini);$('hbName').textContent=nome||'Jogador';$('hbName').classList.toggle('empty',!nome);
  $('hmsg').textContent=!tm?'Configure sua meta em “Meus números” e o jogo começa.':pct>=200?'Nível lendário! Sem teto: cada matrícula continua somando.':pct>=100?'Meta batida! Agora é farmar excedente e subir de nível.':pct>=70?'Reta final: cada +1 aproxima você do próximo nível.':pct>=40?'Você está no jogo. Complete as missões e acelere.':'Cada matrícula soma na sua RV estimada. Planeje a agenda e comece a faturar!';
  $('nucLbl').textContent=$('nucSel').value||'escolha no topo';document.querySelector('.nucpick').classList.toggle('need',!$('nucSel').value);$('tabNum').classList.toggle('start',!tm);
  game(d,tm,tr,du,dec);
}

function game(d,tm,tr,du,dec){
  const mt6=[...d.slice(0,4).map(x=>x[1]),d[7][1]+d[8][1]],mf=[...d.slice(0,4).map(x=>x[2]),d[7][2]+d[8][2]];
  const nm=v('nm'),nr=v('nr'),nuc=nm?nr/nm*100:0,p=tm?tr/tm*100:0,c=comm(mf,p,nuc),b=c.b,tot=c.tot;
  const k=dec>0?du/dec:0,pm=mf.map(x=>x*k),pp=tm?pm.reduce((a,x)=>a+x,0)/tm*100:0,cp=comm(pm,pp,nuc);
  const rem=Math.max(du-dec,0),falta=Math.max(tm-tr,0);
  /* pós */
  const ps=d.slice(9,12),pM=ps.reduce((s,x)=>s+x[1],0),pR=ps.reduce((s,x)=>s+x[2],0),pp2=pM?pR/pM*100:0,pi=PB.reduce((kk,x,i)=>pp2>=x[0]?i:kk,0),sal=v('sal'),mult=PB[pi][1],rvvV=mult*sal,fm=x=>x.toLocaleString('pt-BR',{minimumFractionDigits:2});
  S={money:tot+rvvV,tot,b,p};

  /* Nível */
  let nx='Nível máximo atingido. Sem teto: continue somando!',prog=100;
  if(!tm){nx='Configure sua meta para começar o jogo.';prog=0}
  else if(b<6){const t=TH[b+1],need=Math.max(Math.ceil(t/100*tm-tr),1),up=comm(mixAdd(mf,mt6,need),(tr+need)/tm*100,nuc);prog=Math.min(100,Math.max(0,(p-TH[b])/(t-TH[b])*100));
    nx=`Faltam <b>${need} MF</b> para ${LV[b+1][0]} <b>${LV[b+1][1]}</b> (${t}%). A estimativa sobe de ${brl(tot)} para ${brl(up.tot)}*.`}
  $('lvl').innerHTML=!tm?`<div class='lvlrow'><div class='emb'>🎮</div><div><small>NÍVEL 1/7 · 7 NÍVEIS PARA DESTRAVAR</small><div class='ln gt'>Pronto para jogar?</div></div></div><p style='margin:10px 0 12px'>Defina sua meta do mês e cada matrícula vira dinheiro na tela.</p><button type='button' class='lvcta' id='lvCta'>🎯 Definir minha meta</button>`:`<div class='lvlrow'><div class='emb'>${LV[b][0]}</div><div><small>NÍVEL ${b+1}/7</small><div class='ln gt'>${LV[b][1]}</div></div><div class='lp gt num'>${tm?pc(p):'–'}</div></div><div class='xp'><i style='width:${prog}%'></i></div><p>${nx}</p>`;
  $('hbEmb').textContent=LV[b][0];$('hbLv').textContent=`LV ${b+1} · ${LV[b][1].toUpperCase()} · ${tm?pc(p):'–'}`;$('hbXp').style.width=prog+'%';countTo($('hbCoin'),tot+rvvV);

  /* Missão do dia */
  if(day.date!==today){day={date:today,n:0};ls.set('sim-dia',JSON.stringify(day))}
  const hoje=day.n||0,alvo=falta>0?Math.max(1,Math.ceil(falta/Math.max(rem,1))):Math.max(1,Math.ceil(tm/du)),dayDone=tm>0&&hoje>=alvo;

  /* Painéis */
  const QG=[[0,'Presencial'],[4,'Psico'],[5,'Enferm.'],[6,'Direito'],[1,'Semi'],[2,'Ao vivo'],[3,'EAD'],[7,'Med. Vet. Pres.'],[12,'Med. Vet. Semi'],[8,'Odonto']],QP=[[9,'Presencial'],[10,'4.0'],[11,'EAD']];
  const qb=(arr)=>arr.map(([i,l])=>i===0?`<button type='button' class='qk star' data-id='r0'>⭐ <span>+1</span> Presencial <small>${brl(VAL[b][0])}*/MF</small></button>`:i>=4&&i<=6?`<button type='button' class='qk stc' data-id='r${i}' title='Soma também no Presencial'>⭐ <span>+1</span> ${l}</button>`:`<button type='button' class='qk' data-id='r${i}'><span>+1</span> ${l}</button>`).join('');
  $('pGrad').className='pnl'+(p>=100?' win':'');
  $('pGrad').innerHTML=`<div class='ph'><span class='pt'>🎓 GRADUAÇÃO</span><span class='chip'>${LV[b][0]} LV ${b+1} · ${FAIXA[b]}</span></div>
   <div class='pbody'>${ring(p,tm?null:'–')}${mini(tm,tr)}</div>
   <div class='pmoney'><div><small>💰 ANTECIPAÇÃO 60%*</small><b class='gt num'>${brl(c.mes)}</b></div><div><small>🏦 SALDO 40%*</small><b class='gt num'>${brl(c.ciclo)}</b></div></div>
   <details class='ped' data-ed='grad' ${EDOPEN.grad?'open':''}><summary>✏️ Editar metas de graduação</summary><div class='pedg'>
     <label>⭐ Presencial<input type='number' min='0' inputmode='numeric' data-to='m0' value='${v('m0')}'></label>
     <label>Semipresencial<input type='number' min='0' inputmode='numeric' data-to='m1' value='${v('m1')}'></label>
     <label>Ao vivo<input type='number' min='0' inputmode='numeric' data-to='m2' value='${v('m2')}'></label>
     <label>EAD<input type='number' min='0' inputmode='numeric' data-to='m3' value='${v('m3')}'></label>
     <label>Med. Vet. (meta total)<input type='number' min='0' inputmode='numeric' data-to='m7' value='${v('m7')}'></label>
     <label>Odonto<input type='number' min='0' inputmode='numeric' data-to='m8' value='${v('m8')}'></label></div>
     <p class='hint' style='margin:6px 0 0'>Use os números do Power BI. Cursos estrela de Psicologia, Enfermagem e Direito ficam em “Meus números”.</p></details>
   <div class='quick'><small>REGISTRAR MATRÍCULA</small><div class='qb'>${qb(QG)}</div></div>`;
  let pnx=pM?(pi<4?(()=>{const t=PB[pi+1][0],need=Math.max(Math.ceil(t/100*pM-pR),1);return `Faltam <b>${need} MF</b> para a faixa de ${t}% (múltiplo ${fm(PB[pi+1][1])}).`})():'Faixa máxima de pós. Show!'):'Preencha a meta de pós em “Meus números”.';
  $('pPos').className='pnl'+(pM&&pp2>=100?' win':'');
  $('pPos').innerHTML=`<div class='ph'><span class='pt'>📚 PÓS-GRADUAÇÃO</span><span class='chip'>MÚLTIPLO ${fm(mult)}</span></div>
   <div class='pbody'>${ring(pp2,pM?null:'–')}${mini(pM,pR)}</div>
   <div class='pmoney'><div><small>🎓 RVV ESTIMADA*</small><b class='gt num'>${sal?brl(rvvV):fm(mult)+'× sal.'}</b></div><div><small>📶 FAIXA</small><b class='num' style='font-size:13px'>${PL[pi]}</b></div></div>
   <p class='pnote'>${pnx}</p>
   <details class='ped' data-ed='pos' ${EDOPEN.pos?'open':''}><summary>✏️ Editar metas de pós e salário</summary><div class='pedg'>
     <label>Pós Presencial<input type='number' min='0' inputmode='numeric' data-to='m9' value='${v('m9')}'></label>
     <label>Pós 4.0<input type='number' min='0' inputmode='numeric' data-to='m10' value='${v('m10')}'></label>
     <label>Pós EAD<input type='number' min='0' inputmode='numeric' data-to='m11' value='${v('m11')}'></label>
     <label>Salário base (R$)<input type='number' min='0' inputmode='decimal' data-to='sal' value='${v('sal')||''}' placeholder='opcional'></label></div>
     <p class='hint' style='margin:6px 0 0'>O salário fica só nesta tela e não entra no resumo.</p></details>
   <div class='quick'><small>REGISTRAR MATRÍCULA DE PÓS</small><div class='qb'>${qb(QP)}</div></div>`;
  const nOk=nm>0&&nuc>=100,eleg=p>=100;
  $('pNuc').className='pnl'+(nOk?' win':'');
  $('pNuc').innerHTML=`<div class='ph'><span class='pt'>🏢 ${nucName().toUpperCase()}</span><span class='chip'>${nOk?'✅ NA META':'🎯 EM JOGO'}</span></div>
   <div class='pbody'>${ring(nuc,nm?null:'–')}${mini(nm,nr)}</div>
   <div class='status ${nOk&&eleg?'on':''}'><big>${nOk&&eleg?'💥':'🔒'}</big><div>${nOk&&eleg?`BÔNUS ${nucTxt(nuc)} LIBERADO<br><span style='font-weight:700'>${brl(c.bonus)}* no total apurado${nuc<110?` · faltam ${Math.max(Math.ceil(nm*1.1-nr),1)} MF no núcleo para +10%`:''}</span>`:nOk?'Núcleo na meta! Bata 100% individual para liberar seu bônus (+5% a +10%).':nm?`Faltam <b>${Math.max(Math.ceil(nm-nr),1)} MF</b> no núcleo para 100% (+5% na sua comissão). Em 110%, o bônus sobe para +10%.`:'Informe a meta do núcleo.'}</div></div>
   <p class='pnote'>${nm&&nr?`Sua graduação: <b>${f(tr)} MF</b>. Time forte paga bônus para todos.`:'O bônus entra no total apurado e segue o pagamento 60/40.'}</p>
   <details class='ped' data-ed='nuc' ${EDOPEN.nuc?'open':''}><summary>✏️ Editar meta e realizado do núcleo</summary><div class='pedg'>
     <label>Meta do núcleo<input type='number' min='0' inputmode='numeric' data-to='nm' value='${v('nm')}'></label>
     <label>Realizado do núcleo<input type='number' min='0' inputmode='numeric' data-to='nr' value='${v('nr')}'></label></div>
     <p class='hint' style='margin:6px 0 0'>Use o número divulgado pelo seu gestor.</p></details>
   <div class='quick'><small>ATUALIZAR REALIZADO DO NÚCLEO</small><div class='qb'><button type='button' class='qk' data-id='nr'><span>+1</span> MF do núcleo</button></div></div>`;
  $('nucp').textContent=nm?pc(nuc):'–';

  /* Card de pagamento */
  const T=tot||1,w60=60,wn=0,w40=40;
  const nucRow=p>=100&&nuc>=100?`<div class='r'>Bônus núcleo (${nucTxt(nuc)})<b>+ ${brl(c.bonus)}</b></div>`:`<div class='r'>Bônus núcleo (+5% a +10%)<b>🔒 ${p<100?'100% individual':'núcleo em 100%'}</b></div>`;
  $('pay').innerHTML=`<div class='payhead'><p class='eyebrow'>💰 Minha RV estimada (graduação)*</p><div class='paytot gt num'>${brl(tot)}</div><small>com o realizado até hoje · <span class='chip'>${LV[b][0]} faixa ${FAIXA[b]}</span></small>
  <div class='split' role='img' aria-label='Divisão do pagamento'><i class='s60' style='width:${w60}%'></i>${wn?`<i class='snuc' style='width:${wn}%'></i>`:''}<i class='s40' style='width:${w40}%'></i></div></div>
  <div class='legs'><div class='leg now'><div class='lh'><span class='dot' style='background:var(--cyan)'></span>ANTECIPAÇÃO 60%</div><strong>${brl(c.mes)}</strong><div class='r'>Comissão base<b>${brl(c.base)}</b></div>${nucRow}<div class='r'>Total apurado × 60%<b>${brl(c.mes)}</b></div></div>
   <div class='leg'><div class='lh'><span class='dot' style='background:var(--indigo)'></span>SALDO 40% · FIM DA CAPTAÇÃO</div><strong>${brl(c.ciclo)}</strong><div class='r'>Total apurado × 40%<b>${brl(c.ciclo)}</b></div><div class='r'>Sujeito à conversão<b>⚠️ estorno se cancelar</b></div></div></div>
  <div class='payfoot'><details><summary>Ver cálculo por modalidade</summary>${MODV.map((n,i)=>`<div class='row'>${n}<b>${mf[i]} × ${brl(VAL[b][i])}</b></div>`).join('')}</details>
  <div class='proj'>🔮 Projeção no ritmo atual: <b>${brl(cp.tot)}*</b><span>antecipação <b>${brl(cp.mes)}</b></span><span>saldo <b>${brl(cp.ciclo)}</b></span></div></div>`;

  /* Conquistas */
  const B=[['🎯','Largada','1ª MF realizada',tr>0],['🔥','Aquecido','50% da meta',p>=50],['🏆','Meta batida','100% da meta',p>=100],['🚀','Turbo','120% da meta',p>=120],['💎','Elite','150% da meta',p>=150],['👑','Lendária','200% da meta',p>=200],
   ['⭐','Cursos estrela','Todas as metas estrela',(()=>{const s=starList(d).filter(x=>x[1]>0);return s.length>0&&s.every(x=>x[2]>=x[1])})()],['🤝','Bônus núcleo','+5% a +10% liberado',p>=100&&nuc>=100],['🎓','Pós na meta','100% de pós',pM>0&&pp2>=100],['💵','R$ 1 mil','Estimativa acima de R$ 1.000',tot+rvvV>=1000],['💰','R$ 2,5 mil','Estimativa acima de R$ 2.500',tot+rvvV>=2500],['🤑','R$ 5 mil','Estimativa acima de R$ 5.000',tot+rvvV>=5000]];
  $('badges').innerHTML=B.map(x=>`<div class='bdg ${x[3]?'on':''}'><span>${x[3]?x[0]:'🔒'}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('');
  $('bcnt').textContent=B.filter(x=>x[3]).length+'/'+B.length;

  /* Missões */
  const M=[];/* [id,ícone,título,descrição,progresso|null,recompensa|null,concluída,principal] */
  if(!tm)M.push(['setup','🕹️','Configure seu jogo','Preencha sua meta por modalidade em “Meus números” para liberar as missões.',0,null,false,true]);
  else{
    const mdd=mf.slice();mdd[0]+=alvo;const gd=comm(mdd,(tr+alvo)/tm*100,nuc).tot-tot;
    M.push(['dia','⚡','Ganho do dia',`Registre <b>${alvo} MF</b> hoje para ficar no ritmo da meta: cerca de <b>+${brl(gd)}*</b> na sua estimativa (se Presencial). Hoje: <b>${hoje}</b>. Planeje dentro da jornada contratada.`,Math.min(100,hoje/alvo*100),'+'+brl(gd)+'*',dayDone,true]);
    if(b<6){const t=TH[b+1],need=Math.max(Math.ceil(t/100*tm-tr),1),m2=mf.slice();m2[0]+=need;const u=comm(m2,t,nuc);
      M.push(['lv'+b,LV[b+1][0],`Suba para ${LV[b+1][1]}`,`Mais <b>${need} MF</b> levam você a ${t}%. Na nova faixa, todas as MF passam a valer mais.`,prog,'+'+brl(u.tot-tot)+'*',false,true])}
    else M.push(['lvmax','👑','Nível máximo','Você é Capivara Lendária. Sem teto: cada MF segue somando.',100,null,true,true]);
    if(b!==2){const need=Math.max(Math.ceil(tm-tr),0),m1=mf.slice();m1[0]+=need;const z=comm(m1,Math.max(100,p),nuc);
      M.push(['100','🏆','Bater 100% da meta',p>=100?'Meta batida! Faixa de 100% e elegibilidade ao bônus de núcleo garantidas na simulação.':`Faltam <b>${need} MF</b>. É o degrau de maior efeito: Presencial vai de ${brl(VAL[b][0])} para ${brl(VAL[3][0])} por MF.`,Math.min(100,p),p>=100?null:'+'+brl(z.tot-tot)+'*',p>=100,false])}
    {const need=Math.max(Math.ceil(2*tm-tr),0),m4=mf.slice();m4[0]+=need;const z4=comm(m4,200,nuc);
      M.push(['200','👑','Lendária: 200%',p>=200?'Lendária desbloqueada! Sem teto daqui pra frente.':`Faltam <b>${need} MF</b> para a faixa máxima (${brl(VAL[6][0])} por MF Presencial).`,Math.min(100,p/2),p>=200?null:'+'+brl(z4.tot-tot)+'*',p>=200,false])}
  }
  if(nm){const b0=comm(mf,100,0).base,need=Math.max(Math.ceil(nm-nr),0);
    M.push(['nuc','🤝','Missão de equipe: núcleo na meta',nuc>=100?(p>=100?`Núcleo em ${pc(nuc)} e você em 100%+: bônus ${nucTxt(nuc)} liberado.${nuc<110?' Em 110%, sobe para +10%.':''}`:'Núcleo na meta! Bata 100% individual para receber o bônus (+5% a +10%).'):`Faltam <b>${need} MF</b> no núcleo. Libera +5% sobre a sua comissão (+10% com núcleo em 110%).`,Math.min(100,nuc),'+'+brl((p>=100?c.base:b0)*nucB(Math.max(nuc,100)))+'*',nuc>=100&&p>=100,false])}
  if(pM){if(pi<4){const t=PB[pi+1][0],need=Math.max(Math.ceil(t/100*pM-pR),1);M.push(['pos'+pi,'📚',`Pós: faixa de ${t}%`,`Faltam <b>${need} MF</b> de pós para o múltiplo ${fm(PB[pi+1][1])} do salário.`,Math.min(100,pp2/t*100),sal?'+'+brl(PB[pi+1][1]*sal-rvvV)+'*':'Múltiplo '+fm(PB[pi+1][1]),false,false])}
    else M.push(['posmax','📚','Pós: faixa máxima','Pós em 120% ou mais: múltiplo máximo da tabela.',100,null,true,false])}
  starList(d).filter(x=>x[1]>0).forEach(([nm2,mm,rr,i])=>{const ok=rr>=mm;M.push(['st'+i,'⭐',`Estrela: ${nm2}`,ok?'Meta do curso estrela batida!':`Faltam <b>${mm-rr}</b> de ${mm} matrículas.`,Math.min(100,rr/mm*100),i===7?`Pres. ${brl(VAL[b][4])} · Semi ${brl(VAL[b][1])}/MF*`:i===8?brl(VAL[b][4])+'/MF*':brl(VAL[b][0])+'/MF*',ok,false])});
  if(tm){const gaps=MODV.map((n,i)=>[n,Math.max(mt6[i]-mf[i],0),VAL[b][i]]).filter(x=>x[1]>0).sort((a,z)=>z[2]-a[2]).slice(0,3);
    if(mt6[0]>0){const fp=Math.max(mt6[0]-mf[0],0),mp=mf.slice();mp[0]+=fp;const zp=comm(mp,(tr+fp)/tm*100,nuc);
      M.push(['pres','🏫','Foco Presencial',fp?`Faltam <b>${fp} MF</b> para bater sua meta de Presencial. Na sua faixa, cada MF Presencial vale <b>${brl(VAL[b][0])}*</b>, ${(VAL[b][0]/VAL[b][3]).toLocaleString('pt-BR',{maximumFractionDigits:1})}x o valor do EAD.`:'Meta de Presencial batida! Cada MF Presencial extra continua valendo mais.',Math.min(100,mf[0]/mt6[0]*100),fp?'+'+brl(zp.tot-tot)+'*':null,fp===0,true])}
    if(gaps.length)M.push(['tip','💡','Dica: onde cada MF vale mais',gaps.map(x=>`${x[0]}: faltam <b>${x[1]}</b> · ${brl(x[2])}*`).join('<br>')+'<br>Priorize sempre o curso mais adequado ao perfil do aluno.',null,null,false,false])}
  M.sort((a,z)=>(a[6]-z[6])||(z[7]-a[7]));
  const doneN=M.filter(x=>x[6]).length,tot2=M.filter(x=>x[4]!=null).length;
  $('mcnt').textContent=doneN+'/'+tot2+' concluídas';
  $('opps').innerHTML=M.map(x=>`<div class='ms ${x[7]&&!x[6]?'main':''} ${x[6]?'done':''}'><div class='mi'>${x[1]}</div><div class='mb'><div class='mt'>${x[2]}</div><p>${x[3]}</p>${x[4]!=null?`<div class='mbar'><i style='width:${x[4]}%'></i></div><div class='mfoot'><span>${Math.floor(x[4])}%</span>${x[5]?`<span class='rw'>🪙 ${x[5]}</span>`:''}</div>`:''}</div></div>`).join('');

  /* Eventos: nível, pós, núcleo, selos, missões */
  const msg=[];let big=false;
  if(prevB!==null&&b>prevB){big=true;levelUp(LV[b][0],LV[b][1],`Faixa ${FAIXA[b]} · nova estimativa ${brl(tot)}*`);rain(90);levelSfx();buzz([80,50,80,50,160])}
  if(prevPi!==null&&pM&&pi>prevPi&&!big){big=true;levelUp('📚','Pós subiu de faixa',`${PL[pi]} · múltiplo ${fm(mult)}`);rain(60);levelSfx();buzz([80,50,120])}
  if(prevNuc!==null&&nOk&&!prevNuc&&!big){big=true;levelUp('🏢','Núcleo na meta!',eleg?'Bônus '+nucTxt(nuc)+' liberado':'Bata 100% individual para liberar o bônus');rain(60);levelSfx();buzz([80,50,120])}
  prevB=b;prevPi=pM?pi:prevPi;prevNuc=nOk;
  const un=B.filter(x=>x[3]).map(x=>x[1]);
  if(prevU){const nw=un.filter(x=>!prevU.includes(x));if(nw.length)msg.push('🏅 Novo selo: '+nw.join(', '))}prevU=un;
  const md=M.filter(x=>x[6]&&x[4]!=null).map(x=>x[0]);
  if(prevM){const nw=M.filter(x=>x[6]&&x[4]!=null&&!prevM.includes(x[0])&&x[0]!=='lvmax');if(nw.length)msg.push('✅ Missão concluída: '+nw.map(x=>x[2]).join(', '))}prevM=md;
  if(msg.length){msg.forEach(toast);if(!big)blip()}

  /* E se */
  const ex=MOD.map((_,i)=>+$('w'+i).value||0),m3=mf.map((x,i)=>x+(ex[i]||0)),ne=ex.reduce((a,x)=>a+x,0);
  ex.forEach((x,i)=>{$('wv'+i).textContent='+'+x});
  const p3=tm?(tr+ne)/tm*100:0,c3=comm(m3,p3,nuc);
  $('wres').innerHTML=ne?`Com <b>+${ne} MF</b> você vai para ${LV[c3.b][0]} <b>${LV[c3.b][1]}</b> (${tm?pc(p3):'–'}) e a estimativa passa de ${brl(tot)}* para <b>${brl(c3.tot)}*</b> (+${brl(c3.tot-tot)}*).<br>Antecipação 60%: <b>${brl(c3.mes)}*</b> · saldo 40%: <b>${brl(c3.ciclo)}*</b>.`:'Mova os controles para ver quanto cada MF extra pode render.';

  /* Tabela */
  const FL=['0 a 49%','50 a 79%','80 a 99%','100 a 119%','120 a 149%','150 a 199%','200% ou mais (sem teto)'];
  $('lad').innerHTML=`<table><tr><th>Faixa</th>${MODV.map(n=>`<th>${n}</th>`).join('')}</tr>`+FL.map((l,i)=>{const on=i===b&&tm;return `<tr${on?` class='here'`:''}><td>${l}${on?' 👈 você':''}</td>${VAL[i].map(x=>`<td>${brl(x)}*</td>`).join('')}</tr>`}).join('')+'</table>';
  const a1=comm(mt6,100,nuc),z2=comm(mt6.map(x=>x*2),200,nuc),n2=mt6.reduce((s,x)=>s+x*2,0);
  $('p200').innerHTML=tm?`<b>Benefícios de chegar aos 200%:</b><br>• Faixa mais alta da tabela de referência: Presencial ${brl(VAL[6][0])}* por MF, contra ${brl(VAL[3][0])}* em 100%.<br>• Sem teto: depois dos 200%, cada MF continua somando.<br>• Sua entrega ajuda o núcleo a bater a meta, que libera +5% (núcleo em 100%) ou +10% (110%) sobre a sua comissão.<br>Com a sua meta atual, 200% seriam <b>${n2} MF</b>: estimativa de <b>${brl(z2.tot)}*</b> (${brl(z2.mes)}* de antecipação + ${brl(z2.ciclo)}* de saldo), contra <b>${brl(a1.tot)}*</b> em 100%.`:'Preencha a sua meta para ver a simulação dos 200%.';

  goPanel({tm,tr,p,b,c,tot,rvvV,mf,mt6,nuc,nm,rem});
  feedback({tm,tr,p,b,c,mf,mt6,pm,pp,cp,du,dec,rem,falta,nuc,nm,nr,pM,pR,pp2,mult});
  /* RVV detalhe */
  let nxt='';if(pM&&pi<4){const t=PB[pi+1][0],need=Math.max(Math.ceil(t/100*pM-pR),1);nxt=`Faltam <b>${need} MF</b> de pós para a faixa de ${t}% (múltiplo ${fm(PB[pi+1][1])}${sal?`, estimativa de ${brl(PB[pi+1][1]*sal)}*`:''}).`}
  $('rvv').innerHTML=`<b>🎓 RVV de pós-graduação*</b> <span class='chipst ok'>PGE.05.008 · Tabela 1</span><p style='margin:6px 0;font-size:14px'>Atingimento de pós (Presencial + 4.0 + EAD): <b>${pM?pc(pp2):'–'}</b> · Múltiplo do salário: <b>${fm(mult)}</b></p><div class='wres'>${sal?`Estimativa: ${fm(mult)} × ${brl(sal)} = <b>${brl(rvvV)}*</b>`:'Informe o salário base em “Meus números” para ver a estimativa em reais.'}</div><p class='hint'>${nxt||(pM?'Faixa mais alta da tabela de referência.':'Preencha a meta de pós para começar.')} Estimativa, sem garantia: vale a política oficial.</p><div class='wrap'><table><tr><th>Faixa de atingimento</th><th>Múltiplo do salário</th></tr>${PL.map((l,i)=>`<tr${i===pi&&pM?` class='here'`:''}><td>${l}</td><td>${fm(PB[i][1])}</td></tr>`).join('')}</table></div>`;
}


/* ===== Cap!GO: as 5 perguntas do consultor ===== */
function goPanel(x){const {tm,tr,p,b,c,tot,rvvV,mf,mt6,nuc,nm,rem}=x,el=$('goGrid');if(!el)return;
  const q=(n,t,val,cls,body)=>`<div class='go ${cls||''}'><div class='gq'><span>${n}</span>${t}</div>${val}${body}</div>`;
  if(!tm){el.innerHTML=q(1,'Quanto eu já conquistei?',`<b class='gv gt num'>${brl(tot+rvvV)}*</b>`,'q1 wide',`<p>Defina sua meta e o Cap!GO responde, a cada acesso: quanto você já conquistou, onde está, o que falta para avançar, quanto pode ganhar a mais e o que priorizar agora.</p><button type='button' class='gocta' id='goCta'>🎯 Definir minha meta</button>`);return}
  const nx=proximaFaixa(mf,mt6,tr,tm,nuc),pr=prioridades(mf,mt6,b),top=pr[0];
  const c1=q(1,'Quanto eu já conquistei?',`<b class='gv gt num'>${brl(tot+rvvV)}*</b>`,'q1',`<p>RV de graduação <b>${brl(tot)}*</b>${rvvV?` + RVV de pós <b>${brl(rvvV)}*</b>`:''}</p><div class='gsplit'><span>💰 Antecipação 60% <b>${brl(c.mes)}*</b></span><span>🏦 Saldo 40% <b>${brl(c.ciclo)}*</b></span></div>`);
  const c2=q(2,'Onde estou na minha jornada?',`<b class='gv gt num'>${pc(p)}</b>`,'',`<p><b>${f(tr)}</b> de <b>${f(tm)}</b> MF · faixa <b>${FAIXA[b]}</b></p><div class='gfx' aria-hidden='true'>${FAIXA.map((l,i)=>`<i class='${i<b?'pass':i===b?'here':''}'></i>`).join('')}</div><p class='s'>${LV[b][0]} Nível ${b+1}/7 · ${LV[b][1]}</p>`);
  const c3=nx?q(3,'O que falta para avançar?',`<b class='gv gt num'>${nx.faltam} MF</b>`,'',`<p>para chegar a <b>${nx.alvo}%</b>, faixa ${FAIXA[b+1]}${rem>0?` · cerca de <b>${f(nx.faltam/rem)} MF/dia</b> nos ${rem} dias úteis restantes`:''}</p>`)
    :q(3,'O que falta para avançar?',`<b class='gv gt'>Faixa máxima</b>`,'',`<p>Você está em 200% ou mais. Sem teto: cada MF continua somando.</p>`);
  const c4=nx?q(4,'Quanto posso ganhar a mais?',`<b class='gv gt num'>+${brl(nx.ganho)}*</b>`,'q4',`<p>Ao chegar a ${nx.alvo}%, sua estimativa vai de <b>${brl(nx.atual)}*</b> para <b>${brl(nx.depois)}*</b>.</p>`)
    :q(4,'Quanto posso ganhar a mais?',`<b class='gv gt num'>+${brl(VAL[6][0])}*</b>`,'q4',`<p>por MF de Presencial na faixa mais alta.${p>=100&&nm&&nuc<110?' Com o núcleo em 110% ou mais, o bônus vai a +10%.':''}</p>`);
  const c5=top?q(5,'O que devo priorizar agora?',`<b class='gv gt'>${top.i===0?'⭐ ':''}${top.nome}</b>`,'',`<p><b>${brl(top.valorMF)}*</b> por MF na sua faixa · faltam <b>${top.faltam}</b> · até <b>+${brl(top.potencial)}*</b></p>${pr.length>1?`<p class='s'>Depois: ${pr.slice(1,3).map(o=>`${o.nome} (${brl(o.valorMF)}*/MF)`).join(' · ')}</p>`:''}<p class='s'>⭐ Presencial é o foco do núcleo. Ofereça sempre o curso mais adequado ao perfil do aluno.</p>`)
    :q(5,'O que devo priorizar agora?',`<b class='gv gt'>Meta batida ✔</b>`,'',`<p>Todas as modalidades com meta foram batidas. Agora cada MF soma no excedente.</p>`);
  el.innerHTML=c1+c2+c3+c4+c5}

/* ===== Radar do ganho: feedback em R$ ===== */
function mixAdd(mf,mt,extra){const s0=mf.reduce((a,x)=>a+x,0),w=s0>0?mf:mt,ws=w.reduce((a,x)=>a+x,0);if(!ws){const r=mf.slice();r[0]+=extra;return r}return mf.map((x,i)=>x+extra*w[i]/ws)}
const dk2=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const _now=new Date(),_mon=(()=>{const d=new Date(_now);d.setDate(d.getDate()-((d.getDay()+6)%7));return d})();
const WKEY=dk2(_mon),MKEY=_now.getFullYear()+'-'+String(_now.getMonth()+1).padStart(2,'0'),PMKEY=(()=>{const d=new Date(_now.getFullYear(),_now.getMonth()-1,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')})();
const wdays=Math.min(5,((_now.getDay()+6)%7)+1);
let SUM='';
function feedback(x){
  const {tm,tr,p,b,c,mf,mt6,pm,pp,cp,du,dec,rem,falta,nuc,nm,nr,pM,pR,pp2,mult}=x;
  const pmSum=pm.reduce((a,v)=>a+v,0),nome=$('nome').value.trim(),hj=new Date().toLocaleDateString('pt-BR');
  /* 1. Dinheiro na mesa */
  let mesaHTML,mesaTxt='',nextTxt='';
  if(!tm){mesaHTML=`<div><div class='rh'><span>💸</span>DINHEIRO NA MESA</div><p>Preencha sua meta em “Meus números” para ver quanto o seu ritmo vale em R$.</p></div>`}
  else if(dec===0){const t=TH[Math.min(b+1,6)],need=Math.max(1,Math.ceil(t/100*tm-tr)),u=comm(mixAdd(mf,mt6,need),(tr+need)/tm*100,nuc);
    mesaHTML=`<div><div class='rh'><span>💸</span>DINHEIRO NA MESA</div><p>O mês ainda não começou no calendário. Para chegar a <b>${t}%</b>, são <b>${need} MF</b>: estimativa de <b>${brl(u.tot)}*</b>.</p></div>`}
  else{const bp=band(pp);
    if(bp<6){const t=TH[bp+1],needE=Math.max(0,t/100*tm-pmSum),need=Math.max(1,Math.ceil(needE)),u=comm(mixAdd(pm,mt6,need),(pmSum+need)/tm*100,nuc),mesa=u.tot-cp.tot,pd=rem>0?need/rem:need,pmP=pm.slice();pmP[0]+=need;const uP=comm(pmP,(pmSum+need)/tm*100,nuc);
      mesaHTML=`<div><div class='rh'><span>💸</span>DINHEIRO NA MESA</div><p>No ritmo atual você fecha o mês em <b>${pc(pp)}</b>, com RV estimada de <b>${brl(cp.tot)}*</b>. Com mais <b>${need} MF</b> além do seu ritmo${rem>0?` (≈ +${f(pd)} MF/dia nos ${rem} dias úteis restantes)`:''}, você chega a <b>${t}%</b> e a estimativa vai para <b>${brl(u.tot)}*</b>.</p></div>
       <div class='pot'><small>FICANDO NA MESA</small><b class='gt num'>${brl(mesa)}*</b><span>se mantiver o ritmo atual</span></div>
       <div class='steps'><div><small>RITMO ATUAL</small><b class='num'>${f(dec>0?tr/dec:0)} MF/dia</b></div><div><small>RITMO PARA ${t}%</small><b class='num'>${f(rem>0?Math.max(0,(t/100*tm-tr))/rem:0)} MF/dia</b></div><div><small>FECHAMENTO PROJETADO</small><b class='num'>${brl(cp.tot)}*</b></div><div><small>COM ${t}% NO SEU MIX</small><b class='num'>${brl(u.tot)}*</b></div><div class='pres'><small>⭐ COM ${t}% VINDO DE PRESENCIAL</small><b class='num'>${brl(uP.tot)}*</b><em>+${brl(uP.tot-u.tot)}* a mais</em></div></div>`;
      mesaTxt=`💸 Dinheiro na mesa: ${brl(mesa)}* (no ritmo fecho em ${pc(pp)}; com +${need} MF chego a ${t}% — se vierem de Presencial, ${brl(uP.tot)}*)`}
    else{const w=mf.reduce((a,v)=>a+v,0)>0?mf:mt6,ws=w.reduce((a,v)=>a+v,0)||1,avg=VAL[6].reduce((a,v,i)=>a+v*w[i]/ws,0)*(1+nucB(nuc));
      mesaHTML=`<div><div class='rh'><span>👑</span>RITMO DE FAIXA MÁXIMA</div><p>No ritmo atual você fecha em <b>${pc(pp)}</b>, com RV estimada de <b>${brl(cp.tot)}*</b>. Sem teto: cada MF extra no seu mix soma cerca de <b>${brl(avg)}*</b>.</p></div><div class='pot'><small>CADA MF EXTRA</small><b class='gt num'>+${brl(avg)}*</b><span>no seu mix atual</span></div>`;
      mesaTxt=`👑 Ritmo de faixa máxima: fecho em ${pc(pp)} (${brl(cp.tot)}*)`}}
  $('fbMesa').innerHTML=mesaHTML;
  if(tm&&b<6){const t=TH[b+1],need=Math.max(1,Math.ceil(t/100*tm-tr)),u=comm(mixAdd(mf,mt6,need),(tr+need)/tm*100,nuc);nextTxt=`🎯 Próxima faixa: faltam ${need} MF para ${t}% (+${brl(u.tot-c.tot)}*)`}
  /* 2. Mix */
  const exp=du?dec/du:0,items=MODV.map((n,i)=>({n,i,m:mt6[i],r:mf[i],fa:Math.max(mt6[i]-mf[i],0),v:VAL[b][i]})).filter(o=>o.m>0);
  items.forEach(o=>{o.atg=o.r/o.m;o.gap=o.atg-exp;o.val=o.fa*o.v});
  const top=items.filter(o=>o.fa>0||o.i===0).sort((a,z)=>(z.i===0)-(a.i===0)||z.val-a.val).slice(0,3),worst=items.slice().sort((a,z)=>a.gap-z.gap)[0];
  let mixTxt='';
  if(!items.length)$('fbMix').innerHTML=`<div class='rh'><span>🧭</span>FEEDBACK DE MIX</div><p class='s'>Preencha a meta por modalidade para ver onde está o maior ganho.</p>`;
  else{const PR=items.find(o=>o.i===0),ref=PR||worst,st=ref&&ref.gap<-.05?`<span class='chipst warn'>${PR?'⭐ ':''}${ref.n}: ${Math.round(Math.abs(ref.gap)*100)} p.p. abaixo do esperado</span>`:`<span class='chipst ok'>${PR?'⭐ Presencial no ritmo do mês':'Mix no ritmo do mês'}</span>`;
    $('fbMix').innerHTML=`<div class='rh'><span>🧭</span>FEEDBACK DE MIX</div>${st}<div class='mixr'>${(top.length?top:items).map(o=>`<div class='mixi${o.i===0?' fp':''}'><div class='t'><b>${o.i===0?'⭐ ':''}${o.n}${o.i===0?` <span class='foco'>FOCO DO NÚCLEO · ${(VAL[b][0]/VAL[b][3]).toLocaleString('pt-BR',{maximumFractionDigits:1})}x o EAD</span>`:''}</b><em>${o.fa?'até +'+brl(o.val)+'*':'meta batida ✔'}</em></div><div class='mixbar'><i style='width:${Math.min(100,o.atg*100)}%'></i><u style='left:calc(${Math.min(100,exp*100)}% - 1px)'></u></div><small>${pc(o.atg*100)} da meta (esperado ${pc(exp*100)} até hoje) · faltam ${o.fa} · ${brl(o.v)}*/MF na sua faixa</small></div>`).join('')}</div><p class='s'>A marca escura mostra onde você deveria estar hoje.</p>`;
    {const P=items.find(o=>o.i===0);if(P)mixTxt=`🏫 Presencial (foco): ${f(P.r)}/${f(P.m)} MF (${pc(P.atg*100)}; esperado ${pc(exp*100)}) · ${brl(P.v)}*/MF · faltam ${P.fa}`}}
  /* 3. Ritmo da semana */
  let W={};try{W=JSON.parse(ls.get('sim-sem')||'{}')}catch(e){}
  if(W.week!==WKEY||tr<W.tr0||W.tm!==tm){W={week:WKEY,tr0:tr,fa0:falta,rem0:rem,tm,start:today};ls.set('sim-sem',JSON.stringify(W))}
  const sD=new Date(W.start+'T12:00:00'),sIdx=Math.min(5,((sD.getDay()+6)%7)+1),winT=Math.max(1,5-sIdx+1),winE=Math.max(1,Math.min(winT,wdays-sIdx+1)),nd0=W.rem0>0?W.fa0/W.rem0:W.fa0,wTarget=Math.min(W.fa0,Math.ceil(nd0*Math.min(winT,Math.max(W.rem0,1)))),feito=tr-W.tr0,esp=Math.min(wTarget,Math.ceil(nd0*winE)),pdNow=rem>0?falta/rem:falta;
  let semTxt='';
  if(!tm)$('fbSem').innerHTML=`<div class='rh'><span>📅</span>RITMO DA SEMANA</div><p class='s'>Preencha sua meta para acompanhar a semana.</p>`;
  else if(falta<=0){$('fbSem').innerHTML=`<div class='rh'><span>📅</span>RITMO DA SEMANA</div><span class='chipst ok'>Meta do mês batida</span><p>Nesta semana: <b>+${feito} MF</b>. Agora cada MF soma no excedente e aproxima a próxima faixa.</p>`;semTxt=`📅 Semana: +${feito} MF (meta do mês já batida)`}
  else{const atras=feito<esp,chip=W.start===today&&feito===0?`<span class='chipst neu'>Acompanhamento iniciado hoje</span>`:atras?`<span class='chipst warn'>${esp-feito} MF atrás do ritmo</span>`:`<span class='chipst ok'>No ritmo da semana</span>`;
    $('fbSem').innerHTML=`<div class='rh'><span>📅</span>RITMO DA SEMANA</div>${chip}<div class='bigv gt num ${atras?'neg':'pos'}'>${feito} <span style='font-size:16px;color:var(--mut)'>de ${esp} MF esperadas até hoje</span></div><p>${W.start!==WKEY?`Desde ${sD.toLocaleDateString('pt-BR',{weekday:'long'})}, `:'Nesta semana '}você precisa de <b>${wTarget} MF</b> (≈ ${f(nd0)}/dia). Para manter o ritmo da meta, são <b>${f(pdNow)} MF/dia</b> nos ${rem} dias úteis restantes.</p>`;
    semTxt=`📅 Semana: fiz ${feito} de ${esp} MF esperadas (meta da semana ${wTarget}); preciso de ${f(pdNow)} MF/dia`}
  /* 4. Comparativo com o mês anterior (mesmo dia útil) */
  let H={};try{H=JSON.parse(ls.get('sim-hist')||'{}')}catch(e){}
  if(tm){H[MKEY]=H[MKEY]||{};H[MKEY][dec]={tot:Math.round(c.tot*100)/100,p:Math.round(p)};Object.keys(H).sort().slice(0,-3).forEach(kk=>delete H[kk]);ls.set('sim-hist',JSON.stringify(H))}
  const prev=H[PMKEY],pk=prev?Object.keys(prev).map(Number).filter(d=>d<=dec).sort((a,z)=>z-a)[0]:undefined;
  let mesTxt='';
  if(!tm)$('fbMes').innerHTML=`<div class='rh'><span>📈</span>VS. MÊS ANTERIOR</div><p class='s'>Preencha sua meta para começar o histórico.</p>`;
  else if(pk===undefined)$('fbMes').innerHTML=`<div class='rh'><span>📈</span>VS. MÊS ANTERIOR</div><span class='chipst neu'>Histórico em construção</span><p>O simulador está guardando sua evolução dia a dia. No próximo mês você verá aqui se está acima ou abaixo do mesmo ponto deste mês.</p><p class='s'>Hoje: ${brl(c.tot)}* com ${dec} dias úteis.</p>`;
  else{const d=c.tot-prev[pk].tot,up=d>=0;
    $('fbMes').innerHTML=`<div class='rh'><span>📈</span>VS. MÊS ANTERIOR</div><span class='chipst ${up?'ok':'warn'}'>${up?'Acima':'Abaixo'} do mesmo ponto</span><div class='bigv gt num ${up?'pos':'neg'}'>${up?'+':'−'}${brl(Math.abs(d))}*</div><p>Com ${pk} dias úteis no mês passado você estava em <b>${brl(prev[pk].tot)}*</b> (${prev[pk].p}%). Hoje: <b>${brl(c.tot)}*</b> (${pc(p)}).</p>`;
    mesTxt=`📈 Vs. mês anterior: ${up?'+':'−'}${brl(Math.abs(d))}* no mesmo ponto`}
  /* Semáforo */
  const ref=tm?(dec>0?pp:p):0,sem=!tm?['⚪','Sem meta','n']:ref>=100?['🟢','No ritmo','g']:ref>=90?['🟡','Atenção','y']:['🔴','Em risco','r'];
  {const h=document.querySelector('#radar h2');let e=h.querySelector('.sema');if(!e){e=document.createElement('span');e.className='sema';h.insertBefore(e,h.querySelector('.sumbtn'))}e.className='sema '+sem[2];e.textContent=sem[0]+' '+sem[1]}
  /* Saldo em risco (conversão) */
  const pend=v('pend'),wv=mf.reduce((a,v2)=>a+v2,0)>0?mf:mt6,wsum=wv.reduce((a,v2)=>a+v2,0),avgMF=wsum?VAL[b].reduce((a,v2,i)=>a+v2*wv[i]/wsum,0)*(p>=100?1+nucB(nuc):1):VAL[b][0];
  AVGMF=avgMF;const riskV=pend*avgMF;
  $('fbRisk').innerHTML=`<div class='rh'><span>🛟</span>SALDO EM RISCO · CONVERSÃO</div>${pend?`<span class='chipst warn'>Pode ser estornado se não converter</span>`:`<span class='chipst ok'>Nenhuma matrícula pendente</span>`}
   <div class='pendn'><b class='gt num'>${pend}</b><span>MF aguardando documentação / matrícula acadêmica</span></div>
   <p>${pend?`Até <b>${brl(riskV)}*</b> podem ser estornados no fechamento da captação. Converta e garanta o seu!`:'Registrou matrícula financeira e falta documentação? Marque aqui e acompanhe até converter.'}</p>
   <div class='rbtns'><button type='button' class='rbtn' data-pend='1'>⏳ +1 pendente</button><button type='button' class='rbtn ok' data-pend='-1' ${pend?'':'disabled'}>✅ Converteu!</button></div>`;
  const presTot=mf.reduce((a,v2)=>a+v2,0),presShare=presTot?mf[0]/presTot*100:0;
  /* 5. Resumo 1:1 */
  FB={sem,nome,hj,tm,tr,p,b,c,pp,cp,dec,nextTxt,mesaTxt,semTxt,mesTxt,pM,pR,pp2,mult,nm,nr,nuc,pend,riskV,presShare,mf,mt6,exp:du?dec/du:0};
  SUM=buildSum();
  if(false)SUM=[`📊 *Resumo 1:1 – ${nome||'Consultor(a)'}* · ${hj}`,
    tm?`🎓 Graduação: ${f(tr)}/${f(tm)} MF (${pc(p)}) · faixa ${FAIXA[b]}`:'🎓 Graduação: meta não preenchida',
    `💰 RV estimada*: ${brl(c.tot)} (antecipação 60% ${brl(c.mes)} · saldo 40% ${brl(c.ciclo)})`,
    tm&&dec?`🔮 Projeção no ritmo: ${pc(pp)} · ${brl(cp.tot)}*`:'',
    nextTxt,mesaTxt,mixTxt,semTxt,mesTxt,
    pM?`📚 Pós: ${f(pR)}/${f(pM)} MF (${pc(pp2)}) · múltiplo ${mult.toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'',
    nm?`🏢 Núcleo: ${f(nr)}/${f(nm)} MF (${pc(nuc)}) · bônus núcleo ${nuc>=100&&p>=100?nucTxt(nuc)+' liberado ✅':'🔒'}`:'',
    '','🙋 Preciso de apoio em: ','','*Estimativa não oficial. Vale a política de RV vigente.'].filter((l,i,a)=>l!==''||(a[i-1]&&a[i-1]!=='')).join('\n');
}

/* ===== Resumo 1:1 ===== */
let FB={},AVGMF=0,R11={pbi:'',ap:[],note:''};try{R11=Object.assign(R11,JSON.parse(ls.get('sim-1a1')||'{}'))}catch(e){}
function buildSum(){const x=FB;if(!x.sem)return'';
  const L=[`📊 *1:1 – ${x.nome||'Consultor(a)'}* · ${$('nucSel').value||'núcleo?'} · ${x.hj} · ${x.sem[0]} ${x.sem[1]}`,
   x.tm?`🎓 ${f(x.tr)}/${f(x.tm)} MF (${pc(x.p)})${x.dec?` · projeção ${pc(x.pp)}`:''} · faixa ${FAIXA[x.b]}`:'🎓 Meta de graduação não preenchida',
   `💰 RV estimada*: ${brl(x.c.tot)} (antecipação ${brl(x.c.mes)} · saldo ${brl(x.c.ciclo)})`,
   x.nextTxt,x.mesaTxt,
   x.mt6&&x.mt6[0]?`🏫 Presencial: ${f(x.mf[0])}/${f(x.mt6[0])} (${pc(x.mf[0]/x.mt6[0]*100)}; esperado ${pc(x.exp*100)}) · ${pc(x.presShare)} do meu mix`:'',
   x.pend?`⚠️ Saldo em risco: ${x.pend} MF aguardando documentação · até ${brl(x.riskV)}*`:'🛟 Saldo em risco: nenhuma MF pendente de conversão',
   x.semTxt,x.mesTxt,
   x.pM?`📚 Pós: ${f(x.pR)}/${f(x.pM)} MF (${pc(x.pp2)})`:'',
   x.nm?`🏢 ${nucName()}: ${f(x.nr)}/${f(x.nm)} MF (${pc(x.nuc)}) · bônus ${x.nuc>=100&&x.p>=100?nucTxt(x.nuc)+' ✅':'🔒'}`:'',
   `✅ Bate com o Power BI: ${R11.pbi==='sim'?'sim':R11.pbi==='nao'?'NÃO, preciso conferir':R11.pbi==='nc'?'não conferi':'—'}`,
   `🙋 Apoio: ${R11.ap.length?R11.ap.join(', '):'—'}${R11.note?' ('+R11.note+')':''}`,
   '*Estimativa não oficial. Vale a PGE.05.235.'];
  return L.filter(Boolean).join('\n')}
function paintSum(){document.querySelectorAll('#cPbi button').forEach(b=>b.classList.toggle('on',b.dataset.pbi===R11.pbi));document.querySelectorAll('#cAp button').forEach(b=>b.classList.toggle('on',R11.ap.includes(b.dataset.ap)));$('apNote').value=R11.note;
  SUM=buildSum();$('sumTxt').value=SUM;$('sumWa').href='https://wa.me/?text='+encodeURIComponent(SUM);ls.set('sim-1a1',JSON.stringify(R11))}
document.addEventListener('click',e=>{
  const pb=e.target.closest('[data-pbi]');if(pb){R11.pbi=R11.pbi===pb.dataset.pbi?'':pb.dataset.pbi;blip();paintSum();return}
  const ab=e.target.closest('[data-ap]');if(ab){const k=ab.dataset.ap;if(k==='🙌 Tudo certo')R11.ap=R11.ap.includes(k)?[]:[k];else{R11.ap=R11.ap.filter(a=>a!=='🙌 Tudo certo');R11.ap=R11.ap.includes(k)?R11.ap.filter(a=>a!==k):[...R11.ap,k]}blip();paintSum();return}
  const pd=e.target.closest('[data-pend]');if(pd){ac();const dd=+pd.dataset.pend,ov=v('pend'),nv=Math.max(0,ov+dd);if(nv===ov)return;const r=pd.getBoundingClientRect();$('pend').value=nv;save();calc();
    if(dd<0){kaching();buzz(25);floatTxt('+'+brl(AVGMF)+' garantido!',r);if(nv===0)setTimeout(()=>{toast('🛟 Tudo convertido! Saldo protegido.');rain(30)},300)}else floatTxt('⏳ +1 pendente',r,'down')}
});
$('apNote').addEventListener('input',e=>{e.stopPropagation();R11.note=$('apNote').value.trim();SUM=buildSum();$('sumTxt').value=SUM;$('sumWa').href='https://wa.me/?text='+encodeURIComponent(SUM);ls.set('sim-1a1',JSON.stringify(R11))});
function openSum(){calc();paintSum();$('sumModal').hidden=false;setTimeout(()=>$('sumTxt').focus(),50)}
document.addEventListener('click',e=>{if(e.target.closest('[data-sum]'))openSum()});
$('sumClose').addEventListener('click',()=>{$('sumModal').hidden=true});
$('sumModal').addEventListener('click',e=>{if(e.target.id==='sumModal')$('sumModal').hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('sumModal').hidden=true});
$('sumCopy').addEventListener('click',async()=>{const t=$('sumTxt');let ok=false;try{await navigator.clipboard.writeText(t.value);ok=true}catch(e){try{t.removeAttribute('readonly');t.select();ok=document.execCommand('copy');t.setAttribute('readonly','')}catch(e2){}}$('sumCopy').textContent=ok?'✅ Copiado!':'Selecione e copie';setTimeout(()=>{$('sumCopy').textContent='📋 Copiar'},2000)});

/* ===== Interação: +1, som, valor ganho, combo, desfazer ===== */
$('wsl').innerHTML=MOD.map((n,i)=>`<label><span>${n}</span><input type='range' id='w${i}' min='0' max='20' value='0'><b id='wv${i}' style='min-width:36px;text-align:right'>+0</b></label>`).join('');
const isR=id=>/^r\d+$/.test(id)||id==='nr';
let snapV={},snapMoney=0,lastRect=null,combo=0,lastInc=0,undoId=null,undoT=null;
const STARMAP={r4:'r0',r5:'r0',r6:'r0',r12:'r1'},STARP=Object.keys(STARMAP);
const EDOPEN={grad:false,pos:false,nuc:false};
document.addEventListener('toggle',e=>{const d=e.target;if(d.classList&&d.classList.contains('ped'))EDOPEN[d.dataset.ed]=d.open},true);
document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('.ped'))e.stopImmediatePropagation()},true);
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.to)return;e.stopImmediatePropagation();const el=$(t.dataset.to);const val=t.value===''?0:Math.max(0,+t.value);
  if(String(el.value)!==String(val)){el.value=val;if(t.dataset.to==='nr')snapV.nr=val;calc();save();snapMoney=S.money;blip();floatTxt('✔ Salvo',t.getBoundingClientRect())}},true);
const GRADR=['r0','r1','r2','r3','r7','r8'];
function fx(id,rect,tap){
  const nv=v(id),ov=snapV[id]==null?nv:snapV[id];snapV[id]=nv;const dm=S.money-snapMoney;snapMoney=S.money;
  if(tap&&GRADR.includes(id)&&nv!==ov){if(day.date!==today)day={date:today,n:0};day.n=Math.max(0,(day.n||0)+(nv-ov));ls.set('sim-dia',JSON.stringify(day));calc();snapMoney=S.money}
  if(nv>ov){const now=Date.now();combo=now-lastInc<5000?combo+1:1;lastInc=now;kaching();buzz(25);
    floatTxt(dm>.004?'+'+brl(dm):'+'+(nv-ov)+' MF',rect);
    if(dm>.004)floatTxt('+'+brl(dm),$('hbCoin').getBoundingClientRect());
    if(combo>=2)setTimeout(()=>floatTxt('COMBO x'+combo+' 🔥',{left:rect.left,top:rect.top-34,width:rect.width},'combo'),160)}
  else if(nv<ov)floatTxt('−'+(ov-nv)+' MF',rect,'down');
}
document.addEventListener('click',e=>{
  const q=e.target.closest('.qk,.plus');if(!q)return;ac();
  const id=q.dataset.id||('r'+q.dataset.i),dd=q.classList.contains('qk')?1:+q.dataset.d,el=$(id);
  lastRect=q.getBoundingClientRect();
  if(STARP.includes(id)){const nv=Math.max(0,v(id)+dd);if(nv===v(id))return;el.value=nv;snapV[id]=nv;const tg=STARMAP[id],p0=$(tg);p0.value=Math.max(0,v(tg)+dd);p0.dispatchEvent(new Event('input',{bubbles:true}));
    if(dd>0){floatTxt('⭐ '+ALL[+id.slice(1)]+(STARMAP[id]==='r1'?' + Semipresencial':' + Presencial'),{left:lastRect.left,top:lastRect.top+40,width:lastRect.width},'combo');undoId='star:'+id;$('undo').hidden=false;clearTimeout(undoT);undoT=setTimeout(()=>{$('undo').hidden=true;undoId=null},8000)}return}
  el.value=Math.max(0,v(id)+dd);el.dispatchEvent(new Event('input',{bubbles:true}));
  if(dd>0){undoId=id;$('undo').hidden=false;clearTimeout(undoT);undoT=setTimeout(()=>{$('undo').hidden=true;undoId=null},8000)}
});
$('undo').addEventListener('click',()=>{if(!undoId)return;if(undoId.startsWith('star:')){const sid=undoId.slice(5);undoId=null;$('undo').hidden=true;$(sid).value=Math.max(0,v(sid)-1);snapV[sid]=v(sid);lastRect=$('undo').getBoundingClientRect();const tg=STARMAP[sid],p0=$(tg);p0.value=Math.max(0,v(tg)-1);p0.dispatchEvent(new Event('input',{bubbles:true}));return}const el=$(undoId);lastRect=$('undo').getBoundingClientRect();el.value=Math.max(0,v(undoId)-1);const id=undoId;undoId=null;$('undo').hidden=true;el.dispatchEvent(new Event('input',{bubbles:true}));void id});
document.addEventListener('input',e=>{
  const id=e.target.id||'';if(e.isTrusted&&(id==='du'||id==='dec'))ls.set('sim-cal',MKEY);calc();save();
  if(isR(id)&&!e.isTrusted)fx(id,lastRect||e.target.getBoundingClientRect(),true);
  else if(!isR(id))snapMoney=S.money;
});
document.addEventListener('change',e=>{const id=e.target.id||'';if(isR(id)&&e.isTrusted)fx(id,e.target.getBoundingClientRect())});
document.addEventListener('pointerdown',()=>ac(),{once:true});

/* ===== Salvar ===== */
const KEY='simulador-consultor-meta-v3';
function save(){try{const o={};document.querySelectorAll('input[id]:not([type=range]):not([type=file]):not(#sal):not([id^=ob]):not(#apNote),select[id]').forEach(e=>{o[e.id]=e.value});localStorage.setItem(KEY,JSON.stringify(o))}catch(e){}}
function restore(){try{const raw=localStorage.getItem(KEY);if(!raw)return;const o=JSON.parse(raw);Object.keys(o).forEach(id=>{const e=$(id);if(e&&e.type!=='file'){try{e.value=o[id]}catch(x){}}})}catch(e){}}
/* Avatar */
const AVS=['ini','🦫','🦈','🐯','🦁','🐆','🐺','🦊','🦅','🐬','🐳','🐙','🐻','🐼','🐨','🦉','🐧','🦒','🐘','🐎','🦖','🐲','🐝','🦄','🦋','🐸','🌸','🌻','🌟','⚡','🔥','💎','👑','🚀','🎯'];
function getFoto(){return ls.get('sim-avatar')==='foto'?ls.get('sim-foto'):null}
function paintAv(ini){const avs=ls.get('sim-avatar')||'ini',ft=getFoto(),av=$('av'),hb=$('hbAv');
  if(ft){av.textContent='';av.style.backgroundImage=`url(${ft})`;av.classList.add('photo');av.classList.remove('ini');hb.style.backgroundImage=`url(${ft})`;hb.hidden=false;return}
  av.style.backgroundImage='';av.classList.remove('photo');hb.hidden=true;const useIni=avs==='ini'||avs==='foto';av.textContent=useIni?(ini||'🦫'):avs;av.classList.toggle('ini',useIni&&!!ini)}
$('avPhotoBtn').addEventListener('click',e=>{e.stopPropagation();$('avFile').click()});
$('avPhotoRm').addEventListener('click',e=>{e.stopPropagation();try{localStorage.removeItem('sim-foto')}catch(x){}ls.set('sim-avatar','ini');$('avpick').hidden=true;document.querySelector('.hero').classList.remove('pick');calc()});
$('avFile').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{const img=new Image();img.onload=()=>{const S2=256,c=document.createElement('canvas');c.width=c.height=S2;const x=c.getContext('2d'),m=Math.min(img.width,img.height);
    x.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,S2,S2);let url;try{url=c.toDataURL('image/jpeg',.82)}catch(er){toast('Não foi possível usar essa foto.');return}
    try{localStorage.setItem('sim-foto',url)}catch(er){toast('Foto grande demais para salvar. Tente outra.');return}
    ls.set('sim-avatar','foto');$('avpick').hidden=true;document.querySelector('.hero').classList.remove('pick');calc();blip();toast('📸 Foto de jogador atualizada!')};
    img.onerror=()=>toast('Não foi possível abrir essa imagem.');img.src=rd.result};rd.readAsDataURL(f);e.target.value=''});
function drawAv(){$('avPhotoRm').hidden=!ls.get('sim-foto');const cur=ls.get('sim-avatar')||'ini',nm=$('nome').value.trim(),ini=nm?nm.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase():'Aa';
  $('avgrid').innerHTML=AVS.map(a=>`<button type='button' data-a='${a}' class='${a===cur?'sel':''}${a==='ini'?' ini':''}' aria-label='${a==='ini'?'Iniciais':a}'>${a==='ini'?ini:a}</button>`).join('')}
$('av').addEventListener('click',e=>{e.stopPropagation();const p=$('avpick');p.hidden=!p.hidden;document.querySelector('.hero').classList.toggle('pick',!p.hidden);if(!p.hidden)drawAv()});
$('avgrid').addEventListener('click',e=>{const bt=e.target.closest('button');if(!bt)return;e.stopPropagation();ls.set('sim-avatar',bt.dataset.a);$('avpick').hidden=true;document.querySelector('.hero').classList.remove('pick');calc();blip()});
document.addEventListener('click',e=>{if(!e.target.closest('.avwrap')){$('avpick').hidden=true;document.querySelector('.hero').classList.remove('pick')}});
/* Zerar números: metas e realizados vão a 0; nome e calendário ficam. Confirmação em dois toques. */
let zT=null;
$('zerar').addEventListener('click',()=>{const z=$('zerar');
  if(!z.classList.contains('arm')){z.classList.add('arm');z.innerHTML='⚠️<span class="zl"> Confirmar?</span>';clearTimeout(zT);zT=setTimeout(()=>{z.classList.remove('arm');z.innerHTML='🔄<span class="zl"> Zerar</span>'},3500);return}
  clearTimeout(zT);z.classList.remove('arm');z.innerHTML='🔄<span class="zl"> Zerar</span>';
  document.querySelectorAll('input[id^="m"],input[id^="r"]').forEach(e=>{if(/^[mr]\d+$/.test(e.id))e.value=0});$('nm').value=0;$('nr').value=0;$('pend').value=0;
  MOD.forEach((_,i)=>{$('w'+i).value=0});day={date:today,n:0};ls.set('sim-dia',JSON.stringify(day));
  $('fill').open=true;calc();save();
  document.querySelectorAll('input[id]').forEach(e=>{if(isR(e.id))snapV[e.id]=0});snapMoney=S.money;
  toast('🔄 Números zerados. Novo jogo, '+($('nome').value.trim().split(' ')[0]||'jogador')+'!')});
$('reset').addEventListener('click',()=>{try{localStorage.removeItem(KEY);localStorage.removeItem('sim-dia');localStorage.removeItem('sim-sem');localStorage.removeItem('sim-hist');localStorage.removeItem('sim-onb');localStorage.removeItem('sim-foto');localStorage.removeItem('sim-avatar')}catch(e){}location.reload()});

function applyUrl(){try{const q=new URLSearchParams(location.search);let ch=false;const n=q.get('nucleo');
  if(n&&[...$('nucSel').options].some(o=>o.value===n)){$('nucSel').value=n;ch=true}
  ['nm','nr'].forEach(k=>{const x=q.get(k);if(x!==null&&!isNaN(+x)){$(k).value=Math.max(0,+x);ch=true}});
  if(ch){save();setTimeout(()=>toast('🏢 Números do núcleo '+($('nucSel').value||'')+' carregados pelo link'),700)}}catch(e){}}
restore();
/* Novo mês = novo jogo: zera números, mantém nome, avatar e núcleo */
function bizDays(){const n=new Date(),y=n.getFullYear(),m=n.getMonth(),last=new Date(y,m+1,0).getDate();let t=0,el=0;for(let d=1;d<=last;d++){const w=new Date(y,m,d).getDay();if(w&&w<6){t++;if(d<=n.getDate())el++}}return[t,el]}
(()=>{const last=ls.get('sim-mes');let virou=false;
  if(last&&last!==MKEY){document.querySelectorAll('input[id]').forEach(e=>{if(/^[mr]\d+$/.test(e.id))e.value=0});['nm','nr','pend'].forEach(k=>{$(k).value=0});
    ls.set('sim-dia',JSON.stringify({date:today,n:0}));try{localStorage.removeItem('sim-sem')}catch(e){}virou=true}
  ls.set('sim-mes',MKEY);
  if(ls.get('sim-cal')!==MKEY){const[t,el]=bizDays();$('du').value=t;$('dec').value=el}
  save();
  if(virou)setTimeout(()=>toast('🗓️ Novo mês, novo jogo! Preencha sua meta e bora subir de nível, '+($('nome').value.trim().split(' ')[0]||'jogador')+'!'),800)})();
applyUrl();
/* ===== Primeiros passos + tutorial ===== */
let stPrev=null;
function renderStart(){const nm=$('nome').value.trim(),nu=$('nucSel').value,tmv=[0,1,2,3,7,8].reduce((a,i)=>a+v('m'+i),0),trv=[0,1,2,3,7,8].reduce((a,i)=>a+v('r'+i),0);
  const S4=[['1','Seu nome','Toque no nome do jogador',!!nm,'nome'],['2','Seu núcleo','Escolha no topo',!!nu,'nuc'],['3','Sua meta','Números do Power BI',tmv>0,'meta'],['4','Primeiro +1','Registre uma matrícula',trv>0,'jogar']];
  const done=S4.filter(x=>x[3]).length,first=S4.findIndex(x=>!x[3]);
  $('stCnt').textContent=done+'/4';
  $('stSteps').innerHTML=S4.map((x,i)=>`<button type='button' class='st4 ${x[3]?'done':i===first?'now':''}' data-go='${x[4]}'><span class='n'>${x[3]?'✓':x[0]}</span><span><b>${x[1]}</b><small>${x[3]?'Feito!':x[2]}</small></span></button>`).join('');
  $('startCard').hidden=done===4;
  if(stPrev!==null&&stPrev<4&&done===4){toast('🚀 Primeiros passos concluídos! Agora é jogar.');rain(30)}stPrev=done}
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(!g)return;const k=g.dataset.go;
  if(k==='nome'){scrollTo({top:0,behavior:'smooth'});setTimeout(()=>$('nome').focus(),350)}
  else if(k==='nuc'){scrollTo({top:0,behavior:'smooth'});setTimeout(()=>$('nucSel').focus(),350)}
  else if(k==='meta'){$('fill').open=true;$('numeros').scrollIntoView({behavior:'smooth'});setTimeout(()=>$('m0').focus(),500)}
  else $('paineis').scrollIntoView({behavior:'smooth'})});
const _calc0=calc;calc=function(){_calc0();try{renderStart()}catch(e){}};
let obStep=0;
function obShow(i){obStep=i;document.querySelectorAll('#obModal .obs').forEach(el=>el.hidden=+el.dataset.s!==i);
  $('obDots').innerHTML=[0,1,2,3].map(k=>`<i class='${k<=i?'on':''}'></i>`).join('');
  $('obBack').style.visibility=i?'visible':'hidden';$('obNext').textContent=i===3?'🎮 Começar a jogar':'Próximo →';
  if(i===3)$('obNm').textContent=($('obNome').value.trim()||$('nome').value.trim()||'jogador').split(' ')[0]}
function obOpen(){$('obNome').value=$('nome').value;$('obNuc').value=$('nucSel').value;[0,1,2,3].forEach(i=>{const x=v('m'+i);$('obM'+i).value=x||''});obShow(0);$('obModal').hidden=false}
function obApply(){const set=(id,val)=>{const el=$(id);if(el.value!==String(val)){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}))}};
  set('nome',$('obNome').value.trim());set('nucSel',$('obNuc').value);[0,1,2,3].forEach(i=>{const x=$('obM'+i).value;if(x!=='')set('m'+i,Math.max(0,+x))})}
function obClose(fin){obApply();$('obModal').hidden=true;ls.set('sim-onb','1');calc();save();
  if(fin){$('paineis').scrollIntoView({behavior:'smooth'});setTimeout(()=>{levelUp('🎮','Bora jogar!',($('nome').value.trim().split(' ')[0]||'Jogador')+', cada +1 é dinheiro na tela');rain(40);levelSfx()},500)}}
$('obNext').addEventListener('click',()=>{ac();blip();if(obStep<3)obShow(obStep+1);else obClose(true)});
$('obBack').addEventListener('click',()=>{if(obStep>0)obShow(obStep-1)});
$('obSkip').addEventListener('click',()=>obClose(false));
$('obDemo').addEventListener('click',e=>{ac();kaching();floatTxt('+R$ 80,00',e.target.getBoundingClientRect())});
$('howto').addEventListener('click',()=>{ac();obOpen()});
document.addEventListener('click',e=>{if(e.target.closest('#lvCta,#goCta')){ac();obOpen();obShow(1)}});
['obNome','obNuc','obM0','obM1','obM2','obM3'].forEach(id=>$(id).addEventListener('input',ev=>ev.stopPropagation()));
renderStart();
if(!ls.get('sim-onb'))setTimeout(obOpen,400);
if([0,1,2,3,7,8].some(i=>v('m'+i)>0))$('fill').open=false;
calc();
document.querySelectorAll('input[id]').forEach(e=>{if(isR(e.id))snapV[e.id]=v(e.id)});snapMoney=S.money;

}
