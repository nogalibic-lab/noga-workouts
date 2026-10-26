// Optional functional finishers and freely added exercises.
// This file never reads personal access tokens or writes directly to the database.
(function () {
  "use strict";
  const META_SLOT = "__noga_extras_v1__";
  const MAX_EXTRAS = 6;
  const CATALOG = [
    {key:"step_up", name:"עלייה למדרגה", metric:"reps_per_side", range:"8 לכל רגל", sets:2, group:"unilateral",
      note:"מדרגה יציבה ונוחה; להתחיל ללא משקל או במשקל קל. לשמור על יציבות ושליטה.", label:"עבודה חד־צדדית"},
    {key:"farmer_carry", name:"Farmer Carry", metric:"seconds", range:"30–45 שניות", sets:2, group:"carry",
      note:"נשיאת משקל בהליכה, עם כתפיים רגועות. רק אם הצוואר נוח ואין כאב.", label:"נשיאת משקל"},
    {key:"side_plank", name:"פלאנק צידי", metric:"seconds_per_side", range:"25–40 שניות לכל צד", sets:2, group:"side_core",
      note:"ליבה ויציבות צידית; לעצור כשהתנוחה כבר אינה יציבה.", label:"יציבות ליבה"},
    {key:"pallof_press", name:"Pallof Press בכבל", metric:"reps_per_side", range:"8–12 לכל צד", sets:2, group:"anti_rotation",
      note:"עומס מתון; להתנגד לסיבוב הגו בלי להטות את הגוף.", label:"שליטת ליבה"},
    {key:"single_leg_balance", name:"עמידה על רגל אחת", metric:"seconds_per_side", range:"20–30 שניות לכל צד", sets:2, group:"balance",
      note:"ליד נקודת אחיזה בטוחה, ללא צורך בתוספת משקל.", label:"שיווי משקל"}
  ];
  const CATEGORY_KEYS = {
    unilateral:["step_up","split_squat","lunge","walking_lunge","bulgarian_split_squat"],
    carry:["farmer_carry","suitcase_carry"],
    side_core:["side_plank","suitcase_carry"],
    anti_rotation:["pallof_press","dead_bug"],
    balance:["single_leg_balance","step_up"]
  };
  let hooks = null;
  let selected = [];
  let wired = false;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  function normal(item) {
    if (!item || typeof item !== "object") return null;
    const key = String(item.k || item.key || "").slice(0,80);
    if (!/^[a-z][a-z0-9_-]{2,79}$/.test(key) || key === META_SLOT) return null;
    const cat = CATALOG.find(x => x.key === key);
    const name = String(item.n || item.name || (cat && cat.name) || "").trim().slice(0,70);
    if (!name) return null;
    const metric = String(item.m || item.metric || (cat && cat.metric) || "reps");
    if (!["reps","reps_per_side","seconds","seconds_per_side","distance"].includes(metric)) return null;
    const sets = Math.min(4, Math.max(1, Number(item.s || item.sets || (cat && cat.sets) || 2) || 2));
    const range = String(item.r || item.range || (cat && cat.range) || "לפי הצורך").slice(0,45);
    return {k:key,n:name,m:metric,s:sets,r:range,t:cat?"suggested":"manual"};
  }
  function serialise() {
    return selected.map(x => ({k:x.k,n:x.n,m:x.m,s:x.s,r:x.r}));
  }
  function fromSaved(session) {
    try {
      const raw = session && session.exercise_notes && session.exercise_notes[META_SLOT];
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(data) ? data.slice(0, MAX_EXTRAS) : [];
    } catch (_) { return []; }
  }
  function toExercise(m) {
    const cat = CATALOG.find(x => x.key === m.k);
    return {
      exercise_key:m.k, exercise_name:m.n, metric_type:m.m,
      planned_sets:m.s, rep_time_range:m.r, target_rir:"",
      rest_superset:"", coaching_notes:cat ? cat.note : "תרגיל שהוספת לאימון",
      load_label:m.k === "step_up" ? "משקל בכל יד" : "משקל / סיוע",
      optional:true, demo_url:""
    };
  }
  function mount(program, history, callbacks) {
    hooks = {...callbacks, program:program || [], history:history || []};
    selected = [];
    $("#extraCards").replaceChildren();
    $("#extrasSection").classList.remove("hidden");
    $("#extraForm").classList.add("hidden");
    $("#extraError").textContent = "";
    if (!wired) wire();
    refresh();
  }
  function add(item, silent) {
    const meta = normal(item);
    if (!meta || !hooks || selected.some(x => x.k === meta.k)) return null;
    if (selected.length >= MAX_EXTRAS) {
      $("#extraError").textContent = "אפשר להוסיף עד שישה תרגילים באימון אחד.";
      return null;
    }
    const outer = document.createElement("div");
    outer.innerHTML = hooks.card(toExercise(meta));
    const card = outer.firstElementChild;
    card.classList.add("extra-added");
    card.dataset.custom = "1";
    card.dataset.extra = meta.k;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "small remove-extra";
    remove.textContent = "הסרת תרגיל";
    remove.setAttribute("aria-label", "הסרת " + meta.n);
    card.append(remove);
    remove.addEventListener("click", () => {
      const hasValues = [...card.querySelectorAll(".setrow input,.exercise-note")].some(i => i.value.trim()) || !!card.querySelector(".complete-toggle:checked");
      if (hasValues && !window.confirm("להסיר את התרגיל ואת הנתונים שהוזנו בו מהאימון הנוכחי?")) return;
      selected = selected.filter(x => x.k !== meta.k);
      card.remove();
      refresh();
      hooks.changed();
    });
    $("#extraCards").append(card);
    selected.push(meta);
    hooks.bindCard(card);
    if (!silent) {
      $("#extraError").textContent = "";
      refresh();
      hooks.changed();
      card.scrollIntoView({behavior:"smooth",block:"center"});
    }
    return card;
  }
  function performedKeys(s) {
    const keys = new Set((s.sets || []).filter(row => row.load_text || row.reps_text || row.duration_seconds || row.rir_text).map(x => x.exercise_key));
    for (const key of s.completed_exercises || []) keys.add(key);
    return keys;
  }
  function refresh() {
    if (!hooks) return;
    const recent = hooks.history.filter(s => (s.sets || []).length || (s.completed_exercises || []).length).slice(0,6);
    const inPlan = new Set(hooks.program.map(x => x.exercise_key));
    const used = new Set(selected.map(x => x.k));
    const eligible = CATALOG.filter(x => !inPlan.has(x.key) && !used.has(x.key));
    const ranked = eligible.map((x, i) => {
      const group = CATEGORY_KEYS[x.group] || [x.key];
      const recentCount = recent.reduce((n,s) => {
        const keys = performedKeys(s);
        return n + (group.some(k => keys.has(k)) ? 1 : 0);
      },0);
      const plannedOverlap = hooks.program.some(p => group.includes(p.exercise_key)) ? 1.5 : 0;
      const selectedOverlap = selected.some(m => group.includes(m.k)) ? 3 : 0;
      return {x, i, score:recentCount + plannedOverlap + selectedOverlap};
    }).sort((a,b) => a.score - b.score || a.i - b.i).slice(0,3);
    $("#extraExplain").textContent = recent.length
      ? "לפי " + recent.length + " האימונים האחרונים שתועדו באפליקציה. ההצעות אינן חובה ואינן מעידות שלא התאמנת מחוץ לאפליקציה."
      : "הצעות כלליות להשלמה. לאחר שיצטבר תיעוד אימונים נוכל להעדיף תנועות שתועדו פחות.";
    $("#extraRecommendations").innerHTML = ranked.length ? ranked.map(({x}) =>
      '<div class="recommendation"><div><strong>'+esc(x.name)+'</strong><div class="rec-label">'+esc(x.label)+'</div><div class="rec-detail">'+x.sets+' × '+esc(x.range)+'</div><div class="rec-note">'+esc(x.note)+'</div></div><button type="button" class="small rec-add" data-recommend="'+esc(x.key)+'">+ הוספה</button></div>'
    ).join("") : '<p class="muted">התרגילים המוצעים כבר מופיעים באימון או שנוספו אליו.</p>';
    $("#extraRecommendations").querySelectorAll("[data-recommend]").forEach(b => b.addEventListener("click", () => {
      const item = CATALOG.find(x => x.key === b.dataset.recommend);
      if (item) add({k:item.key,n:item.name,m:item.metric,s:item.sets,r:item.range});
    }));
  }
  function wire() {
    wired = true;
    $("#showExtraForm").addEventListener("click", () => {
      $("#extraForm").classList.toggle("hidden");
      if (!$("#extraForm").classList.contains("hidden")) $("#extraName").focus();
    });
    $("#cancelExtraForm").addEventListener("click", () => $("#extraForm").classList.add("hidden"));
    $("#extraForm").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#extraName").value.trim().slice(0,70);
      if (!name) { $("#extraError").textContent = "יש להזין שם לתרגיל."; return; }
      const metric = $("#extraMetric").value;
      const identity = (name.normalize("NFKC").toLowerCase() + "|" + metric);
      let hash = 2166136261;
      for (let i=0;i<identity.length;i++) hash = Math.imul(hash ^ identity.charCodeAt(i),16777619);
      const key = "custom_" + (hash >>> 0).toString(16);
      if (add({k:key,n:name,m:metric,s:Number($("#extraSetCount").value),r:"לפי הצורך"})) {
        $("#extraForm").reset();
        $("#extraForm").classList.add("hidden");
      }
    });
  }
  window.WorkoutExtras = {META_SLOT, mount, add, restore:function(metas){
    for(const m of (Array.isArray(metas) ? metas : []).slice(0,MAX_EXTRAS)) add(m, true);
    refresh();
  },serialise,fromSaved,refresh, normal};
})();
