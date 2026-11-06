'use strict';
const API='https://efyyanjbgbpaohvkezes.supabase.co/functions/v1/workout-api';
const P=window.WorkoutProgram;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={token:'',data:null,program:P.KEY,workout:'A',date:'',namespace:'',id:'',revision:0,dirty:false,saving:false,items:[],extras:[],preferences:{},timer:0,view:'strength',historyOffset:0};
const formatDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>formatDate(new Date());
const programLabel=k=>({general:'כללית קודמת',emphasis:'דגש קודם',general_v2:'כללית קודמת',emphasis_v2:'דגש קודם',general_v3:'התוכנית הכללית'}[k]||k);
const storage={get(k,fallback=null){try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}},remove(k){try{localStorage.removeItem(k)}catch{}}};
async function call(action,opt={}){const res=await fetch(API+'?action='+encodeURIComponent(action),{...opt,headers:{'Content-Type':'application/json','x-workout-key':state.token,...opt.headers}});const d=await res.json().catch(()=>({}));if(!res.ok)throw new Error(d.error||'הפעולה נכשלה');return d;}
async function namespace(token){const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return [...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function context(p=state){return [p.program_key||p.program,p.workout_code||p.workout,p.performed_at||p.date].join('|');}
function draftKey(p=state){return 'noga-workouts:draft-v2:'+state.namespace+':'+encodeURIComponent(context(p));}
const preferenceKey=()=> 'noga-workouts:preferences-v3:'+state.namespace;
const metricLabel=m=>({distance:'מטרים',seconds:'שניות',seconds_per_side:'שניות לכל צד',reps_per_side:'חזרות לכל צד'}[m]||'חזרות');
function setRow(n,e,v={}){
 const timed=e.metric_type.startsWith('seconds'),jump=e.exercise_key==='impact_jumps';
 const direction=jump?(n%2?'אנכי':'צידי'):'';
 return '<div class="setrow" data-direction="'+direction+'"><span class="setnum">'+n+(direction?'<small>'+direction+'</small>':'')+'</span><input class="load" aria-label="'+esc(e.load_label)+' — סט '+n+'" placeholder="'+esc(jump?'—':e.load_label||'משקל / סיוע')+'" value="'+esc(v.load_text||'')+'"'+(jump?' disabled':'')+'><input class="metric" inputmode="decimal" aria-label="'+metricLabel(e.metric_type)+' — סט '+n+'" placeholder="'+metricLabel(e.metric_type)+'" value="'+esc(timed?v.duration_seconds||'':v.reps_text||'')+'"><input class="rir" aria-label="RIR או קושי — סט '+n+'" placeholder="RIR / קושי" value="'+esc(v.rir_text||'')+'">'+(n>1?'<button class="copy-prev" type="button" aria-label="העתקת הסט הקודם לסט '+n+'">כמו הקודם</button>':'')+'</div>';
}
function demoHtml(e){return e.demo_url?'<a class="demo" target="_blank" rel="noopener noreferrer" href="'+esc(e.demo_url)+'">'+(e.second_demo_url?'הדגמה אנכית':'הדגמה')+' ↗</a>'+(e.second_demo_url?'<a class="demo" target="_blank" rel="noopener noreferrer" href="'+esc(e.second_demo_url)+'">הדגמה צידית ↗</a>':''):'';}
function prevHtml(e){
 const p=P.previous(e,state.data.history,{date:state.date,sessionId:state.id});
 if(!p)return '<div class="previous muted">אין עדיין ביצוע קודם מתועד לחלופה הזאת.</div>';
 const lines=p.rows.map(r=>{const bits=[];if(r.load_text)bits.push(r.load_text);if(r.reps_text)bits.push(r.reps_text+' '+(e.metric_type==='distance'&&!p.legacy?'מטרים':e.exercise_key==='band_lateral_walk'?'צעדים':'חזרות'));if(r.duration_seconds)bits.push(r.duration_seconds+' שניות');if(r.rir_text)bits.push('RIR '+r.rir_text);if(r.notes)bits.push(r.notes);return '<div>סט '+r.set_number+': '+esc(bits.join(' · '))+'</div>';}).join('');
 const note=p.s.exercise_notes?.[p.rows[0]?.slot_id||e.slot_id]||p.s.exercise_notes?.[e.exercise_key];
 const label=p.legacy?'תיעוד קודם ללא ציון החלופה / אופן המדידה':'בפעם האחרונה';
 return '<div class="previous"><strong>'+label+' · '+esc(p.s.performed_at)+'</strong>'+lines+(!p.rows.length?'<div>סומן כבוצע, ללא נתוני סטים.</div>':'')+(note?'<div>'+esc(note)+'</div>':'')+'</div>';
}
function progressHtml(e){
 if(e.exercise_key==='impact_jumps')return '';
 const d=window.WorkoutInsights?.progression({k:e.exercise_key,m:e.metric_type,s:e.planned_sets,r:e.rep_time_range},state.data.history,{date:state.date,sessionId:state.id});
 if(!d)return '';
 let guidance=d.guidance||'';
 if(e.exercise_key==='band_assisted_pullup'&&guidance.includes('עלייה קטנה במשקל'))guidance='אם החזרות בקצה העליון נשמרות בשליטה ובמאמץ המתאים, אפשר להפחית מעט את הסיוע. בגומייה האופקית: להנמיך את נקודת החיבור בהדרגה.';
 return '<details class="progress-insight"><summary>המלצת התקדמות</summary>'+[d.history,d.comparison,guidance].filter(Boolean).map(v=>'<p>'+esc(v)+'</p>').join('')+'</details>';
}
function cardHtml(e,values=[]){
 const variants=(e.options||[]).length>1?'<label class="variant-label">חלופה<select class="variant">'+e.options.map(k=>'<option value="'+k+'"'+(k===e.exercise_key?' selected':'')+'>'+esc(P.catalog[k].exercise_name)+'</option>').join('')+'</select></label>':'';
 let rows='';for(let i=0;i<Math.max(values.length,e.planned_sets||2);i++)rows+=setRow(i+1,e,values[i]);
 return '<section class="card exercise'+(e.optional?' optional-exercise':'')+'" data-slot="'+esc(e.slot_id)+'" data-key="'+esc(e.exercise_key)+'"><div class="head"><div class="titlewrap"><label class="complete-control"><input type="checkbox" class="complete-toggle" aria-label="סימון '+esc(e.exercise_name)+' כבוצע"><span>✓</span></label><div><h3>'+esc(e.exercise_name)+'</h3><div class="muscles">'+esc(e.primary_muscles||'')+'</div><div class="meta">'+e.planned_sets+' סטים · '+esc(e.rep_time_range||'')+'</div></div></div><div class="demo-links">'+demoHtml(e)+'</div></div>'+variants+prevHtml(e)+'<div class="labels"><span>סט</span><span>'+esc(e.load_label||'משקל / סיוע')+'</span><span>'+metricLabel(e.metric_type)+'</span><span>RIR / קושי</span></div><div class="sets">'+rows+'</div><button class="small add" type="button">+ סט</button><textarea class="exercise-note" aria-label="הערה אישית ל'+esc(e.exercise_name)+'" placeholder="הערה אישית — אופציונלי"></textarea>'+progressHtml(e)+'</section>';
}
function itemFor(card){return state.items.find(e=>e.slot_id===card.dataset.slot);}
function cardFor(slot){return document.querySelector('.exercise[data-slot="'+CSS.escape(slot)+'"]');}
function readCard(card){const e=itemFor(card);return {...e,exercise_note:card.querySelector('.exercise-note').value.trim(),sets:[...card.querySelectorAll('.setrow')].map((r,i)=>({set_number:i+1,load_text:r.querySelector('.load').value.trim(),reps_text:e.metric_type.startsWith('seconds')?'':r.querySelector('.metric').value.trim(),duration_seconds:e.metric_type.startsWith('seconds')?r.querySelector('.metric').value.trim():'',rir_text:r.querySelector('.rir').value.trim(),notes:r.dataset.direction||''}))};}
function hasInput(card){return !!card.querySelector('.complete-toggle:checked')||[...card.querySelectorAll('input,textarea')].some(i=>i.type!=='checkbox'&&i.value.trim());}
function setCompleted(card,on){card.classList.toggle('completed',!!on);card.querySelector('.complete-toggle').checked=!!on;}
function bindCard(card){
 card.querySelector('.add').onclick=()=>{const e=itemFor(card),box=card.querySelector('.sets'),limit=e.exercise_key==='impact_jumps'?5:20;if(box.children.length<limit){box.insertAdjacentHTML('beforeend',setRow(box.children.length+1,e));bindCopies(card);changed();}};
 card.querySelector('.complete-toggle').onchange=e=>{setCompleted(card,e.target.checked);changed();};
 card.querySelector('.variant')?.addEventListener('change',event=>{
  const e=itemFor(card),key=event.target.value;
  if(hasInput(card)&&!confirm('החלפת חלופה תנקה את הנתונים שהוזנו בכרטיס הזה באימון הנוכחי. להחליף?')){event.target.value=e.exercise_key;return;}
  const replacement={...e,...P.catalog[key],slot_id:e.slot_id,options:e.options,planned_sets:e.planned_sets,rep_time_range:e.rep_time_range,superset_group:e.superset_group,optional:e.optional,variant_label:P.catalog[key].exercise_name};
  state.items[state.items.indexOf(e)]=replacement;state.extras.filter(x=>x.target===e.slot_id).forEach(x=>{x.key=key;x.name=replacement.exercise_name;});state.preferences[e.family]=key;storage.set(preferenceKey(),state.preferences);
  card.outerHTML=cardHtml(replacement);bindCard(cardFor(e.slot_id));changed();renderExtras();
 });
 bindCopies(card);
}
function bindCopies(root){root.querySelectorAll('.copy-prev').forEach(b=>b.onclick=()=>{const r=b.closest('.setrow'),prev=r.previousElementSibling;['load','metric','rir'].forEach(k=>r.querySelector('.'+k).value=prev.querySelector('.'+k).value);changed();});}
function collect(keepEmpty=false){
 const all=[...document.querySelectorAll('.exercise')].map(readCard);
 const exercises=all.map(e=>({...e,sets:e.sets.filter(r=>keepEmpty||r.load_text||r.reps_text||r.duration_seconds||r.rir_text)})).filter(e=>keepEmpty||e.sets.length||e.exercise_note);
 const extras=state.extras.map(x=>({...x}));
 if(state.program!==P.KEY)for(const [key,note] of Object.entries(state.legacyMetadata||{}))exercises.push({slot_id:key,exercise_key:key,exercise_name:'אפשרויות האימון הקודם',exercise_note:note,sets:[]});
 const meta={variants:Object.fromEntries(all.filter(e=>e.options?.length>1).map(e=>[e.slot_id,e.exercise_key])),extras,impact:all.some(e=>e.exercise_key==='impact_jumps')};
 exercises.push({slot_id:'__noga_ui_v3__',exercise_key:'__noga_ui_v3__',exercise_name:'אפשרויות האימון',exercise_note:JSON.stringify(meta),sets:[]});
 return {id:state.id,revision:state.revision,program_key:state.program,workout_code:state.workout,performed_at:state.date,duration_minutes:$('#duration').value.trim(),notes:$('#sessionNotes').value.trim(),completed_exercises:[...document.querySelectorAll('.exercise')].filter(c=>c.querySelector('.complete-toggle').checked).map(c=>c.dataset.slot),exercises,extra_metadata:extras};
}
function changed(){if(state.saving)return;state.dirty=true;clearTimeout(state.timer);state.timer=setTimeout(persistDraft,250);}
function persistDraft(){if(!state.data||!state.dirty)return;const ok=storage.set(draftKey(),collect(true));$('#status').className=ok?'pending':'bad';$('#status').textContent=ok?'טיוטה נשמרה במכשיר · לשמירה בהיסטוריה לחצי על שמירת האימון':'לא ניתן לשמור טיוטה במכשיר — השאירי את המסך פתוח';}
function stash(){clearTimeout(state.timer);persistDraft();}
function uiMeta(d){try{const raw=d.exercise_notes?.__noga_ui_v3__||(d.exercises||[]).find(x=>x.exercise_key==='__noga_ui_v3__')?.exercise_note;return typeof raw==='string'?JSON.parse(raw):raw||{};}catch{return {};}}
function savedData(s){return {...s,exercises:Object.values((s.sets||[]).reduce((a,r)=>{const slot=r.slot_id||r.exercise_key;if(!a[slot])a[slot]={slot_id:slot,exercise_key:r.exercise_key,exercise_name:r.exercise_name,variant_label:r.variant_label,exercise_note:s.exercise_notes?.[slot]||'',sets:[]};a[slot].sets.push(r);return a;},{}))};}
function applyValues(d){
 $('#duration').value=d.duration_minutes||'';$('#sessionNotes').value=d.notes||'';
 for(const e of state.items){const c=cardFor(e.slot_id),ex=(d.exercises||[]).find(x=>(x.slot_id||x.exercise_key)===e.slot_id);if(!c)continue;
  const note=ex?.exercise_note||d.exercise_notes?.[e.slot_id]||'';c.querySelector('.exercise-note').value=note;
  if(ex?.sets?.length){const count=Math.max(c.querySelectorAll('.setrow').length,...ex.sets.map((r,i)=>r.set_number||i+1));c.querySelector('.sets').innerHTML=Array.from({length:count},(_,i)=>setRow(i+1,e,ex.sets.find((r,j)=>(r.set_number||j+1)===i+1)||{})).join('');bindCopies(c);}
  setCompleted(c,(d.completed_exercises||[]).includes(e.slot_id));
 }
}
function oldItems(saved){
 const snapshot=saved.program_snapshot?.length?saved.program_snapshot:(state.data.programs||[]).filter(e=>e.program_key===state.program&&e.workout_code===state.workout);
 const rows=[...snapshot].sort((a,b)=>a.exercise_order-b.exercise_order).map(e=>({...P.catalog[e.exercise_key],...e,slot_id:e.exercise_key,options:[]}));
 const seen=new Set(rows.map(e=>e.slot_id));
 let legacy=saved.extra_metadata||[];try{if(!legacy.length)legacy=JSON.parse(saved.exercise_notes?.__noga_extras_v1__||(saved.exercises||[]).find(x=>x.exercise_key==='__noga_extras_v1__')?.exercise_note||'[]')}catch{}
 for(const ex of [...(saved.exercises||[]),...(saved.sets||[]),...legacy.map(m=>({exercise_key:m.k,exercise_name:m.n}))]){const slot=ex.slot_id||ex.exercise_key;if(seen.has(slot)||slot.startsWith('__'))continue;seen.add(slot);const meta=legacy.find(x=>x.k===ex.exercise_key);rows.push({...P.catalog[ex.exercise_key],exercise_key:ex.exercise_key,exercise_name:ex.exercise_name,slot_id:slot,metric_type:meta?.m||P.catalog[ex.exercise_key]?.metric_type||((ex.duration_seconds||ex.sets?.some(s=>s.duration_seconds))?'seconds':'reps'),planned_sets:meta?.s||2,rep_time_range:meta?.r||'',options:[],optional:true});}
 return rows;
}
function openWorkout({program=P.KEY,workout=state.workout,date=state.date,saved=null}={}){
 stash();state.program=program;state.workout=workout;state.date=date||today();$('#date').value=state.date;
 const draft=storage.get(draftKey());
 const stored=saved||(state.data.history||[]).find(s=>s.program_key===program&&s.workout_code===workout&&s.performed_at===state.date);
 const d=draft||(stored?savedData(stored):null),meta=d?uiMeta(d):{};
 state.legacyMetadata=Object.fromEntries(Object.entries(d?.exercise_notes||{}).filter(([k])=>k.startsWith('__')&&k!=='__noga_ui_v3__'));
 for(const e of d?.exercises||[])if(e.exercise_key?.startsWith('__')&&e.exercise_key!=='__noga_ui_v3__')state.legacyMetadata[e.slot_id||e.exercise_key]=e.exercise_note;
 state.id=d?.id||crypto.randomUUID();state.revision=d?.revision||0;state.dirty=!!draft;state.extras=[];
 if(program===P.KEY){
  const prefs={...state.preferences,...meta.variants};state.items=P.exercises(workout,prefs);
  if(meta.impact!==false)state.items.unshift({...P.catalog.impact_jumps,slot_id:'impact_jumps',planned_sets:3,section:'warmup',options:[]});
 }else state.items=oldItems({...stored,...d});
 $('#duration').value='';$('#sessionNotes').value='';$('#status').textContent='';
 renderBase();
 const extras=program===P.KEY?(meta.extras||d?.extra_metadata||[]):[];
 for(const x of extras)addExtra(x.family||x.key||x.k,x.source||'choice',true,x);
 if(d)applyValues(d);
 state.dirty=!!draft;renderHeader();renderExtras();showRecovery();setView('strength',false);
 $('#editBanner').classList.toggle('hidden',!stored&&program===P.KEY);
 $('#editBanner').innerHTML=(stored?'עריכת האימון השמור · '+esc(state.date):'טיוטה מהתוכנית הקודמת')+' <button type="button" class="small" id="backToCurrent">לתוכנית הנוכחית</button>';
 $('#backToCurrent')?.addEventListener('click',()=>openWorkout({workout:P.nextWorkout(state.data.history,today()),date:today()}));
}
function renderBase(){
 let html='',group='';
 for(const e of state.items){
  if(e.exercise_key==='impact_jumps'){html+='<div class="block-heading">אחרי החימום <button id="skipImpact" type="button" class="small">דילוג על קפיצות היום</button></div>';}
  else if(e.superset_group&&e.superset_group!==group){html+='<div class="block-heading">סופרסט '+esc(e.superset_group)+'</div>';}
  else if(!e.superset_group&&group){html+='<div class="block-heading">המשך האימון</div>';}
  group=e.superset_group||'';html+=cardHtml(e);
 }
 $('#list').innerHTML=html;$('#extraCards').replaceChildren();
 document.querySelectorAll('.exercise').forEach(bindCard);
 $('#skipImpact')?.addEventListener('click',()=>{const c=cardFor('impact_jumps');if(hasInput(c)&&!confirm('להסיר את תיעוד הקפיצות מהאימון הנוכחי?'))return;state.items=state.items.filter(e=>e.slot_id!=='impact_jumps');c.previousElementSibling?.remove();c.remove();changed();$('#restoreImpact').classList.remove('hidden');});
 $('#restoreImpact').classList.toggle('hidden',state.items.some(e=>e.slot_id==='impact_jumps')||state.program!==P.KEY);
}
function renderHeader(){
 const next=P.nextWorkout(state.data.history,today());
 $('#tabs').innerHTML=['A','B','C','D'].map(w=>'<button type="button" data-w="'+w+'" class="'+(state.program===P.KEY&&state.workout===w?'active':'')+'">'+w+(w==='D'?' · קל יותר':'')+'</button>').join('');
 $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>openWorkout({workout:b.dataset.w}));
 $('#sequence').innerHTML='הבא ברצף: <b>'+next+'</b> · <bdi dir="ltr">A → B → C → A</bdi><br>אימון D אינו מקדם את הרצף';
 const start=new Date();start.setHours(12,0,0,0);start.setDate(start.getDate()-start.getDay());
 const count=state.data.history.filter(s=>s.performed_at>=formatDate(start)&&s.performed_at<=today()&&P.validSession(s)).length;
 $('#weeklyCount').textContent='אימוני כוח השבוע: '+count;
 $('#finish').classList.remove('hidden');$('#savebar').classList.toggle('hidden',state.view==='cardio');
}
function extraChoice(family){return P.resolve(family,state.preferences)||P.catalog[family];}
function renderExtras(){
 const section=$('#extrasSection');section.classList.toggle('hidden',state.program!==P.KEY);if(state.program!==P.KEY)return;
 const fixed=P.fixed[state.workout]||[];
 $('#extraRecommendations').innerHTML=fixed.map(f=>{const e=extraChoice(f),taken=state.extras.some(x=>x.source==='fixed'&&x.family===f);return '<div class="recommendation"><div><strong>'+esc(e.exercise_name)+'</strong><div class="muscles">'+esc(e.primary_muscles)+'</div><div class="meta">2 סטים · '+esc(e.rep_time_range)+'</div>'+demoHtml(e)+'</div><button type="button" class="small" data-fixed="'+f+'"'+(taken?' disabled':'')+'>'+(taken?'נוסף':'הוספה')+'</button></div>';}).join('');
 $('#extraRecommendations').querySelectorAll('[data-fixed]').forEach(b=>b.onclick=()=>addExtra(b.dataset.fixed,'fixed'));
 const used=state.extras.filter(x=>x.source==='choice').length;
 const families=[P.coreSuggestion[state.workout],...P.choices.filter(f=>f!==P.coreSuggestion[state.workout])];
 $('#extraChoice').innerHTML='<option value="">בחירת תרגיל · '+used+'/2 נבחרו</option>'+families.map(f=>{const e=extraChoice(f);return '<option value="'+f+'">'+esc(e.exercise_name)+' — '+esc(e.primary_muscles)+'</option>';}).join('');
 $('#extraChoice').disabled=used>=2;$('#addChoice').disabled=used>=2;
 $('#selectedExtras').innerHTML=state.extras.map((x,i)=>'<div class="selected-extra">'+esc(x.name||extraChoice(x.family)?.exercise_name||x.family)+(x.extra_sets?' · תוספת סטים':'')+' <button type="button" class="small" data-remove="'+i+'">הסרה</button></div>').join('');
 $('#selectedExtras').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeExtra(Number(b.dataset.remove)));
}
function addExtra(family,source='choice',restoring=false,record=null){
 if(!restoring&&state.extras.filter(x=>x.source===source).length>=2)return;
 const e=extraChoice(family);if(!e)return;
 let target=state.items.find(x=>x.family===e.family&&x.exercise_key!=='impact_jumps');
 const selection={family,source,key:e.exercise_key,name:e.exercise_name,target:'',extra_sets:false};
 if(target){
  const c=cardFor(target.slot_id),box=c.querySelector('.sets');selection.target=target.slot_id;selection.extra_sets=true;selection.start=box.children.length;
  for(let i=0;i<2&&box.children.length<20;i++)box.insertAdjacentHTML('beforeend',setRow(box.children.length+1,target));
  bindCopies(c);
 }else{
  target={...e,slot_id:record?.target||'extra_'+e.family,optional:true,superset_group:'',planned_sets:2};
  if(record?.key&&P.catalog[record.key])target={...target,...P.catalog[record.key],variant_label:P.catalog[record.key].exercise_name};
  selection.target=target.slot_id;state.items.push(target);$('#extraCards').insertAdjacentHTML('beforeend',cardHtml(target));bindCard(cardFor(target.slot_id));
 }
 state.extras.push({...selection,...(record||{})});
 if(!restoring){changed();renderExtras();cardFor(target.slot_id)?.scrollIntoView({behavior:'smooth',block:'center'});}
}
function removeExtra(i){
 const x=state.extras[i],c=cardFor(x.target);if(!c)return;
 if(hasInput(c)&&!confirm('להסיר את התוספת והנתונים שהוזנו בה מהאימון הנוכחי?'))return;
 if(x.extra_sets){const rows=[...c.querySelectorAll('.setrow')];rows.slice(x.start,x.start+2).forEach(r=>r.remove());const e=itemFor(c),v=readCard(c).sets;c.querySelector('.sets').innerHTML=v.map((r,j)=>setRow(j+1,e,r)).join('');bindCopies(c);state.extras.forEach(y=>{if(y.target===x.target&&y.start>x.start)y.start-=2;});}
 else {const dependents=state.extras.filter(y=>y.target===x.target&&y!==x);if(dependents.length){alert('יש לתרגיל גם תוספת סטים. הסירי קודם את תוספת הסטים.');return;}state.items=state.items.filter(e=>e.slot_id!==x.target);c.remove();}
 state.extras.splice(i,1);changed();renderExtras();
}
function showRecovery(){
 const entries=[],prefix='noga-workouts:draft-v2:'+state.namespace+':';try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(prefix)&&k!==draftKey()){const d=storage.get(k);if(d)entries.push(d);}}}catch{}
 $('#draftRecovery').classList.toggle('hidden',!entries.length);
 $('#draftRecovery').innerHTML='<strong>טיוטות שלא נשמרו בהיסטוריה</strong>'+entries.map((d,i)=>'<button type="button" class="small" data-draft="'+i+'">'+esc(d.performed_at)+' · '+esc(programLabel(d.program_key))+' '+esc(d.workout_code)+'</button>').join('');
 $('#draftRecovery').querySelectorAll('[data-draft]').forEach(b=>b.onclick=()=>{const d=entries[Number(b.dataset.draft)];openWorkout({program:d.program_key,workout:d.workout_code,date:d.performed_at});});
}
function setView(view,save=true){if(save)stash();state.view=view;document.body.dataset.view=view;$('#strengthScreen').classList.toggle('hidden',view!=='strength');$('#strengthControls').classList.toggle('hidden',view!=='strength');$('#dateBox').classList.toggle('hidden',view!=='strength');$('#cardioScreen').classList.toggle('hidden',view!=='cardio');$('#savebar').classList.toggle('hidden',view!=='strength'||!state.data);$('#cardioNav').classList.toggle('active',view==='cardio');$('#strengthNav').classList.toggle('active',view==='strength');if(save)window.scrollTo({top:0});}
function openModal(id){$(id).classList.remove('hidden');document.body.classList.add('modal-open');}
function closeModal(id){$(id).classList.add('hidden');if(!document.querySelector('.modal:not(.hidden)'))document.body.classList.remove('modal-open');}
function openHistory(offset=0){
 state.historyOffset=offset;const now=new Date();now.setHours(12,0,0,0);now.setDate(now.getDate()-now.getDay()+offset*7);const end=new Date(now);end.setDate(now.getDate()+6);const a=formatDate(now),b=formatDate(end);
 const sessions=P.sorted(state.data.history).filter(s=>s.performed_at>=a&&s.performed_at<=b);
 $('#pastWeekContent').innerHTML='<div class="history-nav"><button class="small" id="historyPrev">השבוע הקודם</button><strong>'+esc(a)+' — '+esc(b)+'</strong><button class="small" id="historyNext"'+(offset>=0?' disabled':'')+'>הבא</button></div>'+(sessions.length?sessions.map(s=>'<details class="history-session"><summary>'+esc(s.performed_at)+' · '+esc(programLabel(s.program_key))+' '+esc(s.workout_code)+(s.duration_minutes?' · '+s.duration_minutes+' דקות':'')+'</summary>'+[...new Set((s.sets||[]).map(r=>r.exercise_key))].map(k=>'<p><strong>'+esc(s.sets.find(r=>r.exercise_key===k).exercise_name)+'</strong><br>'+s.sets.filter(r=>r.exercise_key===k).map(r=>esc([r.load_text,r.reps_text&&r.reps_text+' '+metricLabel(P.catalog[k]?.metric_type||(s.program_snapshot||[]).find(e=>e.exercise_key===k)?.metric_type),r.duration_seconds&&r.duration_seconds+' שניות',r.rir_text&&'RIR '+r.rir_text].filter(Boolean).join(' · '))).join('<br>')+'</p>').join('')+(s.notes?'<p>'+esc(s.notes)+'</p>':'')+'<button class="small" data-edit="'+esc(s.id)+'">עריכת האימון</button></details>').join(''):'<p class="muted">אין אימונים מתועדים בשבוע הזה.</p>')+(window.WorkoutInsights?.weeklyHtml(sessions)||'');
 $('#historyPrev').onclick=()=>openHistory(offset-1);$('#historyNext').onclick=()=>openHistory(offset+1);
 $('#pastWeekContent').querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>{const s=state.data.history.find(x=>x.id===btn.dataset.edit);closeModal('#pastWeekModal');openWorkout({program:s.program_key,workout:s.workout_code,date:s.performed_at,saved:s});});openModal('#pastWeekModal');
}
async function save(){
 if(state.saving)return;
 const payload=collect();
 if(!payload.completed_exercises.length&&!payload.exercises.some(e=>!e.exercise_key.startsWith('__')&&(e.sets.length||e.exercise_note))&&!payload.notes&&!payload.duration_minutes){$('#status').textContent='יש לסמן ביצוע או להזין נתון לפני השמירה.';return;}
 if(payload.duration_minutes&&(!Number.isInteger(Number(payload.duration_minutes))||+payload.duration_minutes<1||+payload.duration_minutes>300)){$('#status').textContent='משך האימון צריך להיות בין 1 ל־300 דקות.';return;}
 clearTimeout(state.timer);const draftSaved=storage.set(draftKey(),collect(true));state.saving=true;const controls=[...document.querySelectorAll('#strengthScreen input,#strengthScreen textarea,#strengthScreen button,#strengthScreen select,.top button,.top input,#saveBtn')];controls.forEach(x=>x.disabled=true);$('#status').textContent='שומרת…';
 try{
  const d=await call('save',{method:'POST',body:JSON.stringify(payload)});state.revision=d.revision;state.dirty=false;storage.remove(draftKey());
  // Update locally even when the subsequent read fails; a successful save is never repeated as a new session.
  const saved={...payload,revision:d.revision,created_at:new Date().toISOString(),exercise_notes:Object.fromEntries(payload.exercises.filter(e=>e.exercise_note).map(e=>[e.slot_id,e.exercise_note])),program_snapshot:state.items,sets:payload.exercises.flatMap(e=>e.sets.map(r=>({...r,exercise_key:e.exercise_key,exercise_name:e.exercise_name,slot_id:e.slot_id,variant_label:e.variant_label})))};
  state.data.history=[saved,...state.data.history.filter(s=>s.id!==saved.id)];
  try{const h=await call('history');state.data.history=h.history||state.data.history;}catch{}
  renderHeader();showRecovery();$('#status').className='saved';$('#status').textContent='האימון נשמר ✓';
 }catch(e){$('#status').className='bad';$('#status').textContent=e.message+(draftSaved?' · הטיוטה נשמרה במכשיר':' · הנתונים נשארו במסך; אין לסגור אותו לפני שמירה');}
 finally{state.saving=false;controls.forEach(x=>x.disabled=false);document.querySelectorAll('[data-key="impact_jumps"] .load').forEach(x=>x.disabled=true);renderExtras();}
}
const introSeenKey='noga-workouts:intro-seen-v1';
function openHelp(section){closeModal('#introModal');openModal('#helpModal');if(section==='install')$('#helpInstall')?.scrollIntoView();}
function updateInstallButton(){const b=$('#installBtn'),p=window.WorkoutPWA;b.classList.toggle('hidden',!!p?.isStandalone?.()||!p?.isAndroid?.());b.textContent=p?.canInstall?.()?'התקנה בנייד':'איך להתקין?';}
async function handleInstall(){if(window.WorkoutPWA?.canInstall?.()){const r=await WorkoutPWA.requestInstall();if(r?.outcome==='accepted')return;}openHelp('install');}
function wire(){
 $('#cardioNav').onclick=()=>setView('cardio');$('#strengthNav').onclick=()=>setView('strength');$('#backFromCardio').onclick=()=>setView('strength');
 $('#date').onchange=e=>openWorkout({program:state.program,workout:state.workout,date:e.target.value||today()});
 $('#saveBtn').onclick=save;$('#historyBtn').onclick=()=>openHistory(0);$('#pastWeekBtn').onclick=()=>openHistory(-1);
 $('#addChoice').onclick=()=>{const f=$('#extraChoice').value;if(f)addExtra(f,'choice');};
 $('#restoreImpact').onclick=()=>{const e={...P.catalog.impact_jumps,slot_id:'impact_jumps',planned_sets:3,options:[]};state.items.unshift(e);$('#list').insertAdjacentHTML('afterbegin','<div class="block-heading">אחרי החימום</div>'+cardHtml(e));bindCard(cardFor(e.slot_id));$('#restoreImpact').classList.add('hidden');changed();};
 $('#helpBtn').onclick=()=>openHelp();$('#adaptationsBtn').onclick=()=>openModal('#adaptationsModal');$('#installBtn').onclick=handleInstall;
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal('#'+b.dataset.close));
 document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal('#'+m.id);}));
 $('#introCloseBtn').onclick=()=>{try{localStorage.setItem(introSeenKey,'1')}catch{}closeModal('#introModal');};
 $('#introHelpBtn').onclick=()=>{try{localStorage.setItem(introSeenKey,'1')}catch{}openHelp();};
 $('#introInstallBtn').onclick=()=>{try{localStorage.setItem(introSeenKey,'1')}catch{}openHelp('install');};
 document.addEventListener('input',e=>{if(e.target.matches('.exercise input,.exercise textarea,#duration,#sessionNotes'))changed();});
 window.addEventListener('pagehide',stash);window.addEventListener('workout-install-state',updateInstallButton);window.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal:not(.hidden)').forEach(m=>closeModal('#'+m.id));});
 $('#guestBtn').onclick=async()=>{const name=prompt('שם המשתמשת החדשה:');if(!name?.trim())return;const b=$('#guestBtn');b.disabled=true;try{const d=await call('create_guest',{method:'POST',body:JSON.stringify({display_name:name.trim()})});prompt('הקישור האישי למשתמשת החדשה:',WorkoutAccess.linkFor(d.token));}catch(e){alert(e.message)}finally{b.disabled=false}};
}
async function boot(){
 wire();updateInstallButton();state.token=WorkoutAccess.tokenFromUrl();state.date=today();$('#date').max=today();
 if(!state.token){$('#notice').textContent='חסר קישור גישה אישי. פתחי את הקישור שקיבלת לאפליקציה.';return;}
 try{
  state.data=await call('bootstrap');state.namespace=await namespace(state.token);state.preferences=storage.get(preferenceKey(),{});
  $('#who').textContent=state.data.user.display_name;WorkoutAccess.showLinkTools(state.token);$('#ownerTools').classList.toggle('hidden',!state.data.is_owner);
  $('#notice').classList.add('hidden');openWorkout({workout:P.nextWorkout(state.data.history,today())});
  window.WorkoutCardio?.mount({token:state.token,namespace:state.namespace});
  try{if(localStorage.getItem(introSeenKey)!=='1')openModal('#introModal');}catch{}
 }catch(e){$('#notice').classList.add('error');$('#notice').textContent=e.message;}
}
boot();
