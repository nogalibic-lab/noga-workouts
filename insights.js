// Non-invasive insights based on workouts that were actually recorded.
// No account tokens, network calls, or database writes in this module.
(function (root) {
  "use strict";
  const META_SLOT = "__noga_extras_v1__";
  const CATEGORIES = [
    {id:"carry", label:"נשיאת משקל",
      keys:["farmer_carry","suitcase_carry"],
      names:[/farmer.?s?\s*(?:carry|walk)/i,/suitcase\s*carry/i,/הליכת חקלאי/,/נשיאת משקל/]},
    {id:"stability", label:"יציבות ושליטת ליבה",
      keys:["side_plank","pallof_press","single_leg_balance","dead_bug"],
      names:[/side\s*plank/i,/פלאנק\s*צד[ידי]*/,/פלנק\s*צד[ידי]*/,/pallof/i,/שיווי משקל/,/עמידה על רגל אחת/,/dead\s*bug/i]},
    {id:"unilateral", label:"עבודה חד־צדדית",
      keys:["step_up","split_squat","lunge","walking_lunge","bulgarian_split_squat"],
      names:[/step[\s-]*up/i,/עלי[י]?ה למדרגה/,/split[\s-]*squat/i,/ספליט סקוואט/,/מכרע/,/לאנג/]}
  ];
  const filled = value => String(value == null ? "" : value).trim() !== "";
  function numeric(value) {
    const t = String(value == null ? "" : value).trim().replace(",",".");
    return /^(?:\d+(?:\.\d+)?)$/.test(t) ? Number(t) : null;
  }
  function performed(row) {
    return !!row && ((numeric(row.reps_text) ?? 0) > 0 ||
      (numeric(row.duration_seconds) ?? 0) > 0);
  }
  function recordedExercises(session) {
    const found = new Map();
    for (const row of session?.sets || []) {
      if (!row || !row.exercise_key || !performed(row)) continue;
      const key=String(row.exercise_key);
      if (key === META_SLOT) continue;
      found.set(key,{key,name:String(row.exercise_name||"")});
    }
    let metadata=[];
    try {
      const data=session?.exercise_notes?.[META_SLOT];
      metadata=typeof data==="string" ? JSON.parse(data) : data;
      if (!Array.isArray(metadata)) metadata=[];
    } catch (_) { metadata=[]; }
    const byKey=new Map(metadata.map(x=>[String(x.k||""),String(x.n||"")]));
    for (const keyValue of session?.completed_exercises || []) {
      const key=String(keyValue);
      if (key === META_SLOT || !key) continue;
      if (!found.has(key)) found.set(key,{key,name:byKey.get(key)||""});
    }
    return [...found.values()];
  }
  function categoriesForSession(session) {
    const entries=recordedExercises(session);
    return CATEGORIES.filter(c=>entries.some(e=>c.keys.includes(e.key)||c.names.some(re=>re.test(e.name)))).map(c=>c.id);
  }
  function weeklyData(sessions) {
    const data=Object.fromEntries(CATEGORIES.map(c=>[c.id,0]));
    for (const session of sessions||[]) {
      for(const id of categoriesForSession(session)) data[id]++;
    }
    return CATEGORIES.map(c=>({id:c.id,label:c.label,sessions:data[c.id]}));
  }
  function weeklyHtml(sessions) {
    const stats=weeklyData(sessions);
    const active=stats.filter(x=>x.sessions>0);
    const list=active.length
      ? '<div class="functional-tags">'+active.map(x=>
          '<span class="functional-tag"><strong>'+x.label+'</strong> · '+x.sessions+' '+(x.sessions===1?'אימון':'אימונים')+'</span>'
        ).join("")+'</div>'
      : '<div class="muted">לא תועדו השבוע תרגולים מקטגוריות אלה.</div>';
    return '<div class="functional-weekly"><div class="functional-weekly-title">יכולות פונקציונליות שתורגלו</div>'
      +list+'<p class="muted functional-footnote">נספרים רק אימונים שבהם סומן תרגיל כבוצע או תועדו חזרות, זמן או מרחק. לא כל פעילות חייבת להיכנס ליומן.</p></div>';
  }
  function validSessions(key,history,context) {
    const date=context?.date||"";
    const excluded=context?.sessionId||"";
    return (history||[]).filter(s=>s && s.id!==excluded && (!date||s.performed_at<=date)
      && (s.sets||[]).some(x=>x.exercise_key===key && performed(x)))
      .sort((a,b)=>String(b.performed_at||"").localeCompare(String(a.performed_at||""))||
        String(b.created_at||"").localeCompare(String(a.created_at||"")));
  }
  function numericValues(rows,meta) {
    return rows.map(r=>numeric(meta.m==="seconds"||meta.m==="seconds_per_side" ? r.duration_seconds : r.reps_text));
  }
  function rangeLimits(text) {
    const t=String(text||"");
    const range=t.match(/(\d+)\s*[–—-]\s*(\d+)/);
    if (range) return {lower:Number(range[1]),upper:Number(range[2]),hasRange:true};
    const target=t.match(/(\d+)/);
    return target ? {lower:Number(target[1]),upper:Number(target[1]),hasRange:false} : null;
  }
  function deltaLine(a,b,meta) {
    if (!a||!b) return "";
    const ar=(a.sets||[]).filter(x=>x.exercise_key===meta.k && performed(x));
    const br=(b.sets||[]).filter(x=>x.exercise_key===meta.k && performed(x));
    if (!ar.length || ar.length!==br.length) return "";
    if (!ar.every((r,i)=>filled(r.load_text)&&String(r.load_text).trim()===String(br[i].load_text||"").trim())) return "";
    const av=numericValues(ar,meta),bv=numericValues(br,meta);
    if (!av.every(Number.isFinite)||!bv.every(Number.isFinite)) return "";
    const diff=av.reduce((n,x)=>n+x,0)-bv.reduce((n,x)=>n+x,0);
    const unit=meta.m.startsWith("seconds")?"שניות":meta.m==="distance"?"מטרים":"חזרות";
    if (diff>0) return "בהשוואה לתיעוד שלפניו: "+diff+" "+unit+" יותר בסך הסטים, באותו עומס מדווח.";
    if (diff<0) return "בהשוואה לתיעוד שלפניו: "+Math.abs(diff)+" "+unit+" פחות בסך הסטים, באותו עומס מדווח.";
    return "בהשוואה לתיעוד שלפניו: אותו סך "+unit+" באותו עומס מדווח.";
  }
  function progression(meta,history,context={}) {
    const sessions=validSessions(meta.k,history,context);
    if (!sessions.length) return {
      title:"התקדמות בתרגיל",
      history:"אין עדיין ביצוע מתועד של התרגיל לפני האימון הנוכחי.",
      guidance:"כדאי להתחיל בעומס נוח ובטכניקה יציבה, ולתעד ביצוע כדי להשוות בפעם הבאה."
    };
    const last=sessions[0];
    const rows=(last.sets||[]).filter(r=>r.exercise_key===meta.k && performed(r));
    const values=numericValues(rows,meta);
    const upper=rangeLimits(meta.r);
    const rir=rows.map(r=>numeric(r.rir_text)).filter(Number.isFinite);
    const hasFailure=rir.some(x=>x<=0);
    const allValid=rows.length>=meta.s && values.length===rows.length && values.every(Number.isFinite);
    const allAtUpper=allValid && !!upper && values.every(x=>x>=upper.upper);
    const anyNote=[last.notes,last.exercise_notes?.[meta.k],...rows.map(x=>x.notes)].filter(filled).join(" ");
    let guidance;
    if (/כאב|pain|סחרח|dizz/i.test(anyNote)) {
      guidance="בתיעוד הקודם הופיע כאב או סימפטום שדורש תשומת לב. אין להעלות עומס לפני בירור והתאמת התרגיל.";
    } else if (hasFailure) {
      guidance="תועד סט עם RIR 0. עדיף תחילה לשפר שליטה או לשחזר ביצוע נקי, ולא להעלות עומס באופן אוטומטי.";
    } else if (!allValid) {
      guidance="לא כל הסטים המתוכננים תועדו עם מדידה ברורה. כדאי לבצע ולתעד באופן עקבי לפני החלטה על העלאת עומס.";
    } else if (allAtUpper && upper.hasRange) {
      guidance=meta.m.startsWith("seconds")
        ? "הושג הקצה העליון של טווח הזמן. אם היציבה והשליטה נשמרו בקלות, אפשר לשקול עלייה קטנה בעומס; אין צורך להאריך זמן בלי גבול."
        : "הושג הקצה העליון של טווח החזרות. אם הטכניקה נשמרה ונשארו כ־1–3 חזרות אפשריות, אפשר לשקול עלייה קטנה במשקל בפעם הבאה.";
    } else if (allAtUpper) {
      guidance="הושג יעד הביצוע הרשום. אם גם באימונים הבאים החזרות יהיו יציבות והמאמץ סביר, אפשר לשקול תוספת קטנה לעומס; אין חובה להוסיף עכשיו.";
    } else if (meta.m==="distance") {
      guidance="אפשר לנסות להוסיף מעט מרחק, רק אם הנשיאה יציבה וללא כאב. אם המאמץ גבוה, עדיף לשמור על אותו מרחק.";
    } else if (meta.m.startsWith("seconds")) {
      guidance="אם היציבה נשמרה, אפשר לנסות להוסיף כמה שניות לאחד הסטים עד לטווח היעד. אם לא, כדאי לחזור על אותו זמן.";
    } else {
      guidance="אם הטכניקה וההתאוששות טובות, אפשר לנסות להוסיף חזרה אחת באחד הסטים עד לטווח היעד, בלי להגדיל עומס כרגע.";
    }
    return {
      title:"התקדמות בתרגיל",
      history:"ביצועים מתועדים קודמים: "+sessions.length+" · האחרון מ־"+last.performed_at+".",
      comparison:sessions.length>=2?deltaLine(last,sessions[1],meta):"",
      guidance
    };
  }
  const api={CATEGORIES,weeklyData,weeklyHtml,recordedExercises,categoriesForSession,progression,numeric,rangeLimits};
  root.WorkoutInsights=api;
  if(typeof module==="object" && module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
