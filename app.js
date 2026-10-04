let clients=[],acx=[],cliOn=false,selClient=null,parts=[],grns=[],mv=[],invOn=false,photo2=null,wf='',pays=[],acctKey='',auditUn=null,db,user,uid=null,owner=false,raw=[],cases=[],roles={},cur=null,photo=null,mo=new Date().toISOString().slice(0,7);
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const S={waiting:'Waiting for repair',repairing:'In repair',repaired:'Ready for pickup',swap_todo:'Swap: to send',swap_sent:'Swap: at factory',swap_done:'Swapped: ready for pickup',delivered:'Delivered',archived:'Archived'};
const LOC={reception:'At reception',to_ws:'In transit → workshop',workshop:'At workshop',to_rec:'In transit → reception',customer:'With customer'};
const lp=c=>`<span class="pill ${['to_ws','to_rec'].includes(c.loc)?'lt':c.loc==='workshop'?'lw':''}">📍 <span>${LOC[c.loc]||''}</span></span>`;
const EV={received:'Received at reception',sent_ws:'Sent to workshop',recv_ws:'Received in workshop',started:'Repair started',repaired:'Repaired',unrepairable:'Declared unrepairable',handed_rec:'Handed to reception',recv_rec:'Received back at reception',returned:'Returned to customer'};
const me=()=>(roles[uid]&&roles[uid].label)||(owner?'owner':String(uid||'').slice(-6)),mk=k=>({k,at:Date.now(),by:me(),role:role()});
const trk=c=>{const t=c.track||[];return `<div class="box hist"><b>📍 <span>Tracking</span></b>${t.length?t.map(e=>`<div>✓ <span>${EV[e.k]||esc(e.k)}</span> · ${esc(new Date(e.at).toLocaleString())} · ${esc(e.by)} (<span>${esc(e.role)}</span>)</div>`).join(''):'<div><span>No tracking events yet (older case).</span></div>'}</div>`};
const wp=c=>c.warranty==='in'?'<span class="pill" style="color:var(--ok);border-color:var(--ok)">Warranty</span>':c.warranty==='out'?'<span class="pill" style="color:var(--wr);border-color:var(--wr)">Out of warranty</span>':'<span class="pill">Warranty ?</span>';
const role=()=>owner?'admin':(roles[uid]&&roles[uid].role)||'guest';
const can={edit:()=>['admin','technician'].includes(role()),arch:()=>['admin','manager'].includes(role()),adm:()=>role()==='admin',swap:()=>['admin','technician','manager'].includes(role()),pay:()=>['admin','manager','cashier','reception'].includes(role()),paytab:()=>['admin','manager','cashier'].includes(role()),cli:()=>['admin','manager','cashier','reception'].includes(role()),money:()=>['admin','manager','cashier','technician','reception'].includes(role()),blocked:()=>['blocked','none'].includes(role()),rec:()=>['admin','reception'].includes(role()),ws:()=>['admin','technician'].includes(role()),inv:()=>['admin','manager','technician'].includes(role())};
const tot=c=>tot(c)+(+c.partsTotal||0);
const money=n=>(Math.round((+n||0)*100)/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+(CFG.currency?' '+CFG.currency:'');
const paidOf=id=>pays.filter(p=>p.caseId===id).reduce((a,p)=>a+p.amount,0),due=c=>c.warranty==='out'?Math.max(0,Math.round((tot(c)-paidOf(c.id))*100)/100):0;
const pst=c=>{const ch=tot(c),p=paidOf(c.id);return !ch?'nocharge':p>=ch?'paid':p>0?'partial':'unpaid'},PL={paid:'Paid',partial:'Partial',unpaid:'On hold',nocharge:'No price'};
const pp=c=>can.money()&&c.warranty==='out'?`<span class="pill ${pst(c)==='nocharge'?'':pst(c)}">${PL[pst(c)]}</span>`:'';
const ck=c=>(c.phone||'').replace(/\D/g,'')||('n:'+(c.customer||'').toLowerCase().trim());
const norm=c=>{c={...c};if(c.status==='open')c.status=c.startedAt?'repairing':'waiting';if(c.status==='closed')c.status='delivered';
 if(['delivered','archived'].includes(c.status)){c.outcome=c.outcome||'success';c.repairedAt=c.repairedAt||c.returnDate||c.openedAt}if(!c.loc)c.loc=({waiting:'reception',repairing:'workshop',delivered:'customer',archived:'customer'})[c.status]||'reception';return c};
const dd=(a,b)=>a&&b?Math.max(0,(new Date(b)-new Date(a))/864e5):null,age=a=>dd(a,today());
const avg=a=>{a=a.filter(x=>x!=null);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null},f1=x=>x==null?'—':Math.round(x*10)/10+' d';
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2800)}
async function init(){
 try{db=wrapDb(await claude.use('db'));user=await claude.use('user')}catch(e){}
 if(!db){$('#off').style.display='block';head();dash();return}
 try{uid=user?await user.id():null;owner=user?await user.isOwner():false}catch(e){}loadPrefs();
 db.collection('roles').onSnapshot(s=>{roles={};s.docs.forEach(d=>roles[d.id]=d.data());head()},()=>{});
 db.collection('cases').onSnapshot(s=>{LOADED.cases=true;raw=s.docs.map(d=>({id:d.id,...d.data()}));cases=raw.map(norm);if(cur){const n=cases.find(x=>x.id===cur.id);if(n)cur=n}list();dash();swp();pay()},e=>toast('Database error: '+e.code));
 db.collection('payments').onSnapshot(s=>{pays=s.docs.map(d=>({id:d.id,...d.data()}));list();dash();pay()},()=>{});
 db.collection('settings').onSnapshot(s=>{const d=s.docs.find(x=>x.id==='app');CFG={...CFG0,...(d?d.data():{})};applyCfg();dash();swp()},()=>{});
 setTimeout(()=>{if(role()!=='guest'&&!can.blocked())audit('opened app')},2500);
 head();
}
function head(){$('#role').textContent=role();$('#new').style.display=can.rec()?'':'none';$('#adm').style.display=can.adm()?'':'none';$('#tP').style.display=can.paytab()?'':'none';$('#tL').style.display=can.cli()?'':'none';subCli();$('#tS').style.display=can.swap()?'':'none';$('#tI').style.display=can.inv()?'':'none';subInv();$('#aud').style.display=can.adm()?'':'none';$('#lock').style.display=can.blocked()?'grid':'none';list();pay();dash()}
function tab(t){[['D','dash'],['C','cases'],['S','swap'],['P','pay'],['I','inv'],['L','cli']].forEach(([k,i])=>{$('#'+i).style.display=k===t?'':'none';$('#t'+k).className=k===t?'on':''})}
$('#tD').onclick=()=>tab('D');$('#tC').onclick=()=>tab('C');$('#wt').onclick=e=>{const b=e.target.closest('button');if(!b)return;wf=b.dataset.w;[...$('#wt').children].forEach(x=>x.className=x===b?'on':'');list()};$('#tS').onclick=()=>tab('S');$('#tP').onclick=()=>tab('P');$('#tI').onclick=()=>tab('I');$('#tL').onclick=()=>tab('L');$('#tk').addEventListener('input',e=>{$('#q').value=e.target.value;tab('C');list()});
function list(){if(db&&!LOADED.cases){$('#list').innerHTML='<div class="mu" style="padding:16px;text-align:center">Loading…</div>';return}
 const q=$('#q').value.toLowerCase().trim(),st=$('#st').value,a=$('#d1').value,b=$('#d2').value;
 const r=cases.filter(c=>(!wf||(c.warranty||'')===wf)&&(!$('#lc').value||c.loc===$('#lc').value)&&(!st||c.status===st)&&(!a||c.openedAt>=a)&&(!b||c.openedAt<=b)&&(!q||[c.caseNo,c.customer,c.email,c.phone,c.imei,c.model,c.problem].join(' ').toLowerCase().includes(q))).sort((x,y)=>(y.openedAt+y.caseNo).localeCompare(x.openedAt+x.caseNo));
 $('#list').innerHTML=r.map(c=>rowTry(()=>`<div class="c" data-id="${esc(c.id)}">${c.photo?`<img class="th" src="${c.photo}">`:'<div class="th">no photo</div>'}<div class="m"><div><b>${esc(c.customer)}</b> · ${esc(c.model)}</div><div class="mu">${esc(c.caseNo)} · <span>IMEI</span> ${esc(c.imei||'—')} · ${esc(c.openedAt)}</div><div class="mu">${esc(c.problem)}</div></div><div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">${wp(c)}${pp(c)}<span class="pill ${c.status}">${S[c.status]}</span>${lp(c)}</div></div>`,c)).join('');
 {const b=$('#wt').children;b[1].textContent='Under warranty ('+cases.filter(c=>c.warranty==='in').length+')';b[2].textContent='Out of warranty ('+cases.filter(c=>c.warranty==='out').length+')'}
 $('#cnt').textContent=db?r.length+' of '+cases.length+' cases':'';
}
['q','st','lc','d1','d2'].forEach(i=>$('#'+i).addEventListener('input',()=>list()));
$('#list').addEventListener('click',e=>{const c=e.target.closest('.c');if(c)detail(c.dataset.id)});
function dash0(){
 const n=s=>cases.filter(c=>c.status===s).length,inM=cases.filter(c=>(c.openedAt||'').startsWith(mo)),done=inM.filter(c=>c.repairedAt),ok=done.filter(c=>c.outcome==='success'),dl=inM.filter(c=>c.returnDate);
 const rt=avg(done.map(c=>dd(c.startedAt,c.repairedAt))),wt=avg(inM.map(c=>dd(c.openedAt,c.startedAt))),tt=avg(dl.map(c=>dd(c.openedAt,c.returnDate))),pd=avg(dl.map(c=>dd(c.repairedAt,c.returnDate)));
 const late=cases.filter(c=>c.status==='waiting'&&age(c.openedAt)>CFG.waitDays),stuck=cases.filter(c=>c.status==='repaired'&&age(c.repairedAt)>CFG.pickupDays);
 const act=cases.filter(c=>!['delivered','archived'].includes(c.status)),miss=cases.filter(c=>['to_ws','to_rec'].includes(c.loc)&&c.track&&c.track.length&&(Date.now()-c.track[c.track.length-1].at)/36e5>CFG.transitHours);const [y,m]=mo.split('-').map(Number),ms=[...Array(6)].map((_,i)=>new Date(Date.UTC(y,m-1-(5-i),1)).toISOString().slice(0,7)),cn=ms.map(k=>cases.filter(c=>(c.openedAt||'').startsWith(k)).length),mx=Math.max(1,...cn);
 const T={};done.forEach(c=>{const k=c.tech||'—';(T[k]=T[k]||[]).push(c)});
 const tot=done.length?Math.round(ok.length/done.length*100)+'%':'—';
 $('#dash').innerHTML=`<div class="kp"><div class="k" data-go="waiting"><b style="color:var(--wr)">${n('waiting')}</b><span>Received, waiting for repair</span></div><div class="k" data-go="repairing"><b style="color:var(--ac)">${n('repairing')}</b><span>Still in repair</span></div><div class="k" data-go="repaired"><b style="color:var(--ok)">${n('repaired')}</b><span>Repaired, not yet received by customer</span></div></div>
<div class="box" style="margin-top:0"><h2>📍 <span>Where are the items?</span></h2><div class="kp" style="margin:0">${['reception','to_ws','workshop','to_rec'].map(k=>`<div class="k" data-loc="${k}"><b>${act.filter(c=>c.loc===k).length}</b><span>${LOC[k]}</span></div>`).join('')}</div>${miss.length?`<div class="mu" style="margin-top:8px"><b class="slow">⚠ <span>Possibly missing (not acknowledged for over ${CFG.transitHours} h):</span></b> ${miss.map(c=>`<a href="#" data-id="${esc(c.id)}">${esc(c.caseNo)}</a>`).join(' · ')}</div>`:`<div class="mu" style="margin-top:8px">✓ <span>No unacknowledged handovers over 24 h</span></div>`}</div>
<div class="top"><h2 style="margin:0">Month</h2><input type="month" id="mo" value="${mo}" style="width:auto"></div>
<div class="kp"><div class="k"><b>${inM.length}</b><span>Phones received</span></div><div class="k"><b>${inM.filter(c=>c.swapAt).length}</b><span>Sent to swap (${inM.length?Math.round(inM.filter(c=>c.swapAt).length/inM.length*100):0}%)</span></div><div class="k"><b>${inM.filter(c=>c.warranty==='in').length} / ${inM.filter(c=>c.warranty==='out').length}</b><span>Under / out of warranty received</span></div>${can.pay()?`<div class="k"><b>${money(pays.filter(p=>(p.date||'').startsWith(mo)).reduce((a,p)=>a+p.amount,0))}</b><span>Cash received this month</span></div>`:''}<div class="k"><b>${tot}</b><span>Repair success rate (${ok.length}/${done.length} finished)</span></div><div class="k"><b>${f1(rt)}</b><span>Avg repair time (start → repaired)</span></div><div class="k"><b>${f1(wt)}</b><span>Avg wait before repair starts</span></div><div class="k"><b>${f1(tt)}</b><span>Avg turnaround (received → returned)</span></div><div class="k"><b>${f1(pd)}</b><span>Avg days waiting for pickup</span></div></div>
<div class="box"><h2>Phones received per month</h2><div class="bars">${ms.map((k,i)=>`<div><span>${cn[i]}</span><i style="height:${cn[i]/mx*80}%"></i>${k.slice(2)}</div>`).join('')}</div></div>
<div class="box"><h2>Needs attention</h2><div class="mu">Waiting over ${CFG.waitDays} days to start: <b class="slow">${late.length}</b>${late.slice(0,5).map(c=>` · <a href="#" data-id="${esc(c.id)}">${esc(c.caseNo)}</a>`).join('')}</div><div class="mu" style="margin-top:4px">Ready over ${CFG.pickupDays} days, not picked up: <b class="slow">${stuck.length}</b>${stuck.slice(0,5).map(c=>` · <a href="#" data-id="${esc(c.id)}">${esc(c.caseNo)}</a>`).join('')}</div></div>
<div class="box"><h2>By technician (finished this month)</h2><div class="sc"><table><tr><th>Technician</th><th>Repairs</th><th>Success</th><th>Avg repair</th></tr>${Object.entries(T).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.length}</td><td>${Math.round(v.filter(c=>c.outcome==='success').length/v.length*100)}%</td><td>${f1(avg(v.map(c=>dd(c.startedAt,c.repairedAt))))}</td></tr>`).join('')||'<tr><td colspan=4 class="mu">No finished repairs</td></tr>'}</table></div></div>
<div class="box"><h2>Time per repair</h2><div class="sc"><table><tr><th>Case</th><th>Device</th><th>Result</th><th>Wait</th><th>Repair</th><th>Total</th></tr>${done.sort((a,b)=>b.repairedAt.localeCompare(a.repairedAt)).slice(0,20).map(c=>{const r=dd(c.startedAt,c.repairedAt);return `<tr><td><a href="#" data-id="${esc(c.id)}">${esc(c.caseNo)}</a></td><td>${esc(c.model)}</td><td>${c.outcome==='success'?'✓ repaired':'✗ unrepairable'}</td><td>${f1(dd(c.openedAt,c.startedAt))}</td><td class="${rt&&r>rt*1.5?'slow':''}">${f1(r)}</td><td>${f1(dd(c.openedAt,c.returnDate||c.repairedAt))}</td></tr>`}).join('')||'<tr><td colspan=6 class="mu">No finished repairs</td></tr>'}</table></div><div class="mu" style="margin-top:6px">Red = over 1.5× the month's average. Older cases without a start date show —.</div></div>`;
}
const DV={reception:{k:['Received, waiting','Still in repair','Repaired, not yet','Phones received','Avg turnaround','Avg days waiting'],b:['Where are the items','Phones received per month','Needs attention'],a:'Ready over',m:1},
 technician:{k:['Received, waiting','Still in repair','Repair success','Avg repair time','Avg wait before'],b:['Where are the items','Needs attention','Time per repair'],a:'Waiting over',m:1},
 guest:{k:['Received, waiting','Still in repair','Repaired, not yet'],b:[],a:'',m:0}};
function dash(){dash0();filterDash()}
function filterDash(){
 const r=role(),box=$('#dash');
 if(r==='cashier'){
  const oc=cases.filter(c=>c.warranty==='out'),hold=oc.filter(c=>tot(c)>0&&due(c)>0),sum=a=>a.reduce((t,p)=>t+p.amount,0),nop=oc.filter(c=>!(tot(c)>0)&&c.status!=='archived').length;
  box.innerHTML=`<div class="top"><h2 style="margin:0">Month</h2><input type="month" id="mo" value="${mo}" style="width:auto"></div><div class="kp"><div class="k"><b>${money(sum(pays.filter(p=>(p.date||'').startsWith(mo))))}</b><span>Cash received this month</span></div><div class="k"><b style="color:var(--ok)">${money(sum(pays))}</b><span>Total cash received from out-of-warranty repairs</span></div><div class="k"><b class="${hold.length?'slow':''}">${money(hold.reduce((t,c)=>t+due(c),0))}</b><span>On hold (owed)</span></div><div class="k"><b>${hold.length}</b><span>Cases with a balance due</span></div><div class="k"><b>${new Set(hold.map(ck)).size}</b><span>Customers owing</span></div><div class="k"><b>${nop}</b><span>Out-of-warranty cases without a price</span></div></div>`;return}
 const v=DV[r];if(!v)return;
 box.querySelectorAll('.k').forEach(k=>{if(k.closest('.box'))return;const t=k.querySelector('span').textContent;if(!v.k.some(x=>t.startsWith(x)))k.remove()});
 box.querySelectorAll('.box').forEach(b=>{const t=b.querySelector('h2').textContent;if(!v.b.some(x=>t.includes(x)))b.remove()});
 box.querySelectorAll('.box .mu').forEach(d=>{const t=d.textContent;if((t.startsWith('Waiting over')||t.startsWith('Ready over'))&&v.a&&!t.startsWith(v.a))d.remove()});
 box.querySelectorAll('.kp').forEach(k=>{if(!k.children.length)k.remove()});
 if(!v.m){const m=box.querySelector('#mo');if(m)m.closest('.top').remove()}
}
$('#dash').addEventListener('input',e=>{if(e.target.id==='mo'&&e.target.value){mo=e.target.value;dash()}});
$('#dash').addEventListener('click',e=>{const k=e.target.closest('[data-go]'),a=e.target.closest('a[data-id]');if(a){e.preventDefault();detail(a.dataset.id)}else if(k){$('#st').value=k.dataset.go;tab('C');list()}else{const l=e.target.closest('[data-loc]');if(l){$('#lc').value=l.dataset.loc;$('#st').value='';tab('C');list()}}});
function open_(h){$('#md').innerHTML=h;$('#ov').classList.add('on')}
function shut(){if(auditUn){auditUn();auditUn=null}$('#ov').classList.remove('on');cur=null;photo=null;photo2=null;selClient=null}
$('#new').onclick=()=>{photo=null;open_(`<div class="top"><h1>New case</h1><span class="sp"></span><button onclick="shut()">Cancel</button></div>
<label>Customer name *</label><input id="f_c" autocomplete="off"><div class="cs" id="cs"></div><div class="mu" id="cc" style="margin-top:4px"></div><div class="g2"><div><label>Customer phone</label><input id="f_p" type="tel" autocomplete="off"></div><div><label>Date received</label><input id="f_d" type="date" value="${today()}"></div></div>
<label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="f_sv" checked style="width:auto"><span>Save as a client</span></label><div class="g2"><div><label>Type</label><select id="f_t"><option value="Phone">Phone</option><option value="Tablet">Tablet</option></select></div><div><label>Brand / model *</label><input id="f_m"></div></div>
<div class="mu" style="margin-top:8px">🛡 <span>Under warranty by default; the repair team can change it.</span></div>
<label>IMEI / serial</label><div class="sf"><input id="f_i" inputmode="numeric"><button type="button" class="pri" onclick="scan('f_i')">📷 <span>Scan</span></button></div><label>Problem *</label><textarea id="f_pr"></textarea>
<label>Photo of device (required)</label>${pick('pv')}
<div class="row"><button class="pri" onclick="create()">Open case file</button></div>`);
};
const pick=id=>`<div class="row" style="margin-top:6px"><label class="btn pri">📷 <span>Take photo</span><input class="hid" type="file" accept="image/*" capture="environment" data-pick="${id}"></label><label class="btn">🖼 <span>Choose from gallery</span><input class="hid" type="file" accept="image/*" data-pick="${id}"></label></div><img id="${id}" class="ph" style="display:none;margin-top:8px">`;
document.addEventListener('change',async e=>{const t=e.target;if(!t.dataset||!t.dataset.pick)return;const f=t.files&&t.files[0];if(!f)return;try{const d=await shrink(f),id=t.dataset.pick;if(id==='pv')photo=d;else photo2=d;const im=$('#'+id);im.src=d;im.style.display='block'}catch(x){toast('Could not read the photo')}t.value=''});
function shrink(f){return new Promise((res,rej)=>{const i=new Image(),u=URL.createObjectURL(f);i.onload=()=>{const s=Math.min(1,720/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*s;c.height=i.height*s;c.getContext('2d').drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',.6))};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'))};i.src=u})}
const val=id=>{const e=$('#'+id);return e?e.value.trim():''};
async function create(){
 const c=val('f_c'),m=val('f_m'),p=val('f_pr');if(!can.rec())return toast('Not allowed');if(!c||!m||!p)return toast('Name, model and problem are required');if(!photo)return toast('Reception photo is required');
 let cid=selClient||null;
 if(!cid&&can.cli()){const dg=digits(val('f_p')),m=dg&&clients.find(x=>digits(x.phone)===dg);if(m)cid=m.id;else if($('#f_sv').checked){cid=newId('c');try{await db.doc('clients/'+cid).set({name:c,phone:val('f_p'),email:'',notes:'',date:today(),at:Date.now(),by:me()});audit('client created',c)}catch(e){cid=null}}}
 const no='R'+val('f_d').replace(/-/g,'').slice(2)+'-'+Math.floor(100+Math.random()*900);
 const o={caseNo:no,customer:c,clientId:cid||'',phone:val('f_p'),type:$('#f_t').value,warranty:'in',warrantyLog:[],model:m,imei:val('f_i'),problem:p,openedAt:val('f_d')||today(),status:'waiting',loc:'reception',track:[mk('received')],photo:photo,photoDone:'',repairInfo:'',parts:'',cost:'',tech:'',startedAt:'',repairedAt:'',outcome:'',returnDate:'',history:[`${today()} · ${role()} · case opened`]};
 try{await db.doc('cases/'+no.toLowerCase()).set(o);audit('case opened',no);shut();toast('Case '+no+' opened')}catch(e){toast('Could not save: '+(e.code||e.message))}
}
function detail(id){
 const c=cases.find(x=>x.id===id);if(!c)return;cur=c;const live=['waiting','repairing','repaired','swap_todo','swap_sent','swap_done'].includes(c.status),ed=can.edit()&&live,ro=ed?'':'disabled',s=c.status,sw=can.swap(),pb=payBox(c),loc=c.loc;
 open_(`<div class="top"><h1>${esc(c.caseNo)}</h1><span class="pill ${s}">${S[s]}</span>${wp(c)}${lp(c)}<span class="sp"></span><button onclick="shut()">Close ✕</button></div>
${c.photo?`<div class="mu">📷 <span>Reception photo</span></div><img class="ph" src="${c.photo}">`:''}${c.photoDone?`<div class="mu" style="margin-top:8px">📷 <span>After-repair photo</span></div><img class="ph" src="${c.photoDone}">`:''}
<div class="box"><b>${esc(c.customer)}</b> <span class="mu">${esc(c.phone)}${c.email?' · '+esc(c.email):''}</span>${can.cli()&&cliOf(c)?` <a href="#" data-cli="${esc(cliOf(c).id)}">👤 <span>Client</span></a>`:''}<div>${esc(c.type)} · ${esc(c.model)}</div><div class="mu"><span>IMEI / serial:</span> ${esc(c.imei||'—')} · <span>Received</span> ${esc(c.openedAt)}</div><div style="margin-top:8px"><span class="mu">Problem:</span> ${esc(c.problem)}</div>
<div class="mu" style="margin-top:8px"><span>Started</span> ${esc(c.startedAt||'—')} · <span>Repaired</span> ${esc(c.repairedAt||'—')}${c.outcome?` (<span>${c.outcome==='success'?'success':'unrepairable'}</span>)`:''} · <span>Returned</span> ${esc(c.returnDate||'—')}</div></div>
${c.swapAt?`<div class="box"><h2>🔄 Swap case</h2><div class="g2"><div><b>Old phone</b><div>${esc(c.model)}</div><div class="mu">IMEI ${esc(c.imei||'—')}</div></div><div><b>New phone</b><div>${esc(c.newModel||'—')}</div><div class="mu">IMEI ${esc(c.newImei||'—')}</div></div></div><div class="mu" style="margin-top:8px">${c.swapReason?'<span>Reason:</span> '+esc(c.swapReason)+' · ':''}<span>Assigned</span> ${esc(c.swapAt)} · <span>Sent</span> ${esc(c.sentAt||'—')}${c.swapRef?' ('+esc(c.swapRef)+')':''} · <span>Swapped</span> ${esc(c.swappedAt||'—')}</div></div>`:''}
${trk(c)}${wbox(c)}${pbox(c)}${pb}<div class="box"><label style="margin-top:0">Repair information</label><textarea id="e_r" ${ro}>${esc(c.repairInfo)}</textarea>
<div class="g2"><div><label>Parts used</label><input id="e_p" value="${esc(c.parts)}" ${ro}></div><div><label>Cost</label><input id="e_c" value="${esc(c.cost)}" ${ro}></div></div>
<label>Technician</label><input id="e_t" value="${esc(c.tech)}" ${ro}>
${s==='repairing'&&ed?`<label>Photo after repair (required to finish)</label>${pick('pv2')}`:''}
${(s==='repaired'||s==='swap_done')&&can.rec()&&(s==='swap_done'||loc==='reception')?`<label>Return date to customer</label><input id="e_d" type="date" value="${today()}">`:''}
${(s==='waiting'||s==='repairing')&&sw?`<label>Swap reason (to move to swap list)</label><input id="e_sr">`:''}
${s==='swap_todo'&&sw?`<label>Factory shipment / RMA ref</label><input id="e_ref">`:''}
${(s==='swap_sent'||s==='swap_done')&&sw?`<div class="g2"><div><label>New phone model</label><input id="n_m" value="${esc(c.newModel)}"></div><div><label>New phone IMEI</label><div class="sf"><input id="n_i" value="${esc(c.newImei)}"><button type="button" class="pri" onclick="scan('n_i')">📷 <span>Scan</span></button></div></div></div>`:''}</div>
<div class="row">${ed?`<button onclick="run({},'notes updated',1)">Save notes</button>`:''}
${s==='waiting'&&loc==='reception'&&can.rec()?`<button class="pri" onclick="run({loc:'to_ws',__ev:'sent_ws'},'sent to workshop')">Send to workshop</button>`:''}
${s==='repaired'&&loc==='reception'&&can.rec()?`<button onclick="run({loc:'to_ws',__ev:'sent_ws'},'sent back to workshop')">Send back to workshop</button>`:''}
${loc==='to_ws'&&can.ws()?`<button class="pri" onclick="run({loc:'workshop',__ev:'recv_ws'},'received in workshop')">Confirm received in workshop</button>`:''}
${s==='waiting'&&loc==='workshop'&&ed?`<button class="pri" onclick="run({status:'repairing',startedAt:today(),__ev:'started'},'repair started')">Start repair</button>`:''}
${s==='repaired'&&loc==='workshop'&&can.ws()?`<button class="pri" onclick="run({loc:'to_rec',__ev:'handed_rec'},'handed to reception')">Hand over to reception</button>`:''}
${loc==='to_rec'&&can.rec()?`<button class="pri" onclick="run({loc:'reception',__ev:'recv_rec'},'received at reception')">Confirm received at reception</button>`:''}
${s==='repairing'&&ed?`<button class="pri" onclick="finish('success')">Mark repaired ✓</button><button class="dng" onclick="finish('unrepairable')">Unrepairable</button>`:''}
${s==='repaired'&&loc==='reception'&&can.rec()?`<button class="pri" onclick="deliver()">Return to customer</button>`:''}
${s==='delivered'&&can.arch()?`<button class="pri" onclick="run({status:'archived'},'archived')">Archive</button>`:''}
${s==='archived'&&can.arch()?`<button onclick="run({status:'delivered'},'unarchived')">Unarchive</button>`:''}
${['repaired','delivered','archived'].includes(s)&&can.edit()&&!c.swapAt?(loc==='workshop'?`<button onclick="reopen()">Reopen</button>`:`<button disabled title="The phone is not in the workshop">Reopen</button><span class="mu"><span>Phone is with reception: resend it to the workshop first.</span></span>`):''}
${(s==='waiting'||s==='repairing')&&sw?`<button class="dng" onclick="run({status:'swap_todo',swapAt:today(),swapReason:val('e_sr'),repairedAt:'',outcome:''},'moved to swap list')">Move to swap list</button>`:''}
${s==='swap_todo'&&sw?`<button class="pri" onclick="run({status:'swap_sent',sentAt:today(),swapRef:val('e_ref')},'sent to factory')">Mark sent to factory</button><button onclick="run({status:'waiting',swapAt:'',swapReason:''},'removed from swap list')">Back to repair</button>`:''}
${s==='swap_sent'&&sw?`<button class="pri" onclick="swapped()">Replacement received</button>`:''}
${s==='swap_done'&&sw?`<button onclick="run({newModel:val('n_m'),newImei:val('n_i')},'new phone info updated',1)">Save new phone</button>`:''}
${s==='swap_done'&&can.rec()?`<button class="pri" onclick="deliver()">Return to customer</button>`:''}
${can.adm()?`<button class="dng" onclick="del()">Delete</button>`:''}</div>
<div class="box hist"><b>History</b>${(c.history||[]).map(h=>`<div>${esc(h)}</div>`).join('')}</div>`);
}
async function finish(o){const p=photo2||cur.photoDone;if(!p)return toast('Upload the after-repair photo first');run({status:'repaired',outcome:o,repairedAt:today(),photoDone:p,__ev:o==='success'?'repaired':'unrepairable'},o==='success'?'repaired':'unrepairable')}

function reopen(){if(cur.loc!=='workshop')return toast('The phone is not in the workshop');run({status:'repairing',repairedAt:'',returnDate:'',outcome:''},'reopened')}
function loadScanner(){return new Promise((res,rej)=>{if(window.Html5Qrcode)return res();const x=document.createElement('script');x.src='https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';x.onload=res;x.onerror=rej;document.head.appendChild(x)})}
const imeiOf=t=>{const m=String(t).match(/\d{15}/);return m?m[0]:String(t).trim()};
async function scan(id){
 const o=document.createElement('div');o.className='ov on';o.style.zIndex=28;
 o.innerHTML=`<div class="md" style="max-width:460px"><div class="top"><h1>📷 <span>Scan IMEI</span></h1><span class="sp"></span><button id="sx">Cancel</button></div><div id="rd" style="width:100%;border-radius:12px;overflow:hidden;background:#000;min-height:120px"></div><div class="mu" id="rs" style="margin-top:8px">Point the camera at the barcode</div><div class="row"><label class="btn">🖼 <span>Scan from a photo</span><input class="hid" type="file" accept="image/*" id="rf"></label></div></div>`;
 document.body.appendChild(o);let h=null;
 const fin=async t=>{if(t!=null){const v=imeiOf(t),i=$('#'+id);if(i){i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}toast(v)}try{if(h)await h.stop()}catch(e){}try{if(h)h.clear()}catch(e){}o.remove()};
 $('#sx').onclick=()=>fin(null);
 try{await loadScanner()}catch(e){$('#rs').textContent='Scanner unavailable (no internet?)';return}
 const F=Html5QrcodeSupportedFormats;h=new Html5Qrcode('rd',{formatsToSupport:[F.CODE_128,F.CODE_39,F.EAN_13,F.ITF,F.CODABAR,F.QR_CODE,F.DATA_MATRIX].filter(x=>x!=null),useBarCodeDetectorIfSupported:true,verbose:false});
 $('#rf').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{fin(await h.scanFile(f,false))}catch(x){$('#rs').textContent='No barcode found in the photo. Try again closer.'}};
 try{await h.start({facingMode:'environment'},{fps:10,qrbox:{width:280,height:140}},t=>fin(t),()=>{})}catch(e){$('#rs').textContent='Cannot start the camera. Use "Scan from a photo" or type it.'}
}
const newId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const MK={consume:'Consumed',defect:'Defective',defect_case:'Returned from repair as defective',sendback:'Sent to warehouse'};
const sumMv=(id,k)=>mv.filter(m=>m.partId===id&&m.k===k).reduce((t,m)=>t+m.qty,0);
const stk=p=>{const co=sumMv(p.id,'consume'),df=sumMv(p.id,'defect'),dc=sumMv(p.id,'defect_case'),sb=sumMv(p.id,'sendback');return{in:p.qtyIn,good:p.qtyIn-co-df,cons:co-dc,def:df+dc-sb,ret:sb}};
function subInv(){if(!db||!can.inv()||invOn)return;invOn=true;
 db.collection('parts').onSnapshot(s=>{parts=s.docs.map(d=>({id:d.id,...d.data()}));inv()},()=>{});
 db.collection('grn').onSnapshot(s=>{grns=s.docs.map(d=>({id:d.id,...d.data()}));inv()},()=>{});
 db.collection('stockmoves').onSnapshot(s=>{mv=s.docs.map(d=>({id:d.id,...d.data()}));inv()},()=>{})}
async function mvAdd(p,k,q,x={}){const id=newId('m'),m={partId:p.id,k,qty:q,date:today(),at:Date.now(),by:role(),who:me(),note:'',caseId:'',caseNo:'',...x};await db.doc('stockmoves/'+id).set(m);mv.push({id,...m});return id}
function inv(){
 if(!can.inv())return;
 const L=parts.map(p=>({p,s:stk(p)})),sm=f=>L.reduce((t,x)=>t+f(x),0);
 $('#ik').innerHTML=`<div class="kp"><div class="k"><b>${money(sm(x=>x.p.qtyIn*x.p.unitCost))}</b><span>Incoming parts value</span></div><div class="k"><b>${sm(x=>x.p.qtyIn)}</b><span>Incoming parts quantity</span></div><div class="k"><b style="color:var(--ok)">${sm(x=>x.s.good)}</b><span>In stock (good)</span></div><div class="k"><b>${money(sm(x=>x.s.good*x.p.unitCost))}</b><span>In stock value</span></div><div class="k"><b class="${sm(x=>x.s.def)?'slow':''}">${sm(x=>x.s.def)}</b><span>Defective (to send back)</span></div><div class="k"><b>${sm(x=>x.s.cons)}</b><span>Consumed in repairs</span></div><div class="k"><b>${sm(x=>x.s.ret)}</b><span>Sent to main warehouse</span></div></div>`;
 const g=[...grns].sort((a,b)=>(b.no||'').localeCompare(a.no||''));
 $('#gn').innerHTML=g.length?tbl(['Note','Date','Lines','Value','Status','By'],g.map(n=>{const t=(n.lines||[]).reduce((a,l)=>a+l.qty*l.unit,0);return `<tr data-grn="${esc(n.id)}" style="cursor:pointer"><td><a href="#">${esc(n.no)}</a></td><td>${esc(n.date)}</td><td>${(n.lines||[]).length}</td><td>${money(t)}</td><td><span class="pill ${n.status==='confirmed'?'paid':'waiting'}"><span>${n.status==='confirmed'?'Confirmed':'Draft'}</span></span></td><td>${esc(n.by)}</td></tr>`}).join('')):'<div class="mu">No receiving notes yet.</div>';
 const q=$('#iq').value.toLowerCase().trim(),f=$('#ist').value;
 const rs=L.filter(x=>(!q||(x.p.name+' '+x.p.noteNo).toLowerCase().includes(q))&&(!f||(f==='good'?x.s.good>0:f==='def'?x.s.def>0:f==='cons'?x.s.cons>0:x.s.ret>0)));
 $('#ls').innerHTML=rs.length?tbl(['Part','Note','Unit price','Qty received','Good','Defective','Consumed','Sent back'],rs.map(x=>`<tr data-lot="${esc(x.p.id)}" style="cursor:pointer"><td><b>${esc(x.p.name)}</b></td><td>${esc(x.p.noteNo)}</td><td>${money(x.p.unitCost)}</td><td>${x.s.in}</td><td>${x.s.good}</td><td class="${x.s.def?'slow':''}">${x.s.def}</td><td>${x.s.cons}</td><td>${x.s.ret}</td></tr>`).join('')):'<div class="mu">No parts in stock.</div>';
}
$('#inv').addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault();const n=e.target.closest('tr[data-grn]'),l=e.target.closest('tr[data-lot]');if(n)grnEdit(n.dataset.grn);else if(l)lotView(l.dataset.lot)});
$('#iq').addEventListener('input',()=>inv());$('#ist').addEventListener('change',()=>inv());$('#ng').onclick=grnNew;
function grnNew(){const d=today(),pre='GRN-'+d.slice(2,4)+d.slice(5,7)+'-',no=pre+String(grns.filter(g=>(g.no||'').startsWith(pre)).length+1).padStart(3,'0'),id='grn-'+no.slice(4).toLowerCase(),g={no,date:d,status:'draft',lines:[],ref:'',by:me(),role:role()};
 db.doc('grn/'+id).set(g).then(()=>{grns.push({id,...g});audit('receiving note opened',no);grnEdit(id)},e=>toast('Failed: '+(e.code||e.message)))}
function grnEdit(id){const g=grns.find(x=>x.id===id);if(!g)return;const dr=g.status==='draft',L=g.lines||[],t=L.reduce((a,l)=>a+l.qty*l.unit,0);
 open_(`<div class="top"><h1>${esc(g.no)}</h1><span class="pill ${dr?'waiting':'paid'}"><span>${dr?'Draft':'Confirmed'}</span></span><span class="sp"></span><button onclick="shut()">Close ✕</button></div><div class="mu">${esc(g.date)} · ${esc(g.by)}</div>
<div class="box">${L.length?tbl(['Part','Quantity','Unit price','Value',''],L.map((l,i)=>`<tr><td>${esc(l.name)}</td><td>${l.qty}</td><td>${money(l.unit)}</td><td>${money(l.qty*l.unit)}</td><td>${dr?`<button class="dng" onclick="grnDel('${id}',${i})">✕</button>`:''}</td></tr>`).join('')):'<div class="mu">No lines yet.</div>'}<div style="margin-top:8px"><b><span>Total</span>: ${money(t)}</b></div></div>
${dr?`<div class="box"><div class="g2"><div><label>Part name</label><input id="gl_n"></div><div><label>Quantity</label><input id="gl_q" type="number" min="1" step="1" inputmode="numeric"></div></div><div class="g2"><div><label>Unit price</label><input id="gl_p" type="number" min="0" step="0.01" inputmode="decimal"></div><div style="display:flex;align-items:flex-end"><button class="pri" onclick="grnAdd('${id}')">Add line</button></div></div></div>
<div class="row"><button class="pri" onclick="grnConfirm('${id}')">Confirm & close note</button><button class="dng" onclick="grnDrop('${id}')">Delete draft</button></div>`:''}`)}
async function grnSave(id,lines){const g=grns.find(x=>x.id===id);try{await db.doc('grn/'+id).update({lines});g.lines=lines;grnEdit(id)}catch(e){toast('Failed: '+(e.code||e.message))}}
function grnAdd(id){const g=grns.find(x=>x.id===id),n=val('gl_n'),q=parseInt(val('gl_q'),10),p=parseFloat(val('gl_p'));if(!n||!(q>0)||isNaN(p)||p<0)return toast('Part name, quantity and price are required');grnSave(id,[...(g.lines||[]),{name:n,qty:q,unit:Math.round(p*100)/100}])}
function grnDel(id,i){const g=grns.find(x=>x.id===id);grnSave(id,(g.lines||[]).filter((_,k)=>k!==i))}
async function grnDrop(id){if(!(await ask('Delete draft'+'?')))return;try{await db.doc('grn/'+id).delete();grns=grns.filter(x=>x.id!==id);inv();shut()}catch(e){toast('Failed: '+(e.code||e.message))}}
async function grnConfirm(id){const g=grns.find(x=>x.id===id),L=g.lines||[];if(!L.length)return toast('Add at least one line first');
 try{await Promise.all(L.map((l,i)=>db.doc('parts/'+id+'-'+i).set({name:l.name,qtyIn:l.qty,unitCost:l.unit,noteId:id,noteNo:g.no,date:today(),by:me()})));
  await db.doc('grn/'+id).update({status:'confirmed',confirmedAt:today(),confirmedBy:me()});g.status='confirmed';audit('receiving note confirmed',g.no,money(L.reduce((a,l)=>a+l.qty*l.unit,0)));toast('Receiving note confirmed: parts added to stock');grnEdit(id)}catch(e){toast('Failed: '+(e.code||e.message))}}
function lotView(id){const p=parts.find(x=>x.id===id);if(!p)return;const s=stk(p),hs=mv.filter(m=>m.partId===id).sort((a,b)=>(b.at||0)-(a.at||0));
 open_(`<div class="top"><h1>${esc(p.name)}</h1><span class="sp"></span><button onclick="shut()">Close ✕</button></div><div class="mu">${esc(p.noteNo)} · ${money(p.unitCost)} · ${esc(p.date)}</div>
<div class="kp" style="margin-top:10px"><div class="k"><b>${s.in}</b><span>Qty received</span></div><div class="k"><b style="color:var(--ok)">${s.good}</b><span>Good</span></div><div class="k"><b class="${s.def?'slow':''}">${s.def}</b><span>Defective</span></div><div class="k"><b>${s.cons}</b><span>Consumed</span></div><div class="k"><b>${s.ret}</b><span>Sent back</span></div></div>
${s.good>0?`<div class="box"><h2>Mark defective</h2><div class="g2"><input id="lq1" type="number" min="1" max="${s.good}" value="1"><button class="dng" onclick="markDef('${id}')">Mark defective</button></div></div>`:''}
${s.def>0?`<div class="box"><h2>Send to main warehouse</h2><div class="g2"><input id="lq2" type="number" min="1" max="${s.def}" value="${s.def}"><input id="lr2" placeholder="Reference (optional)"></div><div class="row"><button class="pri" onclick="sendBack('${id}')">Send to main warehouse</button></div></div>`:''}
<div class="box"><h2>Movements</h2>${hs.length?`<div class="hist">${hs.map(m=>`<div>${esc(m.date)} · <span>${MK[m.k]||esc(m.k)}</span> · ${m.qty}${m.caseNo?' · '+esc(m.caseNo):''}${m.note?' · '+esc(m.note):''} · ${esc(m.who||m.by)}</div>`).join('')}</div>`:'<div class="mu">No movements yet.</div>'}</div>`)}
async function markDef(id){const p=parts.find(x=>x.id===id),q=parseInt(val('lq1'),10);if(!(q>0))return toast('Enter a valid quantity');if(q>stk(p).good)return toast('Only '+stk(p).good+' in stock');
 try{await mvAdd(p,'defect',q);audit('part marked defective',p.name,'x'+q);toast('Marked defective');lotView(id);inv()}catch(e){toast('Failed: '+(e.code||e.message))}}
async function sendBack(id){const p=parts.find(x=>x.id===id),q=parseInt(val('lq2'),10);if(!(q>0)||q>stk(p).def)return toast('Not enough defective parts');
 try{await mvAdd(p,'sendback',q,{note:val('lr2')});audit('sent to main warehouse',p.name,'x'+q);toast('Sent to the main warehouse');lotView(id);inv()}catch(e){toast('Failed: '+(e.code||e.message))}}
function pbox(c){
 const L=c.partLines||[];if(!can.money()||(c.warranty!=='out'&&!L.length))return '';
 const ed=can.inv()&&c.warranty==='out'&&['waiting','repairing','repaired'].includes(c.status),opts=parts.map(p=>({p,g:stk(p).good})).filter(x=>x.g>0);
 return `<div class="box"><h2>🔩 <span>Parts used</span></h2>${L.length?tbl(['Part','Quantity','Unit price','Value',''],L.map(l=>`<tr><td>${esc(l.name)}</td><td>${l.qty}</td><td>${money(l.unit)}</td><td>${money(l.qty*l.unit)}</td><td>${ed?`<button class="dng" onclick="retPart('${esc(l.mid)}')"><span>Return as defective</span></button>`:''}</td></tr>`).join('')):'<div class="mu">No parts used.</div>'}${L.length?`<div style="margin-top:8px"><b><span>Total</span>: ${money(c.partsTotal)}</b></div>`:''}
${ed?`<div class="g2"><div><label>Part</label><select id="pu_p"><option value="">Select a part…</option>${opts.map(x=>`<option value="${esc(x.p.id)}">${esc(x.p.name)} · ${money(x.p.unitCost)} (${x.g})</option>`).join('')}</select></div><div><label>Quantity</label><input id="pu_q" type="number" min="1" step="1" value="1" inputmode="numeric"></div></div><div class="row"><button class="pri" onclick="usePart()">Use part</button></div>`:''}</div>`}
async function usePart(){const c=cur,p=parts.find(x=>x.id===val('pu_p')),q=parseInt(val('pu_q'),10);
 if(!p)return toast('Select a part');if(!(q>0))return toast('Enter a valid quantity');if(c.warranty!=='out')return toast('Parts are only used on out-of-warranty repairs');if(q>stk(p).good)return toast('Only '+stk(p).good+' in stock');
 try{const mid=await mvAdd(p,'consume',q,{caseId:c.id,caseNo:c.caseNo}),lines=[...(c.partLines||[]),{mid,partId:p.id,name:p.name,qty:q,unit:p.unitCost,at:today(),by:me()}],total=Math.round(lines.reduce((t,x)=>t+x.qty*x.unit,0)*100)/100;
  await db.doc('cases/'+c.id).update({partLines:lines,partsTotal:total,history:[...(c.history||[]),`${today()} · ${role()} · part used: ${p.name} x${q}`]});audit('part used',c.caseNo,p.name+' x'+q);toast('Part added to the repair price');refresh()}catch(e){toast('Failed: '+(e.code||e.message))}}
async function retPart(mid){const c=cur,l=(c.partLines||[]).find(x=>x.mid===mid),p=l&&parts.find(x=>x.id===l.partId);if(!p)return toast('Failed');
 const lines=c.partLines.filter(x=>x.mid!==mid),total=Math.round(lines.reduce((t,x)=>t+x.qty*x.unit,0)*100)/100;
 try{await mvAdd(p,'defect_case',l.qty,{caseId:c.id,caseNo:c.caseNo});await db.doc('cases/'+c.id).update({partLines:lines,partsTotal:total,history:[...(c.history||[]),`${today()} · ${role()} · part returned as defective: ${l.name} x${l.qty}`]});audit('part returned as defective',c.caseNo,l.name+' x'+l.qty);toast('Part returned as defective');refresh()}catch(e){toast('Failed: '+(e.code||e.message))}}
const digits=x=>String(x||'').replace(/\D/g,'');
const cliOf=c=>c.clientId?clients.find(x=>x.id===c.clientId):(digits(c.phone)?clients.find(x=>digits(x.phone)===digits(c.phone)):null);
const casesOf=k=>cases.filter(c=>{const o=cliOf(c);return o&&o.id===k.id});
const cbal=id=>acx.filter(t=>t.clientId===id).reduce((a,t)=>a+(t.type==='topup'?t.amount:-t.amount),0);
const LK={topup:'Top-up',withdraw:'Withdrawal',apply:'Paid from account',cash:'Cash payment'};
function subCli(){if(!db||!can.cli()||cliOn)return;cliOn=true;
 db.collection('clients').onSnapshot(s=>{clients=s.docs.map(d=>({id:d.id,...d.data()}));cliRender()},()=>{});
 db.collection('acctx').onSnapshot(s=>{acx=s.docs.map(d=>({id:d.id,...d.data()}));cliRender()},()=>{})}
async function acxAdd(type,clientId,amount,x={}){const id=newId('t'),t={clientId,type,amount:Math.round(amount*100)/100,date:today(),at:Date.now(),by:role(),who:me(),note:'',caseId:'',caseNo:'',...x};await db.doc('acctx/'+id).set(t);acx.push({id,...t});return id}
async function payCase(c,a,src,note,k){const id=newId('p'),p={caseId:c.id,caseNo:c.caseNo,customer:c.customer,phone:c.phone||'',ck:ck(c),amount:Math.round(a*100)/100,date:today(),by:role(),note:note||'',at:Date.now(),src,clientId:k?k.id:''};
 await db.doc('payments/'+id).set(p);pays.push({id,...p});if(src==='account')await acxAdd('apply',k.id,a,{caseId:c.id,caseNo:c.caseNo,note:id})}
function cliRender(){
 if(!can.cli())return;
 const q=$('#clq').value.toLowerCase().trim(),R_=clients.map(k=>{const cs=casesOf(k);return{k,n:cs.length,act:cs.filter(c=>!['delivered','archived'].includes(c.status)).length,owed:cs.reduce((t,c)=>t+due(c),0),b:cbal(k.id)}});
 const rs=R_.filter(x=>!q||(x.k.name+' '+(x.k.phone||'')).toLowerCase().includes(q)).sort((a,b)=>(a.k.name||'').localeCompare(b.k.name||''));
 $('#clk').innerHTML=`<div class="kp"><div class="k"><b>${clients.length}</b><span>Clients</span></div><div class="k"><b>${R_.reduce((t,x)=>t+x.act,0)}</b><span>In progress</span></div><div class="k"><b class="${R_.some(x=>x.owed)?'slow':''}">${money(R_.reduce((t,x)=>t+x.owed,0))}</b><span>Total owed</span></div><div class="k"><b style="color:var(--ok)">${money(R_.reduce((t,x)=>t+x.b,0))}</b><span>Prepaid balance (all clients)</span></div></div>`;
 $('#cll').innerHTML=rs.length?tbl(['Client','Phone','Cases','In progress','Owed','Account balance'],rs.map(x=>`<tr data-cl2="${esc(x.k.id)}" style="cursor:pointer"><td><b>${esc(x.k.name)}</b></td><td>${esc(x.k.phone)}</td><td>${x.n}</td><td>${x.act}</td><td class="${x.owed?'slow':''}">${money(x.owed)}</td><td>${money(x.b)}</td></tr>`).join('')):'<div class="mu">No clients yet.</div>';
}
$('#cli').addEventListener('click',e=>{const r=e.target.closest('tr[data-cl2]');if(r)clientView(r.dataset.cl2)});
$('#clq').addEventListener('input',()=>cliRender());$('#cln').onclick=()=>cliEdit();$('#cim').onclick=cliImport;
function suggest(q){const bx=$('#cs');if(!bx)return;selClient=null;$('#cc').textContent='';const t=q.trim().toLowerCase(),d=digits(q);if(t.length<2){bx.innerHTML='';return}
 bx.innerHTML=clients.filter(k=>(k.name||'').toLowerCase().includes(t)||(d.length>=3&&digits(k.phone).includes(d))).slice(0,6).map(k=>`<div data-cl="${esc(k.id)}"><b>${esc(k.name)}</b> · ${esc(k.phone||'')} <span class="mu">· ${casesOf(k).length} <span>Cases</span></span></div>`).join('')}
$('#md').addEventListener('input',e=>{if(e.target.id==='f_c'||e.target.id==='f_p')suggest(e.target.value)});
$('#md').addEventListener('click',e=>{const s2=e.target.closest('[data-cl]'),a=e.target.closest('a[data-cli]');
 if(s2){const k=clients.find(x=>x.id===s2.dataset.cl);if(k){$('#f_c').value=k.name;$('#f_p').value=k.phone||'';selClient=k.id;$('#cs').innerHTML='';$('#cc').textContent='👤 Linked to client: '+k.name}}
 else if(a){e.preventDefault();clientView(a.dataset.cli)}});
function cliEdit(id){const k=id?clients.find(x=>x.id===id):{name:'',phone:'',email:'',notes:''};if(!k)return;
 open_(`<div class="top"><h1><span>${id?'Edit':'+ New client'}</span></h1><span class="sp"></span><button onclick="${id?`clientView('${id}')`:'shut()'}">Cancel</button></div><div class="box"><label style="margin-top:0">Name *</label><input id="k_n" value="${esc(k.name)}"><label>Phone</label><input id="k_p" type="tel" value="${esc(k.phone)}"><label>Email</label><input id="k_e" type="email" value="${esc(k.email)}"><label>Notes</label><textarea id="k_t">${esc(k.notes)}</textarea><div class="row"><button class="pri" onclick="cliSave('${id||''}')">Save</button></div></div>`)}
async function cliSave(id){const n=val('k_n'),p=val('k_p'),d=digits(p);if(!n)return toast('Client name is required');if(d&&clients.some(x=>x.id!==id&&digits(x.phone)===d))return toast('A client with this phone already exists');
 const o={name:n,phone:p,email:val('k_e'),notes:val('k_t')};
 try{if(id){await db.doc('clients/'+id).update(o);const k=clients.find(x=>x.id===id);Object.assign(k,o);audit('client edited',n);toast('Client saved');clientView(id)}else{const nid=newId('c');await db.doc('clients/'+nid).set({...o,date:today(),at:Date.now(),by:me()});clients.push({id:nid,...o});audit('client created',n);toast('Client saved');cliRender();clientView(nid)}}catch(e){toast('Failed: '+(e.code||e.message))}}
async function cliImport(){const g={};cases.forEach(c=>{const d=digits(c.phone);if(d&&!cliOf(c)&&!g[d])g[d]={name:c.customer,phone:c.phone}});const L=Object.values(g);if(!L.length)return toast('Nothing to import');
 try{await Promise.all(L.map(x=>db.doc('clients/'+newId('c')).set({name:x.name,phone:x.phone,email:'',notes:'',date:today(),at:Date.now(),by:me()})));audit('clients imported',String(L.length));toast('Clients imported')}catch(e){toast('Failed: '+(e.code||e.message))}}
function clientView(id){const k=clients.find(x=>x.id===id);if(!k)return;
 const cs=casesOf(k).sort((a,b)=>(b.openedAt||'').localeCompare(a.openedAt||'')),owed=cs.reduce((t,c)=>t+due(c),0),b=cbal(id),ids=new Set(cs.map(c=>c.id)),dueCs=cs.filter(c=>due(c)>0);
 const led=[...acx.filter(t=>t.clientId===id).map(t=>({at:t.at,d:t.date,k:t.type,a:t.amount,c:t.caseNo,w:t.who||t.by,n:t.type==='apply'?'':t.note})),...pays.filter(p=>ids.has(p.caseId)&&p.src!=='account').map(p=>({at:p.at,d:p.date,k:'cash',a:p.amount,c:p.caseNo,w:p.by,n:p.note}))].sort((x,y)=>(y.at||0)-(x.at||0));
 open_(`<div class="top"><h1>${esc(k.name)}</h1>${owed>0?`<span class="pill unpaid"><span>On hold</span></span>`:`<span class="pill paid"><span>Settled</span></span>`}<span class="sp"></span><button onclick="cliEdit('${id}')">Edit</button><button onclick="shut()">Close ✕</button></div>
<div class="mu">${esc(k.phone||'')}${k.email?' · '+esc(k.email):''}${k.notes?' · '+esc(k.notes):''}</div>
<div class="kp" style="margin-top:10px"><div class="k"><b style="color:var(--ok)">${money(b)}</b><span>Account balance</span></div><div class="k"><b class="${owed?'slow':''}">${money(owed)}</b><span>Owed</span></div><div class="k"><b>${cs.length}</b><span>Cases</span></div></div>
<div class="box"><h2>Cases</h2>${cs.length?tbl(['Case','Device','IMEI','Status','Total','Balance'],cs.map(c=>`<tr><td><a href="#" data-id="${esc(c.id)}">${esc(c.caseNo)}</a></td><td>${esc(c.model)}</td><td>${esc(c.imei||'—')}</td><td><span class="pill ${c.status}">${S[c.status]}</span></td><td>${c.warranty==='out'?money(tot(c)):'—'}</td><td class="${due(c)?'slow':''}">${c.warranty==='out'?money(due(c)):'—'}</td></tr>`).join('')):'<div class="mu">No cases yet.</div>'}</div>
${can.pay()?`<div class="box"><h2>Top up account</h2><div class="g2"><input id="ca_a" type="number" min="0" step="0.01" inputmode="decimal"><input id="ca_n" placeholder="Note"></div><div class="row"><button class="pri" onclick="cliTop('${id}')">Top up</button></div></div>
<div class="box"><h2>Pay a case</h2><div class="g2"><select id="cp_c" onchange="cpFill()"><option value="">Select a case…</option>${dueCs.map(c=>`<option value="${esc(c.id)}" data-d="${due(c)}">${esc(c.caseNo)} · ${esc(c.model)} (${money(due(c))})</option>`).join('')}</select><input id="cp_a" type="number" min="0" step="0.01" inputmode="decimal"></div><div class="g2"><select id="cp_s"><option value="cash">Cash</option>${b>0?`<option value="account">Client account (${money(b)})</option>`:''}</select><input id="cp_n" placeholder="Note"></div><div class="row"><button class="pri" onclick="cliPay('${id}')">Record payment</button></div></div>
<div class="box"><h2>Withdraw from account</h2><div class="g2"><input id="cw_a" type="number" min="0" step="0.01" inputmode="decimal" value="${b>0?b:''}"><input id="cw_n" placeholder="Note"></div><div class="row"><button class="dng" onclick="cliOut('${id}')">Withdraw from account</button></div></div>`:''}
<div class="box"><h2>Account history</h2>${led.length?`<div class="hist">${led.map(x=>`<div>${esc(x.d)} · <span>${LK[x.k]}</span> · ${money(x.a)}${x.c?' · '+esc(x.c):''}${x.n?' · '+esc(x.n):''} · ${esc(x.w)}</div>`).join('')}</div>`:'<div class="mu">No history yet.</div>'}</div>`)}
function cpFill(){const o=$('#cp_c').selectedOptions[0];if(o&&o.dataset.d)$('#cp_a').value=o.dataset.d}
async function cliTop(id){const a=parseFloat(val('ca_a'));if(!(a>0))return toast('Enter a valid amount');
 try{await acxAdd('topup',id,a,{note:val('ca_n')});audit('account top-up',(clients.find(x=>x.id===id)||{}).name,money(a));toast('Account updated');clientView(id);cliRender()}catch(e){toast('Failed: '+(e.code||e.message))}}
async function cliOut(id){const a=parseFloat(val('cw_a'));if(!(a>0))return toast('Enter a valid amount');if(a>cbal(id)+0.001)return toast('Not enough balance on the account');
 try{await acxAdd('withdraw',id,a,{note:val('cw_n')});audit('account withdrawal',(clients.find(x=>x.id===id)||{}).name,money(a));toast('Account updated');clientView(id);cliRender()}catch(e){toast('Failed: '+(e.code||e.message))}}
async function cliPay(id){const k=clients.find(x=>x.id===id),c=cases.find(x=>x.id===val('cp_c')),a=parseFloat(val('cp_a')),src=val('cp_s');
 if(!c)return toast('Select a case');if(!(a>0))return toast('Enter a valid amount');if(a>due(c)+0.001)return toast('More than the balance due ('+money(due(c))+')');if(src==='account'&&a>cbal(id)+0.001)return toast('Not enough balance on the account');
 try{await payCase(c,a,src,val('cp_n'),k);audit(src==='account'?'payment from client account':'payment received',c.caseNo,money(a));toast('Cash payment recorded');clientView(id);cliRender()}catch(e){toast('Failed: '+(e.code||e.message))}}
async function deliver(){const d=val('e_d');if(!d)return toast('Enter the return date');const c=cur,b=can.money()?due(c):0;
 if(b>0&&!(await ask('This customer still owes '+money(b)+'. Return the phone anyway? The balance stays on their account.')))return;
 run({status:'delivered',returnDate:d,loc:'customer',__ev:'returned'},'returned to customer'+(b>0?' (balance '+money(b)+' unpaid)':''))}
async function run(ex,t,stay){const c=cur,o={...ex};if(o.__ev){o.track=[...(c.track||[]),mk(o.__ev)];delete o.__ev}
 if($('#e_r')&&!$('#e_r').disabled)Object.assign(o,{repairInfo:val('e_r'),parts:val('e_p'),cost:val('e_c'),tech:val('e_t')});
 o.history=[...(c.history||[]),`${today()} · ${role()} · ${t}`];
 try{await db.doc('cases/'+c.id).update(o);audit(t,c.caseNo);toast('Saved');if(!stay)shut();return true}catch(e){toast('Not allowed or failed: '+(e.code||e.message));return false}}
function swapped(){const m=val('n_m'),i=val('n_i');if(!m)return toast('Enter the new phone model');run({status:'swap_done',swappedAt:today(),newModel:m,newImei:i},'replacement received')}
const selSet=new Set(),tbl=(h,r)=>`<div class="sc"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${r}</table></div>`;
function swp(){
 const td=cases.filter(c=>c.status==='swap_todo').sort((a,b)=>(a.swapAt||'').localeCompare(b.swapAt||'')),sn=cases.filter(c=>c.status==='swap_sent').sort((a,b)=>(a.sentAt||'').localeCompare(b.sentAt||'')),dn=cases.filter(c=>c.swappedAt).sort((a,b)=>b.swappedAt.localeCompare(a.swappedAt)).slice(0,40);
 const all=cases.filter(c=>c.swappedAt),fa=avg(all.map(c=>dd(c.sentAt,c.swappedAt))),old=sn.length?Math.max(...sn.map(c=>age(c.sentAt)||0)):null,over=sn.filter(c=>age(c.sentAt)>CFG.factoryDays).length;
 const L=c=>`<a href="#" data-id="${esc(c.id)}">${esc(c.caseNo)}</a>`;
 $('#swk').innerHTML=`<div class="kp"><div class="k"><b style="color:var(--wr)">${td.length}</b><span>Need to be sent to factory</span></div><div class="k"><b style="color:var(--ac)">${sn.length}</b><span>Sent, waiting for swap</span></div><div class="k"><b style="color:var(--ok)">${all.length}</b><span>Already swapped</span></div><div class="k"><b>${f1(fa)}</b><span>Avg time at factory</span></div><div class="k"><b class="${over?'slow':''}">${over}</b><span>At factory over ${CFG.factoryDays} days${old!=null?' (oldest '+f1(old)+')':''}</span></div></div>`;
 [...selSet].forEach(id=>{if(!td.find(c=>c.id===id))selSet.delete(id)});
 $('#swt').innerHTML=td.length?tbl(['','Case','Customer','Device','IMEI','Reason','Waiting'],td.map(c=>`<tr><td><input type="checkbox" data-sel="${esc(c.id)}" ${selSet.has(c.id)?'checked':''} style="width:auto"></td><td>${L(c)}</td><td>${esc(c.customer)}</td><td>${esc(c.model)}</td><td>${esc(c.imei)}</td><td>${esc(c.swapReason)}</td><td>${f1(age(c.swapAt))}</td></tr>`).join('')):'<div class="mu">Nothing waiting to be sent.</div>';
 $('#swa').innerHTML=sn.length?tbl(['Case','Customer','Device','IMEI','Sent','At factory','Ref'],sn.map(c=>`<tr><td>${L(c)}</td><td>${esc(c.customer)}</td><td>${esc(c.model)}</td><td>${esc(c.imei)}</td><td>${esc(c.sentAt)}</td><td class="${age(c.sentAt)>CFG.factoryDays?'slow':''}">${f1(age(c.sentAt))}</td><td>${esc(c.swapRef)}</td></tr>`).join('')):'<div class="mu">No phones at the factory.</div>';
 $('#swd').innerHTML=dn.length?tbl(['Case','Old phone','New phone','Swapped','At factory','Status'],dn.map(c=>`<tr><td>${L(c)}</td><td>${esc(c.model)}<br><span class="mu">${esc(c.imei)}</span></td><td>${esc(c.newModel)}<br><span class="mu">${esc(c.newImei)}</span></td><td>${esc(c.swappedAt)}</td><td>${f1(dd(c.sentAt,c.swappedAt))}</td><td>${S[c.status]}</td></tr>`).join('')):'<div class="mu">No swaps completed yet.</div>';
}
$('#swap').addEventListener('click',e=>{const a=e.target.closest('a[data-id]');if(a){e.preventDefault();detail(a.dataset.id)}});
$('#swap').addEventListener('change',e=>{const id=e.target.dataset&&e.target.dataset.sel;if(id)e.target.checked?selSet.add(id):selSet.delete(id)});
$('#sh_go').onclick=async()=>{if(!can.swap())return toast('Not allowed');const ids=[...selSet].filter(id=>cases.find(c=>c.id===id&&c.status==='swap_todo'));if(!ids.length)return toast('Tick the phones to send first');const ref=val('sh_ref'),d=val('sh_d')||today();
 try{await Promise.all(ids.map(id=>{const c=cases.find(x=>x.id===id);return db.doc('cases/'+id).update({status:'swap_sent',sentAt:d,swapRef:ref,history:[...(c.history||[]),`${today()} · ${role()} · sent to factory${ref?' ('+ref+')':''}`]})}));selSet.clear();toast(ids.length+' phone(s) marked as sent')}catch(e){toast('Failed: '+(e.code||e.message))}};
$('#fl').onclick=()=>{const ln=c=>`${c.caseNo} | ${c.model} | IMEI ${c.imei||'-'}${c.swapRef?' | ref '+c.swapRef:''}${c.sentAt?' | sent '+c.sentAt:''}`,sn=cases.filter(c=>c.status==='swap_sent'),td=cases.filter(c=>c.status==='swap_todo');
 const t=`AT FACTORY, WAITING FOR SWAP (${sn.length})\n`+sn.map(ln).join('\n')+`\n\nTO SEND (${td.length})\n`+td.map(ln).join('\n');
 open_(`<div class="top"><h1>Factory list</h1><span class="sp"></span><button onclick="shut()">Close ✕</button></div><textarea readonly style="min-height:300px">${esc(t)}</textarea><div class="row"><button class="pri" onclick="try{navigator.clipboard.writeText(document.querySelector('#md textarea').value).then(()=>toast('Copied'),()=>toast('Select the text and copy'))}catch(e){toast('Select the text and copy')}">Copy</button></div>`)};
function audit(a,t,d){if(!db||!uid)return;try{db.doc('audit/a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)).set({at:Date.now(),uid:String(uid),who:(roles[uid]&&roles[uid].label)||(owner?'owner':''),role:role(),action:a,target:t||'',detail:d||''}).catch(()=>{})}catch(e){}}
$('#aud').onclick=()=>{open_(`<div class="top"><h1>Audit log</h1><span class="sp"></span><button onclick="shut()">Close ✕</button></div><input id="aq" placeholder="Filter by user, action or case…" style="margin:8px 0"><div id="al" class="mu">Loading…</div>`);
 let rows=[];const draw=()=>{const q=val('aq').toLowerCase(),r=rows.filter(x=>!q||Object.values(x).join(' ').toLowerCase().includes(q));$('#al').innerHTML=r.length?tbl(['Time','User','Role','Action','Case','Detail'],r.map(x=>`<tr><td>${esc(new Date(x.at).toLocaleString())}</td><td>${esc(x.who||String(x.uid).slice(-6))}</td><td>${esc(x.role)}</td><td>${esc(x.action)}</td><td>${esc(x.target)}</td><td>${esc(x.detail)}</td></tr>`).join('')):'No entries.'};
 $('#aq').oninput=draw;if(auditUn)auditUn();
 auditUn=db.collection('audit').orderBy('at','desc').limit(200).onSnapshot(s=>{rows=s.docs.map(d=>d.data());draw()},()=>{$('#al').textContent='Not allowed to read the audit log.'})};
const ask=m=>new Promise(res=>{const o=document.createElement('div');o.className='ov on';o.style.zIndex=25;o.innerHTML=`<div class="md" style="max-width:420px;margin-top:20vh;min-height:0;border-radius:12px"><p>${esc(m)}</p><div class="row"><button class="pri" id="ay">OK</button><button id="an">Cancel</button></div></div>`;document.body.appendChild(o);const f=v=>{o.remove();res(v)};o.querySelector('#ay').onclick=()=>f(true);o.querySelector('#an').onclick=()=>f(false)});
const WL=v=>v==='out'?'Out of warranty':v==='in'?'Under warranty':'Not specified';
function wbox(c){
 const cw=c.warranty||'',log=c.warrantyLog||[],ok=can.ws()&&['waiting','repairing','repaired','swap_todo','swap_sent','swap_done'].includes(c.status);
 return `<div class="box"><h2>🛡 <span>Warranty status</span></h2><div>${wp(c)}</div>${ok?`<div class="g2"><div><label>Change to</label><select id="w_n"><option value="in"${cw==='in'?' selected':''}>Under warranty</option><option value="out"${cw==='out'?' selected':''}>Out of warranty</option></select></div><div><label>Reason (required)</label><input id="w_r"></div></div><div class="row"><button onclick="setWarranty()">Update warranty</button></div>`:''}${log.length?`<div class="hist" style="margin-top:8px">${log.map(l=>`<div>${esc(l.at)} · <span>${WL(l.from)}</span> → <span>${WL(l.to)}</span> · ${esc(l.by)} · ${esc(l.reason)}</div>`).join('')}</div>`:''}</div>`}
async function setWarranty(){
 const c=cur,n=val('w_n'),r=val('w_r');if(!can.ws())return toast('Not allowed');
 if(n===(c.warranty||''))return toast('Warranty status unchanged');if(!r)return toast('Enter the reason for the change');
 if(n==='in'&&paidOf(c.id)>0)return toast('Payments already recorded: cannot switch back to under warranty');
 const d={from:c.warranty||'',to:n,reason:r,at:today(),by:me(),role:role()};
 if(await run({warranty:n,warrantyLog:[...(c.warrantyLog||[]),d]},'warranty changed to '+(n==='out'?'out of warranty':'under warranty')+': '+r,1))refresh()}
function payBox(c){
 if(!can.money()||c.warranty!=='out')return '';
 const ch=tot(c),pd=paidOf(c.id),bal=due(c),cp=pays.filter(p=>p.caseId===c.id).sort((a,b)=>(b.at||0)-(a.at||0)),k=pst(c);
 return `<div class="box"><h2>💵 Payment (cash)</h2><div class="g2"><div><label style="margin-top:0">Price charged</label><input id="e_ch" type="number" min="0" step="0.01" value="${c.charge||''}"></div><div style="display:flex;align-items:flex-end"><button onclick="saveCharge()">Save price</button></div></div>
${c.partsTotal?`<div class="mu" style="margin-top:6px">🔩 <span>Parts</span>: ${money(c.partsTotal)}</div>`:''}<div style="margin-top:8px"><span class="pill ${k==='nocharge'?'':k}">${PL[k]}</span> <span>Paid</span> <b>${money(pd)}</b> <span>of</span> ${money(ch)} · <span>Balance</span> <b class="${bal>0?'slow':''}">${money(bal)}</b></div>
${can.pay()&&bal>0?`<div class="g2"><div><label>Amount received (cash)</label><input id="e_pa" type="number" min="0" step="0.01" value="${bal}"></div><div><label>Note</label><input id="e_pn"></div></div>${(()=>{const k=cliOf(c),b=k?cbal(k.id):0;return b>0?`<label>Pay from</label><select id="e_src"><option value="cash">Cash</option><option value="account">Client account (${money(b)})</option></select>`:''})()}<div class="row"><button class="pri" onclick="recv()">Receive cash payment</button></div>`:''}
${cp.length?`<div class="hist" style="margin-top:8px">${cp.map(p=>`<div>${esc(p.date)} · ${money(p.amount)} · ${esc(p.by)}${p.note?' · '+esc(p.note):''}</div>`).join('')}</div>`:''}</div>`}
const refresh=()=>setTimeout(()=>{if($('#ov').classList.contains('on')&&cur)detail(cur.id)},400);
async function saveCharge(){const v=parseFloat(val('e_ch'));if(isNaN(v)||v<0)return toast('Enter a valid price');if(await run({charge:v},'price set to '+money(v),1))refresh()}
async function takePay(items,note){try{await Promise.all(items.map(([c,a],i)=>db.doc('payments/p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)+i).set({caseId:c.id,caseNo:c.caseNo,customer:c.customer,phone:c.phone||'',ck:ck(c),amount:Math.round(a*100)/100,date:today(),by:role(),note:note||'',at:Date.now()})));audit('payment received',items.map(([c])=>c.caseNo).join(', '),money(items.reduce((t,[,a])=>t+a,0)));toast('Cash payment recorded');return true}catch(e){toast('Failed: '+(e.code||e.message));return false}}
async function recv(){const c=cur,a=parseFloat(val('e_pa')),d=due(c),src=val('e_src')||'cash';if(!(a>0))return toast('Enter the amount received');if(a>d+0.001)return toast('More than the balance due ('+money(d)+')');
 if(src==='account'){const k=cliOf(c);if(!k||a>cbal(k.id)+0.001)return toast('Not enough balance on the account');try{await payCase(c,a,'account',val('e_pn'),k);audit('payment from client account',c.caseNo,money(a));toast('Cash payment recorded');refresh()}catch(e){toast('Failed: '+(e.code||e.message))}return}
 if(await takePay([[c,a]],val('e_pn')))refresh()}
function pay(){
 if(!can.pay())return;
 const oc=cases.filter(c=>c.warranty==='out'),hold=oc.filter(c=>tot(c)>0&&due(c)>0).sort((a,b)=>(a.returnDate||a.openedAt).localeCompare(b.returnDate||b.openedAt)),nop=oc.filter(c=>!(tot(c)>0)&&c.status!=='archived').length;
 const pv=$('#pm').value,inP=pays.filter(p=>!pv||(p.date||'').startsWith(pv)),sum=a=>a.reduce((t,p)=>t+p.amount,0),onh=hold.reduce((t,c)=>t+due(c),0),L=(id,t)=>`<a href="#" data-id="${esc(id)}">${esc(t)}</a>`;
 const A={};oc.forEach(c=>{const k=ck(c),a=A[k]=A[k]||{k,n:'',ph:'',ch:0,pd:0,cs:0};a.ch+=tot(c);a.pd+=paidOf(c.id);a.cs++;a.n=c.customer;a.ph=c.phone});
 const ac=Object.values(A).map(a=>({...a,bal:Math.max(0,Math.round((a.ch-a.pd)*100)/100)})).sort((x,y)=>y.bal-x.bal),q=$('#pq').value.toLowerCase().trim();
 $('#pk').innerHTML=`<div class="kp"><div class="k"><b style="color:var(--ok)">${money(sum(pays))}</b><span>Total cash received from out-of-warranty repairs</span></div><div class="k"><b>${money(sum(inP))}</b><span>Received ${pv||'(all time)'}</span></div><div class="k"><b class="${onh?'slow':''}">${money(onh)}</b><span>On hold (owed)</span></div><div class="k"><b>${hold.length}</b><span>Cases with a balance due</span></div><div class="k"><b>${ac.filter(a=>a.bal>0).length}</b><span>Customers owing</span></div><div class="k"><b>${nop}</b><span>Out-of-warranty cases without a price</span></div></div>`;
 $('#ph').innerHTML=hold.length?tbl(['Case','Customer','Phone','Status','Charged','Paid','Balance','Days'],hold.map(c=>`<tr><td>${L(c.id,c.caseNo)}</td><td>${esc(c.customer)}</td><td>${esc(c.phone)}</td><td class="${['delivered','archived'].includes(c.status)?'slow':''}">${S[c.status]}</td><td>${money(tot(c))}</td><td>${money(paidOf(c.id))}</td><td class="slow">${money(due(c))}</td><td>${f1(age(c.returnDate||c.openedAt))}</td></tr>`).join('')):'<div class="mu">No payments on hold.</div>';
 const fa=ac.filter(a=>!q||(a.n+' '+a.ph).toLowerCase().includes(q)).slice(0,100);
 $('#pa').innerHTML=fa.length?tbl(['Customer','Phone','Cases','Charged','Paid','Balance'],fa.map(a=>`<tr data-acct="${esc(a.k)}" style="cursor:pointer"><td>${esc(a.n)}</td><td>${esc(a.ph)}</td><td>${a.cs}</td><td>${money(a.ch)}</td><td>${money(a.pd)}</td><td class="${a.bal?'slow':''}">${money(a.bal)}</td></tr>`).join('')):'<div class="mu">No customer accounts.</div>';
 const rp=[...inP].sort((a,b)=>(b.at||0)-(a.at||0)).slice(0,100);
 $('#pr').innerHTML=rp.length?tbl(['Date','Case','Customer','Amount','By','Note',''],rp.map(p=>`<tr><td>${esc(p.date)}</td><td>${L(p.caseId,p.caseNo)}</td><td>${esc(p.customer)}</td><td>${money(p.amount)}</td><td>${esc(p.by)}</td><td>${esc(p.note)}</td><td>${can.adm()?`<button class="dng" data-void="${esc(p.id)}">Void</button>`:''}</td></tr>`).join('')):'<div class="mu">No payments received in this period.</div>';
}
$('#pay').addEventListener('click',e=>{const v=e.target.closest('[data-void]'),a=e.target.closest('a[data-id]'),r=e.target.closest('tr[data-acct]');if(v)voidPay(v.dataset.void);else if(a){e.preventDefault();detail(a.dataset.id)}else if(r)acct(r.dataset.acct)});
$('#pay').addEventListener('input',e=>{if(e.target.id==='pq'||e.target.id==='pm')pay()});
$('#md').addEventListener('click',e=>{const a=e.target.closest('a[data-id]');if(a){e.preventDefault();detail(a.dataset.id)}});
async function voidPay(id){if(!(await ask('Void this payment record? The amount goes back on the customer balance.')))return;try{const p=pays.find(x=>x.id===id)||{};await db.doc('payments/'+id).delete();if(p.src==='account'&&p.clientId)await acxAdd('topup',p.clientId,p.amount,{note:'payment voided',caseId:p.caseId,caseNo:p.caseNo});audit('payment voided',p.caseNo,money(p.amount));toast('Payment voided')}catch(e){toast('Failed: '+(e.code||e.message))}}
function acct(k){
 const cs=cases.filter(c=>c.warranty==='out'&&ck(c)===k).sort((a,b)=>a.openedAt.localeCompare(b.openedAt));if(!cs.length)return;acctKey=k;
 const ids=new Set(cs.map(c=>c.id)),ps=pays.filter(p=>ids.has(p.caseId)).sort((a,b)=>(b.at||0)-(a.at||0)),ch=cs.reduce((t,c)=>t+tot(c),0),pd=cs.reduce((t,c)=>t+paidOf(c.id),0),bal=cs.reduce((t,c)=>t+due(c),0),L=c=>`<a href="#" data-id="${esc(c.id)}">${esc(c.caseNo)}</a>`;
 open_(`<div class="top"><h1>${esc(cs[cs.length-1].customer)}</h1><span class="sp"></span><button onclick="shut()">Close ✕</button></div><div class="mu">${esc(cs[0].phone||'no phone')}</div>
<div class="kp" style="margin-top:10px"><div class="k"><b>${money(ch)}</b><span>Charged</span></div><div class="k"><b style="color:var(--ok)">${money(pd)}</b><span>Paid</span></div><div class="k"><b class="${bal>0?'slow':''}">${money(bal)}</b><span>Balance on account</span></div></div>
${can.pay()&&bal>0?`<div class="box"><h2>Receive cash on account</h2><div class="g2"><input id="a_a" type="number" min="0" step="0.01" value="${bal}"><input id="a_n" placeholder="Note"></div><div class="mu" style="margin-top:6px">Applied to the oldest unpaid cases first.</div><div class="row"><button class="pri" onclick="acctPay()">Receive cash</button></div></div>`:''}
<div class="box"><h2>Cases</h2>${tbl(['Case','Device','Status','Charged','Paid','Balance'],cs.map(c=>`<tr><td>${L(c)}</td><td>${esc(c.model)}</td><td>${S[c.status]}</td><td>${money(tot(c))}</td><td>${money(paidOf(c.id))}</td><td class="${due(c)?'slow':''}">${money(due(c))}</td></tr>`).join(''))}</div>
<div class="box"><h2>Payments</h2>${ps.length?`<div class="hist">${ps.map(p=>`<div>${esc(p.date)} · ${money(p.amount)} · ${esc(p.caseNo)} · ${esc(p.by)}${p.note?' · '+esc(p.note):''}</div>`).join('')}</div>`:'<div class="mu">No payments yet.</div>'}</div>`)}
async function acctPay(){
 const cs=cases.filter(c=>c.warranty==='out'&&ck(c)===acctKey&&due(c)>0).sort((a,b)=>a.openedAt.localeCompare(b.openedAt));let a=parseFloat(val('a_a'));const tot=cs.reduce((t,c)=>t+due(c),0);
 if(!(a>0))return toast('Enter the amount received');if(a>tot+0.001)return toast('More than the balance ('+money(tot)+')');
 const items=[];for(const c of cs){if(a<=0.001)break;const x=Math.min(due(c),a);items.push([c,x]);a-=x}
 if(await takePay(items,val('a_n')))setTimeout(()=>acct(acctKey),400)}
async function del(){if(!(await ask('Delete this case permanently?')))return;try{const n=cur.caseNo;await db.doc('cases/'+cur.id).delete();audit('case deleted',n);shut()}catch(e){toast('Failed: '+(e.code||e.message))}}
$('#adm').onclick=()=>{open_(`<div class="top"><h1>Users &amp; roles</h1><span class="sp"></span><button onclick="shut()">Close ✕</button></div>
<div class="box mu">Anyone signed in without a role is a <b>guest</b> (view only). Type the person's Google email in the User ID field. Owners listed in firebase-config.js are always admin.</div>
<div class="box"><label style="margin-top:0">User ID</label><input id="u_i"><label>Name (label)</label><input id="u_n"><label>Role</label><select id="u_r"><option value="reception">Reception team</option><option value="technician">Repair technician</option><option value="manager">Manager</option><option value="cashier">Cashier</option><option value="admin">Admin</option><option value="blocked">Suspended (no access)</option></select><div class="row"><button class="pri" onclick="addRole()">Save role</button></div></div>
<div class="box"><b>Assigned</b>${Object.entries(roles).map(([k,v])=>`<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><span class="m"><div>${esc(v.label||'(no name)')} · <b>${esc(v.role)}</b></div><div class="mu">${esc(k)}</div></span><button class="dng" data-rm="${esc(k)}">Remove</button></div>`).join('')||'<div class="mu">None yet</div>'}</div>
<div class="mu" style="margin-top:12px">Your ID: ${esc(uid)}</div>`);
 $('#md').onclick=async e=>{const k=e.target.dataset&&e.target.dataset.rm;if(k){try{await db.doc('roles/'+k).delete();audit('role removed',k);$('#adm').click()}catch(x){toast('Failed')}}}};
async function addRole(){const i=val('u_i');if(!i)return;try{await db.doc('roles/'+i.toLowerCase()).set({role:$('#u_r').value,label:val('u_n')});audit('role assigned',i,$('#u_r').value);toast('Role saved');setTimeout(()=>$('#adm').click(),300)}catch(e){toast('Failed: '+(e.code||e.message))}}

const DICT={fr:{},ar:{}};`Repair Desk|Gestion des réparations|إدارة الإصلاحات
Dashboard|Tableau de bord|لوحة القيادة
Cases|Dossiers|الملفات
🔄 Swap|🔄 Échanges|🔄 الاستبدال
💵 Payments|💵 Paiements|💵 المدفوعات
Users|Utilisateurs|المستخدمون
Audit log|Journal d’audit|سجل التدقيق
+ New case|+ Nouveau dossier|+ ملف جديد
Language|Langue|اللغة
admin|admin|مدير النظام
technician|technicien|فني
manager|responsable|مسؤول
cashier|caissier|أمين الصندوق
guest|invité|زائر
blocked|suspendu|موقوف
Could not connect to the database. Check your Firebase settings.|Connexion à la base impossible. Vérifiez vos paramètres Firebase.|تعذّر الاتصال بقاعدة البيانات. تحقق من إعدادات Firebase.
🔒 No access|🔒 Aucun accès|🔒 لا يوجد وصول
Your account has no access to this dashboard (not added yet, or suspended). Contact the administrator.|Votre compte n’a pas accès (non ajouté ou suspendu). Contactez l’administrateur.|ليس لحسابك وصول إلى لوحة القيادة (لم يُضف بعد أو موقوف). اتصل بالمسؤول.
Search name, IMEI, model, case #…|Rechercher nom, IMEI, modèle, n° de dossier…|ابحث بالاسم أو IMEI أو الطراز أو رقم الملف…
All status|Tous les statuts|كل الحالات
Waiting for repair|En attente de réparation|بانتظار الإصلاح
In repair|En réparation|قيد الإصلاح
Ready for pickup|Prêt à retirer|جاهز للاستلام
Swap: to send|Échange : à envoyer|استبدال: للإرسال
Swap: at factory|Échange : en usine|استبدال: لدى المصنع
Swapped: ready for pickup|Échangé : prêt à retirer|تم الاستبدال: جاهز للاستلام
Delivered|Remis|تم التسليم
Archived|Archivé|مؤرشف
Received from|Reçu à partir du|الاستلام من
Received to|Reçu jusqu’au|الاستلام إلى
All|Tous|الكل
no photo|pas de photo|بلا صورة
Warranty|Sous garantie|ضمان
Under warranty|Sous garantie|تحت الضمان
Out of warranty|Hors garantie|خارج الضمان
Warranty ?|Garantie ?|الضمان ؟
Received, waiting for repair|Reçus, en attente de réparation|مستلمة بانتظار الإصلاح
Still in repair|Toujours en réparation|ما زالت قيد الإصلاح
Repaired, not yet received by customer|Réparés, pas encore retirés|تم إصلاحها ولم يستلمها الزبون
Month|Mois|الشهر
Phones received|Téléphones reçus|الهواتف المستلمة
Avg repair time (start → repaired)|Durée moy. de réparation|متوسط مدة الإصلاح
Avg wait before repair starts|Attente moy. avant réparation|متوسط الانتظار قبل الإصلاح
Avg turnaround (received → returned)|Délai moyen (reçu → rendu)|متوسط المدة الكلية
Avg days waiting for pickup|Jours moy. avant retrait|متوسط أيام انتظار الاستلام
Under / out of warranty received|Reçus sous / hors garantie|المستلمة تحت / خارج الضمان
Cash received this month|Espèces encaissées ce mois|النقد المقبوض هذا الشهر
Phones received per month|Téléphones reçus par mois|الهواتف المستلمة شهريًا
Needs attention|À surveiller|يتطلب الاهتمام
Waiting over 3 days to start:|En attente depuis plus de 3 jours :|بانتظار البدء أكثر من 3 أيام:
Ready over 3 days, not picked up:|Prêts depuis plus de 3 jours, non retirés :|جاهزة منذ أكثر من 3 أيام ولم تُستلم:
By technician (finished this month)|Par technicien (terminés ce mois)|حسب الفني (المنتهية هذا الشهر)
Technician|Technicien|الفني
Repairs|Réparations|الإصلاحات
Success|Réussite|النجاح
Avg repair|Réparation moy.|متوسط الإصلاح
No finished repairs|Aucune réparation terminée|لا توجد إصلاحات منتهية
Time per repair|Durée par réparation|مدة كل إصلاح
Case|Dossier|الملف
Device|Appareil|الجهاز
Result|Résultat|النتيجة
Wait|Attente|الانتظار
Repair|Réparation|الإصلاح
Total|Total|المجموع
✓ repaired|✓ réparé|✓ تم الإصلاح
✗ unrepairable|✗ irréparable|✗ لا يمكن إصلاحه
New case|Nouveau dossier|ملف جديد
Cancel|Annuler|إلغاء
OK|OK|موافق
Customer name *|Nom du client *|اسم الزبون *
Customer phone|Téléphone du client|هاتف الزبون
Date received|Date de réception|تاريخ الاستلام
Type|Type|النوع
Phone|Téléphone|هاتف
Tablet|Tablette|لوحي
Brand / model *|Marque / modèle *|العلامة / الطراز *
Warranty status * (set by the technician)|Statut de garantie * (défini par le technicien)|حالة الضمان * (يحددها الفني)
Select…|Choisir…|اختر…
IMEI / serial|IMEI / n° de série|IMEI / الرقم التسلسلي
Problem *|Problème *|العطل *
Photo of device|Photo de l’appareil|صورة الجهاز
Open case file|Ouvrir le dossier|فتح الملف
Name, model, problem and warranty status are required|Nom, modèle, problème et garantie obligatoires|الاسم والطراز والعطل وحالة الضمان إلزامية
Close ✕|Fermer ✕|إغلاق ✕
Problem:|Problème :|العطل:
IMEI / serial:|IMEI / n° de série :|IMEI / الرقم التسلسلي:
Received|Reçu le|استُلم
Started|Début|بدأ
Repaired|Réparé|أُصلح
Returned|Rendu|سُلّم
success|réussi|نجح
unrepairable|irréparable|لا يُصلح
Reason:|Motif :|السبب:
Assigned|Assigné|أُسند
Sent|Envoyé|أُرسل
Swapped|Échangé|استُبدل
Repair information|Informations de réparation|معلومات الإصلاح
Parts used|Pièces utilisées|القطع المستعملة
Cost|Coût|التكلفة
Warranty status|Statut de garantie|حالة الضمان
Not specified|Non précisé|غير محدد
Return date to customer|Date de remise au client|تاريخ التسليم للزبون
Swap reason (to move to swap list)|Motif d’échange|سبب الاستبدال
Factory shipment / RMA ref|Réf. d’expédition / RMA|مرجع الشحن / RMA
New phone model|Modèle du nouveau téléphone|طراز الهاتف الجديد
New phone IMEI|IMEI du nouveau téléphone|IMEI الهاتف الجديد
Save notes|Enregistrer les notes|حفظ الملاحظات
Start repair|Démarrer la réparation|بدء الإصلاح
Mark repaired ✓|Marquer réparé ✓|تم الإصلاح ✓
Unrepairable|Irréparable|لا يمكن إصلاحه
Return to customer|Rendre au client|تسليم للزبون
Archive|Archiver|أرشفة
Unarchive|Désarchiver|إلغاء الأرشفة
Reopen|Rouvrir|إعادة الفتح
Delete|Supprimer|حذف
Move to swap list|Passer en échange|نقل إلى الاستبدال
Mark sent to factory|Marquer envoyé à l’usine|تم الإرسال للمصنع
Back to repair|Retour en réparation|العودة للإصلاح
Replacement received|Remplacement reçu|تم استلام البديل
Save new phone|Enregistrer le nouveau téléphone|حفظ الهاتف الجديد
History|Historique|السجل
🔄 Swap case|🔄 Dossier d’échange|🔄 ملف استبدال
Old phone|Ancien téléphone|الهاتف القديم
New phone|Nouveau téléphone|الهاتف الجديد
💵 Payment (cash)|💵 Paiement (espèces)|💵 الدفع (نقدًا)
Price charged|Prix facturé|السعر المطلوب
Save price|Enregistrer le prix|حفظ السعر
Amount received (cash)|Montant reçu (espèces)|المبلغ المقبوض (نقدًا)
Note|Note|ملاحظة
Receive cash payment|Encaisser le paiement|قبض الدفعة
Paid|Payé|مدفوع
Partial|Partiel|جزئي
On hold|En attente|معلّق
No price|Sans prix|بلا سعر
of|sur|من
Balance|Solde|الرصيد
Need to be sent to factory|À envoyer à l’usine|بحاجة للإرسال إلى المصنع
Sent, waiting for swap|Envoyés, en attente d’échange|مرسلة بانتظار الاستبدال
Already swapped|Déjà échangés|تم استبدالها
Avg time at factory|Durée moy. en usine|متوسط المدة لدى المصنع
1 · Need to be sent to factory|1 · À envoyer à l’usine|1 · بحاجة للإرسال إلى المصنع
2 · Sent, waiting for swap|2 · Envoyés, en attente|2 · مرسلة بانتظار الاستبدال
3 · Already swapped|3 · Déjà échangés|3 · تم استبدالها
Shipment / RMA ref|Réf. d’expédition / RMA|مرجع الشحن / RMA
Mark selected as sent|Marquer la sélection envoyée|تأكيد إرسال المحدد
Factory list|Liste usine|قائمة المصنع
Copy|Copier|نسخ
Customer|Client|الزبون
Reason|Motif|السبب
Waiting|Attente|الانتظار
At factory|En usine|لدى المصنع
Ref|Réf.|المرجع
Status|Statut|الحالة
Nothing waiting to be sent.|Rien à envoyer.|لا شيء بانتظار الإرسال.
No phones at the factory.|Aucun téléphone en usine.|لا توجد هواتف لدى المصنع.
No swaps completed yet.|Aucun échange terminé.|لا توجد عمليات استبدال مكتملة.
Total cash received from out-of-warranty repairs|Total encaissé (hors garantie)|إجمالي النقد المقبوض (خارج الضمان)
On hold (owed)|En attente (dû)|معلّق (مستحق)
Cases with a balance due|Dossiers avec solde dû|ملفات برصيد مستحق
Customers owing|Clients débiteurs|زبائن عليهم مبالغ
Out-of-warranty cases without a price|Dossiers hors garantie sans prix|ملفات خارج الضمان بلا سعر
1 · Payments on hold (balance owed)|1 · Paiements en attente (solde dû)|1 · مدفوعات معلّقة (رصيد مستحق)
2 · Customer accounts|2 · Comptes clients|2 · حسابات الزبائن
Search customer or phone…|Rechercher client ou téléphone…|ابحث عن زبون أو هاتف…
3 · Received payments|3 · Paiements reçus|3 · المدفوعات المقبوضة
Charged|Facturé|المطلوب
Days|Jours|الأيام
Date|Date|التاريخ
Amount|Montant|المبلغ
By|Par|بواسطة
Void|Annuler|إلغاء الدفعة
No payments on hold.|Aucun paiement en attente.|لا توجد مدفوعات معلّقة.
No customer accounts.|Aucun compte client.|لا توجد حسابات زبائن.
No payments received in this period.|Aucun paiement sur cette période.|لا توجد مدفوعات في هذه الفترة.
Receive cash on account|Encaisser sur le compte|قبض نقد على الحساب
Receive cash|Encaisser|قبض النقد
Balance on account|Solde du compte|رصيد الحساب
Payments|Paiements|المدفوعات
No payments yet.|Aucun paiement.|لا توجد مدفوعات بعد.
Users & roles|Utilisateurs et rôles|المستخدمون والأدوار
User ID|ID utilisateur|معرّف المستخدم
Name (label)|Nom (libellé)|الاسم
Role|Rôle|الدور
Repair technician|Technicien de réparation|فني الإصلاح
Manager|Responsable|مسؤول
Cashier|Caissier|أمين الصندوق
Admin|Administrateur|مدير النظام
Suspended (no access)|Suspendu (aucun accès)|موقوف (بلا وصول)
Save role|Enregistrer le rôle|حفظ الدور
Remove|Retirer|إزالة
None yet|Aucun pour l’instant|لا أحد بعد
Filter by user, action or case…|Filtrer par utilisateur, action ou dossier…|تصفية حسب المستخدم أو الإجراء أو الملف…
Time|Heure|الوقت
User|Utilisateur|المستخدم
Action|Action|الإجراء
Detail|Détail|التفاصيل
Loading…|Chargement…|جارٍ التحميل…
No entries.|Aucune entrée.|لا توجد إدخالات.
Delete this case permanently?|Supprimer ce dossier définitivement ?|حذف هذا الملف نهائيًا؟
Void this payment record? The amount goes back on the customer balance.|Annuler ce paiement ? Le montant revient sur le solde du client.|إلغاء هذه الدفعة؟ سيعود المبلغ إلى رصيد الزبون.
Saved|Enregistré|تم الحفظ
Copied|Copié|تم النسخ
Not allowed|Non autorisé|غير مسموح
Enter the return date|Saisissez la date de remise|أدخل تاريخ التسليم
Enter a valid price|Saisissez un prix valide|أدخل سعرًا صحيحًا
Enter the amount received|Saisissez le montant reçu|أدخل المبلغ المقبوض
Cash payment recorded|Paiement en espèces enregistré|تم تسجيل الدفعة النقدية
Payment voided|Paiement annulé|تم إلغاء الدفعة
Role saved|Rôle enregistré|تم حفظ الدور
Tick the phones to send first|Cochez d’abord les téléphones à envoyer|حدّد الهواتف المراد إرسالها أولًا
Enter the new phone model|Saisissez le modèle du nouveau téléphone|أدخل طراز الهاتف الجديد
Failed|Échec|فشل
Not allowed or failed|Non autorisé ou échec|غير مسموح أو فشل
Could not save|Enregistrement impossible|تعذّر الحفظ
Database error|Erreur de base de données|خطأ في قاعدة البيانات
Reception team|Équipe réception|فريق الاستقبال
reception|réception|الاستقبال
At reception|À la réception|لدى الاستقبال
In transit → workshop|En transit → atelier|في الطريق ← الورشة
At workshop|À l’atelier|في الورشة
In transit → reception|En transit → réception|في الطريق ← الاستقبال
With customer|Chez le client|عند الزبون
All locations|Toutes les localisations|كل المواقع
Where are the items?|Où sont les appareils ?|أين الأجهزة؟
Possibly missing (not acknowledged for over 24 h):|Peut-être manquants (non confirmés depuis plus de 24 h) :|ربما مفقودة (لم تُؤكَّد منذ أكثر من 24 ساعة):
No unacknowledged handovers over 24 h|Aucun transfert non confirmé depuis plus de 24 h|لا توجد عمليات تسليم غير مؤكدة لأكثر من 24 ساعة
Tracking|Suivi|التتبع
No tracking events yet (older case).|Aucun événement de suivi (ancien dossier).|لا توجد أحداث تتبع (ملف قديم).
Reception photo|Photo à la réception|صورة الاستقبال
After-repair photo|Photo après réparation|صورة بعد الإصلاح
Photo after repair (required to finish)|Photo après réparation (obligatoire pour terminer)|صورة بعد الإصلاح (إلزامية للإنهاء)
Customer email|E-mail du client|بريد الزبون
Photo of device (required)|Photo de l’appareil (obligatoire)|صورة الجهاز (إلزامية)
Reception photo is required|La photo de réception est obligatoire|صورة الاستقبال إلزامية
Upload the after-repair photo first|Ajoutez d’abord la photo après réparation|ارفع صورة ما بعد الإصلاح أولًا
Send to workshop|Envoyer à l’atelier|إرسال إلى الورشة
Confirm received in workshop|Confirmer la réception à l’atelier|تأكيد الاستلام في الورشة
Hand over to reception|Remettre à la réception|تسليم إلى الاستقبال
Confirm received at reception|Confirmer la réception à l’accueil|تأكيد الاستلام لدى الاستقبال
🔎 Track an item: customer name, phone or IMEI…|🔎 Suivre un appareil : nom, téléphone ou IMEI…|🔎 تتبّع جهازًا: الاسم أو الهاتف أو IMEI…
Received at reception|Reçu à la réception|استُلم لدى الاستقبال
Sent to workshop|Envoyé à l’atelier|أُرسل إلى الورشة
Received in workshop|Reçu à l’atelier|استُلم في الورشة
Repair started|Réparation commencée|بدأ الإصلاح
Declared unrepairable|Déclaré irréparable|أُعلن أنه لا يُصلح
Handed to reception|Remis à la réception|سُلّم إلى الاستقبال
Received back at reception|Reçu de retour à la réception|استُلم عائدًا لدى الاستقبال
Returned to customer|Rendu au client|سُلّم للزبون
Under warranty by default; the repair team can change it.|Sous garantie par défaut ; l’équipe de réparation peut la modifier.|ضمن الضمان افتراضيًا؛ يمكن لفريق الإصلاح تغييره.
Change to|Changer en|تغيير إلى
Reason (required)|Motif (obligatoire)|السبب (إلزامي)
Update warranty|Mettre à jour la garantie|تحديث الضمان
Warranty status unchanged|Statut de garantie inchangé|حالة الضمان لم تتغير
Enter the reason for the change|Saisissez le motif du changement|أدخل سبب التغيير
Payments already recorded: cannot switch back to under warranty|Paiements déjà enregistrés : retour sous garantie impossible|توجد مدفوعات مسجلة: لا يمكن الرجوع إلى تحت الضمان
Name, model and problem are required|Nom, modèle et problème obligatoires|الاسم والطراز والعطل إلزامية
Take photo|Prendre une photo|التقاط صورة
Choose from gallery|Choisir dans la galerie|اختيار من المعرض
Could not read the photo|Impossible de lire la photo|تعذّرت قراءة الصورة
Mobile repair workshop|Atelier de réparation mobile|ورشة إصلاح الهواتف
Sign out|Déconnexion|تسجيل الخروج
Scan|Scanner|مسح
Scan IMEI|Scanner l’IMEI|مسح IMEI
Scan from a photo|Scanner depuis une photo|مسح من صورة
Point the camera at the barcode|Pointez la caméra vers le code-barres|وجّه الكاميرا نحو الرمز الشريطي
No barcode found in the photo. Try again closer.|Aucun code-barres trouvé. Réessayez de plus près.|لم يُعثر على رمز شريطي. أعد المحاولة عن قرب.
Scanner unavailable (no internet?)|Scanner indisponible (pas d’internet ?)|الماسح غير متاح (لا اتصال؟)
Cannot start the camera. Use "Scan from a photo" or type it.|Caméra indisponible. Utilisez « Scanner depuis une photo » ou saisissez.|تعذّر تشغيل الكاميرا. استخدم «مسح من صورة» أو اكتبه.
Send back to workshop|Renvoyer à l’atelier|إعادة إلى الورشة
📦 Inventory|📦 Stock|📦 المخزون
Incoming parts value|Valeur des pièces reçues|قيمة القطع الواردة
Incoming parts quantity|Quantité de pièces reçues|كمية القطع الواردة
In stock (good)|En stock (bon état)|في المخزون (سليمة)
In stock value|Valeur du stock|قيمة المخزون
Defective (to send back)|Défectueuses (à renvoyer)|معيبة (للإرجاع)
Consumed in repairs|Consommées en réparation|المستهلكة في الإصلاح
Sent to main warehouse|Envoyées à l’entrepôt principal|أُرسلت إلى المستودع الرئيسي
+ New receiving note|+ Nouveau bon de réception|+ إشعار استلام جديد
Add line|Ajouter une ligne|إضافة سطر
Confirm & close note|Confirmer et clôturer le bon|تأكيد وإغلاق الإشعار
Delete draft|Supprimer le brouillon|حذف المسودة
Delete draft?|Supprimer le brouillon ?|حذف المسودة؟
Mark defective|Marquer défectueuse|تحديد كمعيبة
Send to main warehouse|Envoyer à l’entrepôt principal|إرسال إلى المستودع الرئيسي
Use part|Utiliser la pièce|استخدام القطعة
Return as defective|Retourner comme défectueuse|إرجاع كمعيبة
1 · Receiving notes|1 · Bons de réception|1 · إشعارات الاستلام
2 · Parts in stock|2 · Pièces en stock|2 · القطع في المخزون
Movements|Mouvements|الحركات
Part|Pièce|القطعة
Unit price|Prix unitaire|سعر الوحدة
Qty received|Qté reçue|الكمية المستلمة
Good|Bon état|سليمة
Defective|Défectueuse|معيبة
Consumed|Consommée|مستهلكة
Sent back|Renvoyée|أُعيدت
Lines|Lignes|الأسطر
Value|Valeur|القيمة
Quantity|Quantité|الكمية
Parts|Pièces|القطع
Draft|Brouillon|مسودة
Confirmed|Confirmé|مؤكد
All parts|Toutes les pièces|كل القطع
Good in stock|Bon état en stock|سليمة في المخزون
Sent to warehouse|Envoyées à l’entrepôt|أُرسلت للمستودع
Search part or note…|Rechercher pièce ou bon…|ابحث عن قطعة أو إشعار…
Part name|Nom de la pièce|اسم القطعة
Select a part…|Choisir une pièce…|اختر قطعة…
Reference (optional)|Référence (facultatif)|مرجع (اختياري)
No receiving notes yet.|Aucun bon de réception.|لا توجد إشعارات استلام.
No parts in stock.|Aucune pièce en stock.|لا توجد قطع في المخزون.
No movements yet.|Aucun mouvement.|لا توجد حركات.
No parts used.|Aucune pièce utilisée.|لا توجد قطع مستخدمة.
No lines yet.|Aucune ligne.|لا توجد أسطر.
Returned from repair as defective|Retournée de réparation (défectueuse)|أُرجعت من الإصلاح كمعيبة
Part name, quantity and price are required|Nom, quantité et prix obligatoires|الاسم والكمية والسعر إلزامية
Add at least one line first|Ajoutez d’abord au moins une ligne|أضف سطرًا واحدًا على الأقل
Receiving note confirmed: parts added to stock|Bon confirmé : pièces ajoutées au stock|تم تأكيد الإشعار: أُضيفت القطع إلى المخزون
Select a part|Choisissez une pièce|اختر قطعة
Parts are only used on out-of-warranty repairs|Pièces utilisées uniquement hors garantie|تُستخدم القطع فقط في الإصلاحات خارج الضمان
Part added to the repair price|Pièce ajoutée au prix de la réparation|أُضيفت القطعة إلى سعر الإصلاح
Part returned as defective|Pièce retournée comme défectueuse|أُرجعت القطعة كمعيبة
Marked defective|Marquée défectueuse|تم تحديدها كمعيبة
Sent to the main warehouse|Envoyée à l’entrepôt principal|أُرسلت إلى المستودع الرئيسي
Enter a valid quantity|Saisissez une quantité valide|أدخل كمية صحيحة
Not enough defective parts|Pas assez de pièces défectueuses|لا توجد قطع معيبة كافية
👥 Clients|👥 Clients|👥 العملاء
+ New client|+ Nouveau client|+ عميل جديد
Import from cases|Importer depuis les dossiers|استيراد من الملفات
Search client name or phone…|Rechercher nom ou téléphone du client…|ابحث باسم العميل أو هاتفه…
Clients|Clients|العملاء
Client|Client|العميل
In progress|En cours|قيد المعالجة
Owed|Dû|المستحق
Total owed|Total dû|إجمالي المستحق
Account balance|Solde du compte|رصيد الحساب
Prepaid balance (all clients)|Solde prépayé (tous les clients)|الرصيد المسبق (كل العملاء)
Name *|Nom *|الاسم *
Email|E-mail|البريد الإلكتروني
Notes|Notes|ملاحظات
Edit|Modifier|تعديل
Save|Enregistrer|حفظ
Save as a client|Enregistrer comme client|حفظ كعميل
Settled|Réglé|مسدَّد
Top up account|Créditer le compte|شحن الحساب
Top up|Créditer|شحن
Pay a case|Payer un dossier|دفع ملف
Select a case…|Choisir un dossier…|اختر ملفًا…
Record payment|Enregistrer le paiement|تسجيل الدفعة
Withdraw from account|Retirer du compte|سحب من الحساب
Account history|Historique du compte|سجل الحساب
Top-up|Crédit|شحن
Withdrawal|Retrait|سحب
Paid from account|Payé depuis le compte|مدفوع من الحساب
Cash payment|Paiement en espèces|دفعة نقدية
Pay from|Payer avec|الدفع من
Cash|Espèces|نقدًا
No clients yet.|Aucun client.|لا يوجد عملاء.
No history yet.|Aucun historique.|لا يوجد سجل.
No cases yet.|Aucun dossier.|لا توجد ملفات.
Client name is required|Le nom du client est obligatoire|اسم العميل مطلوب
A client with this phone already exists|Un client avec ce téléphone existe déjà|يوجد عميل بهذا الهاتف
Enter a valid amount|Saisissez un montant valide|أدخل مبلغًا صحيحًا
Not enough balance on the account|Solde du compte insuffisant|رصيد الحساب غير كافٍ
Select a case|Choisissez un dossier|اختر ملفًا
Clients imported|Clients importés|تم استيراد العملاء
Nothing to import|Rien à importer|لا شيء للاستيراد
Client saved|Client enregistré|تم حفظ العميل
Account updated|Compte mis à jour|تم تحديث الحساب
The phone is not in the workshop|Le téléphone n’est pas à l’atelier|الهاتف ليس في الورشة
Phone is with reception: resend it to the workshop first.|Le téléphone est à la réception : renvoyez-le d’abord à l’atelier.|الهاتف لدى الاستقبال: أعده أولًا إلى الورشة.
Settings|Paramètres|الإعدادات
My appearance|Mon apparence|مظهري
Theme|Thème|السمة
System|Système|النظام
Light|Clair|فاتح
Dark|Sombre|داكن
Accent color|Couleur d’accent|لون التمييز
Density|Densité|الكثافة
Comfortable|Confortable|مريحة
Compact|Compacte|مضغوطة
Animations|Animations|الحركات
On|Activées|مفعّلة
Off|Désactivées|معطّلة
Language|Langue|اللغة
My dashboard|Mon tableau de bord|لوحتي
Workshop settings (admin)|Paramètres de l’atelier (admin)|إعدادات الورشة (مدير)
Waiting too long: days|Attente trop longue : jours|انتظار طويل: أيام
Ready for pickup too long: days|Prêt non retiré trop longtemps : jours|جاهز دون استلام لمدة طويلة: أيام
Handover not acknowledged: hours|Transfert non confirmé : heures|تسليم غير مؤكد: ساعات
At factory too long: days|En usine trop longtemps : jours|لدى المصنع لمدة طويلة: أيام
Low stock: units or fewer|Stock bas : unités ou moins|مخزون منخفض: وحدات أو أقل
Currency (shown after amounts)|Devise (après les montants)|العملة (بعد المبالغ)
Shop name (header)|Nom de l’atelier (en-tête)|اسم الورشة (الترويسة)
Notice for all staff (shown on every dashboard)|Message pour tout le personnel (sur chaque tableau de bord)|إشعار لكل الموظفين (يظهر في كل لوحة)
Save settings|Enregistrer les paramètres|حفظ الإعدادات
Settings saved|Paramètres enregistrés|تم حفظ الإعدادات
Alerts and notices|Alertes et avis|التنبيهات والإشعارات
✓ Nothing urgent right now.|✓ Rien d’urgent pour le moment.|✓ لا شيء عاجل الآن.
Phones by stage|Téléphones par étape|الهواتف حسب المرحلة
Money overview|Vue d’ensemble financière|نظرة مالية
Inventory snapshot|Aperçu du stock|لمحة عن المخزون
Detailed numbers|Chiffres détaillés|الأرقام التفصيلية
Collected|Encaissé|المحصّل
repairs finished|réparations terminées|إصلاحات منتهية
Swap|Échange|استبدال
Could not display this view.|Affichage impossible.|تعذّر عرض هذه الصفحة.
Reload|Recharger|إعادة تحميل
Connecting…|Connexion…|جارٍ الاتصال…
● Live|● En direct|● مباشر
⚠ Offline|⚠ Hors ligne|⚠ غير متصل
Handovers not acknowledged in time: check for missing items|Transferts non confirmés à temps : vérifiez les articles manquants|تسليمات لم تؤكَّد في الوقت: تحقق من القطع المفقودة
Phones returned by the workshop: confirm you received them|Téléphones rendus par l’atelier : confirmez la réception|هواتف أعادتها الورشة: أكّد استلامها
Repaired phones ready for customer pickup|Téléphones réparés prêts à être retirés|هواتف مُصلحة جاهزة لاستلام الزبون
Phones sent to the workshop, waiting for their confirmation|Téléphones envoyés à l’atelier, en attente de confirmation|هواتف أُرسلت إلى الورشة بانتظار تأكيدها
Phones to confirm as received in the workshop|Téléphones à confirmer comme reçus à l’atelier|هواتف يجب تأكيد استلامها في الورشة
Phones waiting too long to start repair|Téléphones en attente trop longtemps|هواتف تنتظر بدء الإصلاح لفترة طويلة
Repaired phones to hand over to reception|Téléphones réparés à remettre à la réception|هواتف مُصلحة لتسليمها للاستقبال
Returned phones with an unpaid balance|Téléphones rendus avec solde impayé|هواتف مُسلَّمة برصيد غير مدفوع
Phones to send to the factory|Téléphones à envoyer à l’usine|هواتف للإرسال إلى المصنع
Swap phones at the factory for too long|Téléphones en échange en usine depuis trop longtemps|هواتف استبدال لدى المصنع لفترة طويلة
Defective parts to send back to the main warehouse|Pièces défectueuses à renvoyer à l’entrepôt principal|قطع معيبة للإرجاع إلى المستودع الرئيسي
Parts running low in stock|Pièces en stock bas|قطع مخزونها منخفض`.split('\n').forEach(l=>{const [e,f,a]=l.split('|');DICT.fr[e]=f;DICT.ar[e]=a});
const PAT=[[/^Client account \((.+)\)$/,(m,l)=>(l==='fr'?'Compte client (':'حساب العميل (')+m[1]+')'],[/^👤 Linked to client: (.+)$/,(m,l)=>(l==='fr'?'👤 Lié au client : ':'👤 مرتبط بالعميل: ')+m[1]],[/^Only (\d+) in stock$/,(m,l)=>l==='fr'?'Seulement '+m[1]+' en stock':'المتوفر '+m[1]+' فقط'],[/^([\d.]+) d$/,(m,l)=>m[1]+' '+(l==='fr'?'j':'ي')],
[/^(Under warranty|Out of warranty) \((\d+)\)$/,(m,l)=>DICT[l][m[1]]+' ('+m[2]+')'],
[/^(\d+) of (\d+) cases$/,(m,l)=>l==='fr'?m[1]+' sur '+m[2]+' dossiers':m[1]+' من '+m[2]+' ملف'],
[/^Repair success rate \((\d+)\/(\d+) finished\)$/,(m,l)=>l==='fr'?`Taux de réussite (${m[1]}/${m[2]} terminés)`:`نسبة نجاح الإصلاح (${m[1]}/${m[2]} منتهية)`],
[/^Sent to swap \((\d+)%\)$/,(m,l)=>(l==='fr'?'Envoyés en échange (':'أُرسلت للاستبدال (')+m[1]+'%)'],
[/^Received (\d{4}-\d{2}|\(all time\))$/,(m,l)=>(l==='fr'?'Encaissé ':'المقبوض ')+(m[1][0]==='('?(l==='fr'?'(total)':'(الكل)'):m[1])],
[/^Waiting over (\d+) days to start:$/,(m,l)=>l==='fr'?`En attente depuis plus de ${m[1]} jours :`:`بانتظار البدء أكثر من ${m[1]} أيام:`],[/^Ready over (\d+) days, not picked up:$/,(m,l)=>l==='fr'?`Prêts depuis plus de ${m[1]} jours, non retirés :`:`جاهزة منذ أكثر من ${m[1]} أيام ولم تُستلم:`],[/^Possibly missing \(not acknowledged for over (\d+) h\):$/,(m,l)=>l==='fr'?`Peut-être manquants (non confirmés depuis plus de ${m[1]} h) :`:`ربما مفقودة (لم تُؤكَّد منذ أكثر من ${m[1]} ساعة):`],[/^At factory over (\d+) days(.*)$/,(m,l)=>(l==='fr'?`En usine depuis plus de ${m[1]} jours`:`لدى المصنع أكثر من ${m[1]} يومًا`)+m[2].replace('oldest',l==='fr'?'le plus ancien':'الأقدم').replace(/ d\)/,l==='fr'?' j)':' ي)')],
[/^(Failed|Not allowed or failed|Could not save|Database error): (.*)$/,(m,l)=>(DICT[l][m[1]]||m[1])+' : '+m[2]],
[/^Case (\S+) opened$/,(m,l)=>l==='fr'?'Dossier '+m[1]+' ouvert':'تم فتح الملف '+m[1]],
[/^This customer still owes (.+)\. Return the phone anyway\? The balance stays on their account\.$/,(m,l)=>l==='fr'?`Ce client doit encore ${m[1]}. Rendre le téléphone quand même ? Le solde reste sur son compte.`:`على هذا الزبون ${m[1]} متبقٍ. هل تسلّم الهاتف رغم ذلك؟ يبقى الرصيد في حسابه.`],
[/^More than the balance(?: due)? \((.+)\)$/,(m,l)=>(l==='fr'?'Dépasse le solde (':'أكثر من الرصيد (')+m[1]+')'],
[/^(\d+) phone\(s\) marked as sent$/,(m,l)=>l==='fr'?m[1]+' téléphone(s) marqué(s) envoyé(s)':'تم تأكيد إرسال '+m[1]+' هاتف']];
let LANG='en';try{LANG=localStorage.getItem('rd_lang')||'en'}catch(e){}
const ORIG=new WeakMap();
function T(x){if(LANG==='en')return x;const k=x.trim();if(!k)return x;let r=DICT[LANG][k];if(r==null)for(const [re,fn] of PAT){const m=k.match(re);if(m){r=fn(m,LANG);break}}return r==null?x:x.replace(k,()=>r)}
function tx(n){const p=n.parentNode&&n.parentNode.nodeName;if(p==='SCRIPT'||p==='STYLE'||p==='TEXTAREA')return;if(!ORIG.has(n))ORIG.set(n,n.nodeValue);const t=T(ORIG.get(n));if(t!==n.nodeValue)n.nodeValue=t}
function el(n){for(const a of ['placeholder','title']){if(n.hasAttribute&&n.hasAttribute(a)){const k='data-o-'+a;if(!n.hasAttribute(k))n.setAttribute(k,n.getAttribute(a));const t=T(n.getAttribute(k));if(t!==n.getAttribute(a))n.setAttribute(a,t)}}}
function walk(root){el(root);const w=document.createTreeWalker(root,5);let n;while(n=w.nextNode()){n.nodeType===3?tx(n):el(n)}}
new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===3)tx(n);else if(n.nodeType===1)walk(n)}))).observe(document.body,{childList:true,subtree:true});
function setLang(l){LANG=l;try{localStorage.setItem('rd_lang',l)}catch(e){}document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';$('#lang').value=l;walk(document.body)}
$('#lang').onchange=e=>setLang(e.target.value);
const CFG0={waitDays:3,pickupDays:3,transitHours:24,factoryDays:14,lowStock:2,currency:'',shopName:'',notice:''};
let CFG={...CFG0},PREF={theme:'system',accent:'teal',density:'comfortable',anim:'on',widgets:{}},detOpen=false,ACTIVE='D';
const LOADED={cases:false};
const ACC={teal:['#0d9488','#14b8a6'],blue:['#2563eb','#3b82f6'],indigo:['#4f46e5','#6366f1'],orange:['#ea580c','#f97316'],green:['#16a34a','#22c55e'],rose:['#e11d48','#f43f5e']};
const prefKey=()=>'rd_pref_'+(uid||'x');
function applyPrefs(){const r=document.documentElement;if(PREF.theme==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',PREF.theme);const a=ACC[PREF.accent]||ACC.teal;r.style.setProperty('--ac',a[0]);r.style.setProperty('--ac2',a[1]);r.dataset.density=PREF.density;r.dataset.anim=PREF.anim}
function loadPrefs(){try{PREF={theme:'system',accent:'teal',density:'comfortable',anim:'on',widgets:{},...JSON.parse(localStorage.getItem(prefKey())||'{}')}}catch(e){}applyPrefs();if(typeof dash==='function')dash()}
function savePrefs(){try{localStorage.setItem(prefKey(),JSON.stringify(PREF))}catch(e){}applyPrefs()}
function applyCfg(){const m=$('.bt small');if(m)m.textContent=CFG.shopName||'Mobile repair workshop'}
function setLive(st){const e=$('#live');if(!e)return;e.textContent=st==='ok'?'● Live':st==='err'?'⚠ Offline':'Connecting…';e.className='pill '+(st==='ok'?'paid':st==='err'?'unpaid':'')}
$('#live').onclick=()=>location.reload();
function wrapDb(d){const rq=q=>({orderBy:(f,x)=>rq(q.orderBy(f,x)),limit:n=>rq(q.limit(n)),onSnapshot:(ok,er)=>{let un=null,dead=false,t=0;const go=()=>{un=q.onSnapshot(s=>{t=0;setLive('ok');ok(s)},e=>{setLive('err');if(er)er(e);if(!dead&&e&&e.code!=='permission-denied'&&t++<5)setTimeout(go,2000*t)})};go();return()=>{dead=true;if(un)un()}}});return{doc:p=>d.doc(p),collection:p=>{const c=d.collection(p);return(c.orderBy||c.limit)?rq(c):c}}}
function fail(sel,e){console.error(e);const el=$(sel);if(el)el.innerHTML=`<div class="mu" style="padding:12px">⚠ <span>Could not display this view.</span> ${esc((e&&e.message)||e)} <button onclick="location.reload()"><span>Reload</span></button></div>`}
function rowTry(f,c){try{return f()}catch(e){console.error(e);return `<div class="c"><div class="m"><b>${esc(c.caseNo||c.id)}</b><div class="mu">⚠ ${esc(e.message)}</div></div></div>`}}
const guard=(f,sel)=>function(){try{return f.apply(this,arguments)}catch(e){fail(sel,e)}};
list=guard(list,'#list');swp=guard(swp,'#swd');pay=guard(pay,'#ph');inv=guard(inv,'#ls');cliRender=guard(cliRender,'#cll');
const renderActive=()=>{({D:dash,C:list,S:swp,P:pay,I:inv,L:cliRender}[ACTIVE]||dash)()};
const _tab=tab;tab=function(t){ACTIVE=t;_tab(t);renderActive()};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderActive()});window.addEventListener('focus',()=>renderActive());
const DONUT=P=>{const t=P.reduce((a,p)=>a+p.v,0);let off=25;const arcs=t?P.filter(p=>p.v>0).map(p=>{const d=p.v/t*100,e=`<circle cx="21" cy="21" r="15.9155" fill="none" stroke-width="5" style="stroke:${p.c}" stroke-dasharray="${d} ${100-d}" stroke-dashoffset="${off}"></circle>`;off-=d;return e}).join(''):'';return `<svg viewBox="0 0 42 42" class="dn"><circle cx="21" cy="21" r="15.9155" fill="none" stroke-width="5" style="stroke:var(--bd)"></circle>${arcs}<text x="21" y="21.6" text-anchor="middle" dominant-baseline="middle" class="dnt">${t}</text></svg>`};
const ring=(p,c)=>`<svg viewBox="0 0 42 42" class="dn"><circle cx="21" cy="21" r="15.9155" fill="none" stroke-width="5" style="stroke:var(--bd)"></circle><circle cx="21" cy="21" r="15.9155" fill="none" stroke-width="5" stroke-linecap="round" style="stroke:${c}" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="25"></circle><text x="21" y="21.6" text-anchor="middle" dominant-baseline="middle" class="dnt">${p}%</text></svg>`;
const leg=P=>`<div class="lgs">${P.map(p=>`<div class="lg"><i style="background:${p.c}"></i><span>${p.l}</span><b>${p.v}</b></div>`).join('')}</div>`;
const wcard=(t,h)=>`<div class="box wc"><h2><span>${t}</span></h2>${h}</div>`;
const WG={alerts:{t:'Alerts and notices',r:'all'},pipe:{t:'Phones by stage',r:['admin','manager','reception','technician']},where:{t:'Where are the items?',r:['admin','manager','reception','technician']},ring:{t:'Repair success rate',r:['admin','manager','technician']},trend:{t:'Phones received per month',r:['admin','manager','reception']},fin:{t:'Money overview',r:['admin','manager','cashier']},stock:{t:'Inventory snapshot',r:['admin','manager','technician']},details:{t:'Detailed numbers',r:'all'}};
const wFor=k=>{const w=WG[k];return w.r==='all'||w.r.includes(role())},wOn=k=>PREF.widgets[k]!==false;
function alertList(){
 const r=role(),A=[],P=(l,n,t,g)=>{if(n>0)A.push({l,n,t,g})},cs=cases,isO=['admin','manager'].includes(r),rec=isO||r==='reception',ws=isO||r==='technician',fin=isO||r==='cashier',live=c=>!['delivered','archived'].includes(c.status);
 const hrs=c=>c.track&&c.track.length?(Date.now()-c.track[c.track.length-1].at)/36e5:0;
 if(rec||ws){const ms=cs.filter(c=>['to_ws','to_rec'].includes(c.loc)&&hrs(c)>CFG.transitHours);P('bad',ms.length,'Handovers not acknowledged in time: check for missing items',{t:'C',lc:ms.some(c=>c.loc==='to_ws')?'to_ws':'to_rec'})}
 if(rec){P('warn',cs.filter(c=>c.loc==='to_rec').length,'Phones returned by the workshop: confirm you received them',{t:'C',lc:'to_rec'});const rp=cs.filter(c=>c.status==='repaired'&&c.loc==='reception');P(rp.some(c=>age(c.repairedAt)>CFG.pickupDays)?'bad':'info',rp.length,'Repaired phones ready for customer pickup',{t:'C',st:'repaired',lc:'reception'})}
 if(r==='reception')P('info',cs.filter(c=>c.loc==='to_ws').length,'Phones sent to the workshop, waiting for their confirmation',{t:'C',lc:'to_ws'});
 if(ws){P('warn',cs.filter(c=>c.loc==='to_ws').length,'Phones to confirm as received in the workshop',{t:'C',lc:'to_ws'});P('bad',cs.filter(c=>c.status==='waiting'&&c.loc==='workshop'&&age(c.openedAt)>CFG.waitDays).length,'Phones waiting too long to start repair',{t:'C',st:'waiting',lc:'workshop'});P('info',cs.filter(c=>c.status==='repaired'&&c.loc==='workshop').length,'Repaired phones to hand over to reception',{t:'C',st:'repaired',lc:'workshop'})}
 if(ws||fin)P('warn',cs.filter(c=>c.warranty==='out'&&live(c)&&tot(c)===0).length,'Out-of-warranty cases without a price',{t:'C',wf:'out'});
 if(rec||fin)P('bad',cs.filter(c=>!live(c)&&due(c)>0).length,'Returned phones with an unpaid balance',{t:r==='reception'?'L':'P'});
 if(can.swap()){P('info',cs.filter(c=>c.status==='swap_todo').length,'Phones to send to the factory',{t:'S'});P('bad',cs.filter(c=>c.status==='swap_sent'&&age(c.sentAt)>CFG.factoryDays).length,'Swap phones at the factory for too long',{t:'S'})}
 if(can.inv()){const L=parts.map(p=>({p,s:stk(p)}));P('warn',L.reduce((t,x)=>t+x.s.def,0),'Defective parts to send back to the main warehouse',{t:'I',ist:'def'});const by={};L.forEach(x=>{by[x.p.name]=(by[x.p.name]||0)+x.s.good});P('warn',Object.values(by).filter(v=>v<=CFG.lowStock).length,'Parts running low in stock',{t:'I'})}
 return A.sort((a,b)=>({bad:0,warn:1,info:2}[a.l]-{bad:0,warn:1,info:2}[b.l]))}
function alertsHtml(){const A=alertList(),nt=CFG.notice?`<div class="nt">📣 ${esc(CFG.notice)}</div>`:'';return `<div class="box al"><h2>🔔 <span>Alerts and notices</span></h2>${nt}${A.length?A.map(a=>`<div class="ai ${a.l}" data-g="${esc(JSON.stringify(a.g||{}))}"><b>${a.n}</b><span>${a.t}</span><i>›</i></div>`).join(''):'<div class="ai ok"><span>✓ Nothing urgent right now.</span></div>'}</div>`}
function setWf(v){wf=v;[...$('#wt').children].forEach(b=>b.className=b.dataset.w===v?'on':'')}
function go(g){if((g.t||'C')==='C'){$('#st').value=g.st||'';$('#lc').value=g.lc||'';setWf(g.wf||'')}if(g.ist!==undefined)$('#ist').value=g.ist;tab(g.t||'C')}
$('#dash').addEventListener('click',e=>{const a=e.target.closest('.ai[data-g]');if(a)go(JSON.parse(a.dataset.g))});
$('#dash').addEventListener('toggle',e=>{if(e.target.id==='det')detOpen=e.target.open},true);
dash=function(){try{
 dash0();filterDash();const old=$('#dash').innerHTML,W=[],act=cases.filter(c=>!['delivered','archived'].includes(c.status)),ok_=k=>wFor(k)&&wOn(k);
 if(ok_('alerts'))W.push(alertsHtml());
 if(ok_('pipe')){const P=[{l:'Waiting for repair',v:act.filter(c=>c.status==='waiting').length,c:'var(--wr)'},{l:'In repair',v:act.filter(c=>c.status==='repairing').length,c:'var(--ac)'},{l:'Ready for pickup',v:act.filter(c=>c.status==='repaired').length,c:'var(--ok)'},{l:'Swap',v:act.filter(c=>c.status.startsWith('swap')).length,c:'var(--or)'}];W.push(wcard('Phones by stage',`<div class="dw">${DONUT(P)}${leg(P)}</div>`))}
 if(ok_('where')){const C=['var(--ac)','var(--or)','var(--ok)','var(--bad)'],P=['reception','to_ws','workshop','to_rec'].map((k,i)=>({l:LOC[k],v:act.filter(c=>c.loc===k).length,c:C[i]}));W.push(wcard('Where are the items?',`<div class="dw">${DONUT(P)}${leg(P)}</div>`))}
 if(ok_('ring')){const inM=cases.filter(c=>(c.openedAt||'').startsWith(mo)),dn=inM.filter(c=>c.repairedAt),ok=dn.filter(c=>c.outcome==='success');W.push(wcard('Repair success rate',`<div class="dw">${ring(dn.length?Math.round(ok.length/dn.length*100):0,'var(--ok)')}<div><b>${ok.length}</b>/${dn.length} <span>repairs finished</span><div class="mu">${mo}</div></div></div>`))}
 if(ok_('trend')){const [y,m]=mo.split('-').map(Number),ms=[...Array(6)].map((_,i)=>new Date(Date.UTC(y,m-1-(5-i),1)).toISOString().slice(0,7)),cn=ms.map(k=>cases.filter(c=>(c.openedAt||'').startsWith(k)).length),mx=Math.max(1,...cn);W.push(wcard('Phones received per month',`<div class="bars">${ms.map((k,i)=>`<div><span>${cn[i]}</span><i style="height:${cn[i]/mx*80}%"></i>${k.slice(2)}</div>`).join('')}</div>`))}
 if(ok_('fin')&&can.money()){const oc=cases.filter(c=>c.warranty==='out'),ch=oc.reduce((t,c)=>t+tot(c),0),ow=oc.reduce((t,c)=>t+due(c),0);W.push(wcard('Money overview',`<div class="dw">${ring(ch?Math.max(0,Math.round((ch-ow)/ch*100)):0,'var(--ac)')}<div><div class="mu"><span>Collected</span></div><b>${money(ch-ow)}</b><div class="mu" style="margin-top:6px"><span>On hold (owed)</span></div><b class="${ow?'slow':''}">${money(ow)}</b></div></div>`))}
 if(ok_('stock')&&can.inv()){const L=parts.map(p=>stk(p)),sm=f=>L.reduce((t,x)=>t+f(x),0),P=[{l:'Good',v:sm(x=>x.good),c:'var(--ok)'},{l:'Defective',v:sm(x=>x.def),c:'var(--bad)'},{l:'Consumed',v:sm(x=>x.cons),c:'var(--mu)'}];W.push(wcard('Inventory snapshot',`<div class="dw">${DONUT(P)}${leg(P)}</div>`))}
 $('#dash').innerHTML=`<div class="wg">${W.join('')}</div>`+(ok_('details')?`<details id="det"${detOpen?' open':''}><summary><span>Detailed numbers</span></summary>${old}</details>`:'')}catch(e){fail('#dash',e)}};
function adminBox(){return `<div class="box"><h2>Workshop settings (admin)</h2><div class="g2"><div><label>Waiting too long: days</label><input id="a_wd" type="number" min="1" value="${CFG.waitDays}"></div><div><label>Ready for pickup too long: days</label><input id="a_pd" type="number" min="1" value="${CFG.pickupDays}"></div></div><div class="g2"><div><label>Handover not acknowledged: hours</label><input id="a_th" type="number" min="1" value="${CFG.transitHours}"></div><div><label>At factory too long: days</label><input id="a_fd" type="number" min="1" value="${CFG.factoryDays}"></div></div><div class="g2"><div><label>Low stock: units or fewer</label><input id="a_ls" type="number" min="0" value="${CFG.lowStock}"></div><div><label>Currency (shown after amounts)</label><input id="a_cu" value="${esc(CFG.currency)}" maxlength="6"></div></div><label>Shop name (header)</label><input id="a_sn" value="${esc(CFG.shopName)}"><label>Notice for all staff (shown on every dashboard)</label><textarea id="a_nt">${esc(CFG.notice)}</textarea><div class="row"><button class="pri" onclick="saveCfg()">Save settings</button></div></div>`}
async function saveCfg(){const n=id=>Math.max(0,parseInt(val(id),10)||0),o={waitDays:n('a_wd')||3,pickupDays:n('a_pd')||3,transitHours:n('a_th')||24,factoryDays:n('a_fd')||14,lowStock:n('a_ls'),currency:val('a_cu'),shopName:val('a_sn'),notice:val('a_nt')};
 try{await db.doc('settings/app').set(o);CFG={...CFG0,...o};applyCfg();audit('settings changed','settings');toast('Settings saved');dash()}catch(e){toast('Failed: '+(e.code||e.message))}}
function settingsOpen(){const W=Object.entries(WG).filter(([k])=>wFor(k));
 open_(`<div class="top"><h1><span>Settings</span></h1><span class="sp"></span><button onclick="shut()">Close ✕</button></div><div class="box"><h2>My appearance</h2><label>Theme</label><select id="s_th"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><label>Accent color</label><div class="sw">${Object.entries(ACC).map(([k,v])=>`<button type="button" data-ac="${k}" style="background:${v[0]}" class="${PREF.accent===k?'on':''}" title="${k}"></button>`).join('')}</div><label>Density</label><select id="s_de"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select><label>Animations</label><select id="s_an"><option value="on">On</option><option value="off">Off</option></select><label>Language</label><select id="s_lg"><option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option></select></div><div class="box"><h2>My dashboard</h2>${W.map(([k,w])=>`<label class="ck"><input type="checkbox" data-w="${k}" ${wOn(k)?'checked':''}><span>${w.t}</span></label>`).join('')}</div>${can.adm()?adminBox():''}`);
 $('#s_th').value=PREF.theme;$('#s_de').value=PREF.density;$('#s_an').value=PREF.anim;$('#s_lg').value=LANG}
$('#set').onclick=settingsOpen;
$('#md').addEventListener('change',e=>{const t=e.target;if(t.id==='s_th'){PREF.theme=t.value;savePrefs()}else if(t.id==='s_de'){PREF.density=t.value;savePrefs()}else if(t.id==='s_an'){PREF.anim=t.value;savePrefs()}else if(t.id==='s_lg')setLang(t.value);else if(t.dataset&&t.dataset.w){PREF.widgets[t.dataset.w]=t.checked;savePrefs();dash()}});
$('#md').addEventListener('click',e=>{const b=e.target.closest('button[data-ac]');if(b){PREF.accent=b.dataset.ac;savePrefs();[...b.parentNode.children].forEach(x=>x.className=x===b?'on':'')}});
applyPrefs();
dash();swp();$('#sh_d').value=today();$('#pm').value=today().slice(0,7);init();setLang(LANG);$('#role').style.cursor='pointer';$('#role').onclick=()=>toast('ID: '+uid);document.body.classList.add('boot');setTimeout(()=>document.body.classList.remove('boot'),1500);
