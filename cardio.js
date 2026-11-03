/* Running/cardio journal. Uses the existing personal access link. */
(function () {
  'use strict';
  const API='https://efyyanjbgbpaohvkezes.supabase.co/functions/v1/cardio-api';
  const M=window.CardioModel, $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={run:'ריצה',hiit_run:'HIIT בריצה',hiit_rope:'HIIT בדילגית',walk:'הליכה נמרצת',other:'אירובי אחר'};
  const st={token:'',prefix:'',sessions:[],plan:{weekly_target:75,daily_run_goal:0},offset:0,identity:null,loaded:false,dirty:false,busy:false,hasMore:false,version:0};
  let draftTimer=0;
  const fmt=n=>new Intl.NumberFormat('he-IL',{maximumFractionDigits:1}).format(Number(n));
  const draftKey=()=> 'noga-cardio:draft-v1:'+st.prefix;
  function message(text,bad=false){const el=$('#cardioStatus');if(el){el.textContent=text;el.className=bad?'bad':'muted';}}
  async function call(action,options={}){
    const response=await fetch(API+'?action='+action,{...options,headers:{'Content-Type':'application/json','x-workout-key':st.token}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const e=new Error(data.error||'הפעולה לא הצליחה כרגע.');e.code=data.code;throw e;}
    return data;
  }
  function raw(){
    return {...st.identity,performed_at:$('#cardioDate').value,activity_type:$('#cardioType').value,
      duration_minutes:$('#cardioDuration').value,intensity:$('#cardioIntensity').value,
      vigorous_minutes:$('#cardioVigorous').value,moderate_minutes:$('#cardioModerate').value,
      avg_hr:$('#cardioAvg').value,max_hr:$('#cardioMax').value,notes:$('#cardioNotes').value};
  }
  function persist(){
    if(!st.prefix||!st.dirty)return;
    try{localStorage.setItem(draftKey(),JSON.stringify(raw()));message('הטיוטה נשמרה במכשיר · לשמירה בהיסטוריה יש ללחוץ על שמירת אירובי');}
    catch(_){message('הטיוטה לא נשמרה במכשיר. השאירי את הטופס פתוח ושמרי לשרת.',true);}
  }
  function changed(){st.dirty=true;st.version++;clearTimeout(draftTimer);draftTimer=setTimeout(persist,250);}
  function updateFields(){
    const hiit=$('#cardioType').value.startsWith('hiit');
    if(hiit)$('#cardioIntensity').value='mixed';
    $('#cardioIntensity').disabled=hiit;
    $('#cardioMixed').classList.toggle('hidden',$('#cardioIntensity').value!=='mixed');
    $('#cardioDurationLabel').textContent=$('#cardioType').value==='run'&&$('#cardioIntensity').value!=='mixed'?'דקות ריצה בפועל':'משך האימון הכולל בדקות';
    $('#cardioDurationHint').textContent=$('#cardioType').value==='run'?'אם היו גם מקטעי הליכה, בחרי עצימות מעורבת ומלאי את החלוקה.':'כולל חימום, התאוששות ושחרור. רק דקות בעצימות מתאימה נספרות ליעד.';
  }
  function fill(data){
    st.identity={id:data.id||crypto.randomUUID(),revision:Number(data.revision||0)};
    const values={cardioDate:data.performed_at||M.today(),cardioType:data.activity_type||'run',cardioDuration:data.duration_minutes??'',
      cardioIntensity:data.intensity||inferIntensity(data),cardioVigorous:data.vigorous_minutes??'',cardioModerate:data.moderate_minutes??'',
      cardioAvg:data.avg_hr??'',cardioMax:data.max_hr??'',cardioNotes:data.notes||''};
    for(const [id,v] of Object.entries(values))$('#'+id).value=v;
    $('#cardioDate').max=M.today();updateFields();
    $('#cardioSubmit').textContent=st.identity.revision?'שמירת השינויים':'שמירת אירובי';
    $('#cardioFormTitle').textContent=st.identity.revision?'עריכת אימון אירובי':'תיעוד ריצה או אירובי';
  }
  function inferIntensity(s){
    if(!s.duration_minutes)return '';
    if(s.activity_type?.startsWith('hiit'))return 'mixed';
    if(Number(s.vigorous_minutes)===Number(s.duration_minutes))return 'vigorous';
    if(Number(s.moderate_minutes)===Number(s.duration_minutes))return 'moderate';
    if(!Number(s.vigorous_minutes)&&!Number(s.moderate_minutes))return 'light';
    return 'mixed';
  }
  function discard(){
    clearTimeout(draftTimer);try{localStorage.removeItem(draftKey());}catch(_){}
    st.dirty=false;st.version++;fill({});message('');
  }
  function openForm(session){
    if(st.busy)return;
    if(session){if(st.dirty&&!confirm('קיימת טיוטה לא שמורה. לפתוח במקומה את האימון לעריכה?'))return;fill(session);st.dirty=false;}
    $('#cardioEntry').open=true;$('#cardioFormTitle').scrollIntoView({behavior:'smooth',block:'center'});
  }
  function recommendationHtml(now){
    const c=M.checkpoint(st.sessions,now,st.plan);
    const title=c.phase==='end'?'בדיקת סוף השבוע · שישי–שבת':c.phase==='middle'?'בדיקת אמצע השבוע · רביעי':'בדיקות השבוע';
    if(c.met)return '<div class="cardio-check"><strong>הגעת ליעד השבועי ✓</strong><p>אין צורך בהשלמה. אפשר להמשיך לרוץ לפי ההנאה וההתאוששות.</p></div>';
    if(c.phase==='early')return '<div class="cardio-check"><strong>'+title+'</strong><p>הצעות להמשך השבוע יוצגו כאן ברביעי, ושוב בשישי–שבת, לפי מה שיתועד עד אז.</p></div>';
    let html='<div class="cardio-check"><strong>'+title+'</strong><p>נותרו '+fmt(c.remaining)+' דקות בעצימות גבוהה או שווה ערך כדי להגיע ליעד.</p>';
    if(c.opportunities===0 && c.phase==='end')return html+'<p>כבר תועדה ריצה היום והשבוע מסתיים. אין צורך להוסיף אימון מאומץ כדי לסגור פער. אפשר להמשיך בשבוע הבא לפי הזמן וההתאוששות.</p></div>';
    if(st.plan.daily_run_goal>0){
      html+='<p>אם יתאפשרו '+fmt(st.plan.daily_run_goal)+' דקות ריצה בעצימות גבוהה בכל אחד מ־'+c.opportunities+' הימים שעוד זמינים, יתווספו '+fmt(c.forecast)+' דקות. זו תחזית בלבד.</p>';
    }
    if(c.extra===0){html+='<p>לפי התחזית הזו, אין צורך באימון השלמה נוסף כרגע.</p>';}
    else {
      html+='<p>מעבר לתחזית נותרות '+fmt(c.extra)+' דקות. אפשר לבחור השלמה אחת או שתיים, לפי הזמן וההתאוששות:</p><ul>';
      if(st.plan.daily_run_goal>0){
        const add=Math.min(15,c.extra),long=M.round(st.plan.daily_run_goal+add);
        html+='<li>להאריך ריצה אחת מ־'+fmt(st.plan.daily_run_goal)+' ל־'+fmt(long)+' דקות: תוספת של '+fmt(add)+' דקות בעצימות גבוהה.</li>';
        if(c.extra>15&&c.opportunities>=2)html+='<li>להאריך שתי ריצות ל־'+fmt(st.plan.daily_run_goal+15)+' דקות: תוספת של 30 דקות, נוסף לריצות הקצרות שבתחזית.</li>';
      }else html+='<li>ריצה נוספת של עד '+fmt(Math.min(25,c.extra))+' דקות בעצימות שמתאימה לך.</li>';
      if(!c.hiitDone)html+='<li>לגיוון, אם את רעננה ומורגלת בפעילות: 6 סבבים של דקת ריצה מאומצת ודקת הליכה, עם 5 דקות חימום ו־3 דקות שחרור. סך הכול 20 דקות; רק 6 דקות מאמץ גבוה נספרות כעצימות גבוהה, ושאר הדקות לפי העצימות בפועל.</li>';
      html+='</ul><p>אין חובה לסגור את כל הפער השבוע. ההצעות אינן מצטברות זו לזו; לא לרכז פער גדול באימון אחד ולא להחליף אימון כוח באופן אוטומטי.</p>';
    }
    return html+'</div>';
  }
  function render(){
    const w=M.week(M.today(),st.offset),s=M.summarize(st.sessions,w.start,w.end,Number(st.plan.weekly_target));
    $('#cardioRange').textContent=w.start.slice(8)+'.'+w.start.slice(5,7)+'–'+w.end.slice(8)+'.'+w.end.slice(5,7)+' · ראשון–שבת';
    $('#cardioNextWeek').disabled=st.offset===0;
    $('#cardioPrevWeek').disabled=st.offset<=-12;
    $('#cardioSummaryText').textContent=fmt(s.total)+' דקות אירובי מתועדות · '+fmt(s.equivalent)+' מתוך '+fmt(s.target)+' דקות ליעד';
    $('#cardioProgress').max=s.target;$('#cardioProgress').value=Math.min(s.equivalent,s.target);
    $('#cardioTotals').textContent=fmt(s.vigorous)+' דק׳ בעצימות גבוהה + '+fmt(s.moderate)+' דק׳ מתונות. משך אימוני הריצה: '+fmt(s.runMinutes)+' דק׳.';
    $('#cardioGoal').textContent=st.plan.daily_run_goal>0?'שאיפה אישית: כ־'+fmt(st.plan.daily_run_goal)+' דקות ריצה ביום, כשמתאים. אין חובת רצף יומי.':'';
    $('#cardioCheckpoint').innerHTML=st.hasMore?'<p class="muted">הסיכום חלקי; אין כרגע המלצות להשלמה.</p>':st.offset===0?recommendationHtml(M.today()):'<p class="muted">סיכום מה שתועד בשבוע זה. אימונים שלא תועדו אינם נכללים בספירה.</p>';
    const rows=s.rows.slice().sort((a,b)=>b.performed_at.localeCompare(a.performed_at)||String(b.created_at).localeCompare(String(a.created_at)));
    $('#cardioHistory').innerHTML=rows.length?rows.map(x=>'<div class="cardio-history-row"><div><strong>'+esc(names[x.activity_type]||'אירובי')+' · '+esc(x.performed_at.slice(8)+'.'+x.performed_at.slice(5,7))+'</strong><div>'+fmt(x.duration_minutes)+' דקות · '+fmt(Number(x.vigorous_minutes)+Number(x.moderate_minutes)/2)+' דקות ליעד</div>'+(x.avg_hr||x.max_hr?'<div class="muted">'+(x.avg_hr?'דופק ממוצע '+x.avg_hr+' ':'')+(x.max_hr?' · מרבי '+x.max_hr:'')+'</div>':'')+(x.notes?'<div class="muted">'+esc(x.notes)+'</div>':'')+'</div><div class="cardio-row-actions"><button class="small" type="button" data-cardio-edit="'+esc(x.id)+'">עריכה</button><button class="small" type="button" data-cardio-delete="'+esc(x.id)+'">הסרה</button></div></div>').join(''):'<p class="muted">עדיין אין אימוני אירובי מתועדים בשבוע הזה.</p>';
    $('#cardioHistory').querySelectorAll('[data-cardio-edit]').forEach(b=>b.onclick=()=>openForm(st.sessions.find(x=>x.id===b.dataset.cardioEdit)));
    $('#cardioHistory').querySelectorAll('[data-cardio-delete]').forEach(b=>b.onclick=()=>remove(st.sessions.find(x=>x.id===b.dataset.cardioDelete)));
    $('#cardioLoadStatus').textContent=st.hasMore?'קיימים רישומים נוספים בטווח הזה. הסיכום עשוי להיות חלקי.':'';
  }
  async function refresh(){
    const first=M.week(M.today(),-12).start,last=M.week().end;
    const data=await call('list&from='+first+'&to='+last);
    st.sessions=data.sessions||[];st.plan=data.plan;st.hasMore=!!data.has_more;st.loaded=true;render();
  }
  async function save(event){
    event.preventDefault();if(st.busy)return;
    let payload;try{payload=M.validate(raw());}catch(e){message(e.message,true);return;}
    clearTimeout(draftTimer);persist();st.busy=true;
    const version=st.version;$('#cardioSubmit').disabled=true;message('שומרת…');
    try{
      const result=await call('save',{method:'POST',body:JSON.stringify(payload)});
      st.identity={id:result.session.id,revision:result.session.revision};
      if(st.version===version){discard();message('אימון האירובי נשמר ✓');}else persist();
      try{await refresh();}catch(_){message('האימון נשמר ✓ · רענון הסיכום לא הצליח כרגע. לחצי על רענון.',true);}
    }catch(e){message(e.message+' · הטיוטה נשארת במכשיר.',true);}
    finally{st.busy=false;$('#cardioSubmit').disabled=false;}
  }
  async function remove(session){
    if(st.busy||!session||!confirm('להסיר את אימון האירובי מ־'+session.performed_at+' מהיומן?'))return;
    st.busy=true;
    try{await call('delete',{method:'POST',body:JSON.stringify({id:session.id,revision:session.revision})});if(st.identity?.id===session.id)discard();await refresh();message('האימון הוסר מהסיכום.');}
    catch(e){message(e.message,true);}finally{st.busy=false;}
  }
  function wire(){
    $('#cardioForm').addEventListener('submit',save);
    $('#cardioForm').addEventListener('input',changed);
    $('#cardioType').addEventListener('change',()=>{if($('#cardioType').value.startsWith('hiit'))$('#cardioIntensity').value='mixed';else $('#cardioIntensity').value='';updateFields();changed();});
    $('#cardioIntensity').addEventListener('change',()=>{updateFields();changed();});
    $('#cardioCancel').onclick=()=>{if(st.busy)return;if(st.dirty&&!confirm('למחוק את טיוטת האירובי מהמכשיר?'))return;discard();$('#cardioEntry').open=false;};
    $('#cardioPrevWeek').onclick=()=>{st.offset=Math.max(-12,st.offset-1);render();};
    $('#cardioNextWeek').onclick=()=>{st.offset=Math.min(0,st.offset+1);render();};
    $('#cardioRefresh').onclick=async()=>{try{await refresh();message('הסיכום עודכן.');}catch(e){message(e.message,true);}};
    window.addEventListener('pagehide',persist);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();else if(st.loaded){$('#cardioDate').max=M.today();refresh().catch(()=>{});}});
    window.addEventListener('online',()=>{if(st.loaded)refresh().catch(()=>{});});
  }
  async function mount(options){
    if(st.token)return;
    st.token=options.token;st.prefix=options.namespace;
    $('#cardioPanel').classList.remove('hidden');wire();fill({});
    try{const saved=localStorage.getItem(draftKey());if(saved){fill(JSON.parse(saved));st.dirty=true;$('#cardioEntry').open=true;message('שוחזרה טיוטת אירובי מהמכשיר · עדיין לא נשמרה בהיסטוריה.');}}catch(_){}
    try{await refresh();}catch(e){$('#cardioLoadStatus').textContent='לא ניתן לטעון את האירובי כרגע. אפשר לתעד טיוטה ולנסות רענון בהמשך.';message(e.message,true);}
  }
  window.WorkoutCardio=Object.freeze({mount});
})();
