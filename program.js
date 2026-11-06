/* Approved 2026-11-05 prescription. This is planned work, never a completed log. */
(function (root) {
  'use strict';
  const KEY = 'general_v3';
  const MS = 'https://www.muscleandstrength.com/exercises/';
  const catalog = {};
  function add(key, name, muscles, slug, metric='reps', range='8–12', load='משקל / סיוע', family=key, legacy=[]) {
    catalog[key] = {exercise_key:key, exercise_name:name, primary_muscles:muscles,
      demo_url:slug.startsWith('https:')?slug:MS+slug, metric_type:metric,
      rep_time_range:range, planned_sets:2, load_label:load, family, legacy};
  }
  add('leg_press','לחיצת רגליים','ארבע־ראשי וישבן','45-degree-leg-press.html');
  add('cable_row','חתירה בישיבה בכבל','גב, בייספס וכופפי מרפק נוספים','seated-row.html');
  add('rdl','דדליפט רומני — RDL במוט','ירך אחורית וישבן','romanian-deadlift','reps','8–10','משקל כולל במוט');
  add('smith_chest_press','לחיצת חזה בסמית','חזה, טרייספס וכתף קדמית','smith-machine-bench-press.html','reps','6–10','משקל כולל בסמית','chest_press',['chest_press']);
  add('dumbbell_chest_press','לחיצת חזה במשקולות','חזה, טרייספס וכתף קדמית','dumbbell-bench-press.html','reps','6–10','משקל בכל יד','chest_press',['chest_press']);
  add('smith_incline_press','לחיצת חזה בשיפוע בסמית','חזה, טרייספס וכתף קדמית','incline-smith-machine-bench-press.html','reps','6–10','משקל כולל בסמית','incline_press',['incline_press']);
  add('dumbbell_incline_press','לחיצת חזה בשיפוע במשקולות','חזה, טרייספס וכתף קדמית','incline-dumbbell-bench-press.html','reps','6–10','משקל בכל יד','incline_press',['incline_press']);
  add('lat_pulldown','פולי עליון','גב, בייספס וכופפי מרפק נוספים','lat-pull-down.html','reps','8–12','משקל במכונה','vertical_pull');
  add('band_assisted_pullup','מתח בסיוע גומייה','גב, בייספס וכופפי מרפק נוספים','https://video.wixstatic.com/video/27ebac_23d815493cfa4422833f84356fb4ab89/720p/mp4/file.mp4','reps','8–12','חור מהתחתית / סיוע','vertical_pull',['assisted_pullup']);
  add('smith_calf_raise','עליות עקב בסמית','שוקיים','smith-machine-calf-raise.html','reps','10–15','משקל כולל בסמית','calf_raise',['calf_raise']);
  add('leg_press_calf_raise','עליות עקב במכונת לחיצת רגליים','שוקיים','45-degress-calf-press.html','reps','10–15','משקל במכונה','calf_raise',['calf_raise']);
  add('dumbbell_calf_raise','עליות עקב במשקולות','שוקיים','https://www.youtube.com/watch?v=dydznZ_sI_w','reps','10–15','משקל בכל יד','calf_raise',['calf_raise']);
  add('cable_crunch','קראנץ׳ בכבל','בטן','cable-crunch.html','reps','8–15');
  add('split_squat','ספליט סקוואט במשקולות','ארבע־ראשי וישבן','dumbbell-split-squat','reps_per_side','8–10 לכל רגל','משקל בכל יד');
  add('seated_leg_curl','כפיפת ברכיים בישיבה — לג קרל','ירך אחורית','seated-leg-curl','reps','8–12','משקל במכונה','leg_curl',['leg_curl']);
  add('lying_leg_curl','כפיפת ברכיים בשכיבה — לג קרל','ירך אחורית','leg-curl.html','reps','8–12','משקל במכונה','leg_curl',['leg_curl']);
  add('shoulder_press','לחיצת כתפיים בישיבה במשקולות','כתפיים וטרייספס','seated-dumbbell-press.html','reps','8–12','משקל בכל יד');
  add('farmer_carry_distance','פארמר קארי','אחיזה ואמות, חגורת כתפיים ומייצבי גו','farmers-walk','distance','20–40 מטר','משקל בכל יד','farmer_carry',['farmer_carry']);
  add('side_plank','פלאנק צדי','בטן אלכסונית ומייצבי גו צדיים','side-hover.html','seconds_per_side','15–30 שניות לכל צד');
  add('step_up','עלייה למדרגה במשקולות','ארבע־ראשי וישבן','dumbbell-step-up.html','reps_per_side','8–10 לכל רגל','משקל בכל יד');
  add('reverse_crunch','רוורס קראנץ׳','בטן','https://www.youtube.com/watch?v=XY8KzdDcMFg','reps','8–15');
  add('dead_bug','דד באג','בטן ומייצבי גו','dead-bug','reps_per_side','6–10 לכל צד');
  add('dumbbell_curl','כפיפת מרפקים במשקולות','בייספס וכופפי מרפק נוספים','standing-dumbbell-curl.html','reps','8–12','משקל בכל יד','biceps_curl');
  add('cable_curl','כפיפת מרפקים בכבל','בייספס וכופפי מרפק נוספים','cable-curl.html','reps','8–12','משקל בכבל','biceps_curl');
  add('triceps_pushdown','פשיטת מרפקים בכבל','טרייספס','tricep-extension.html');
  add('lateral_raise','הרחקת כתפיים במשקולות','כתף אמצעית','dumbbell-lateral-raise.html','reps','10–15','משקל בכל יד');
  add('dumbbell_reverse_fly','פרפר הפוך במשקולות','כתף אחורית וגב עליון','bent-over-dumbbell-reverse-fly.html','reps','10–15','משקל בכל יד','reverse_fly');
  add('cable_reverse_fly','פרפר הפוך בכבלים','כתף אחורית וגב עליון','bent-over-cable-rear-delt-fly','reps','10–15','משקל בכל צד','reverse_fly');
  add('leg_extension','פשיטת ברכיים — לג אקסטנשן','ארבע־ראשי','leg-extension.html','reps','10–15','משקל במכונה');
  add('hip_thrust','היפ תראסט במוט','ישבן','barbell-hip-thrust','reps','8–12','משקל כולל במוט');
  add('reverse_lunge','לאנג׳ לאחור במשקולות','ארבע־ראשי וישבן','https://prestige-fit.com/exercises/lunge/dumbbell-reverse-lunge/','reps_per_side','8–10 לכל רגל','משקל בכל יד');
  add('lateral_lunge','לאנג׳ צדי','ירכיים וישבן','bodyweight-side-lunge.html','reps_per_side','8–10 לכל צד');
  add('band_lateral_walk','צעדים צידיים עם גומייה סביב הרגליים','מרחיקי ירך ושרירי הישבן','lateral-band-walk','reps_per_side','8–12 צעדים לכל כיוון','גומייה / התנגדות');
  add('v_up','V-up / אולרים','בטן וכופפי ירך','https://www.catalystathletics.com/exercise/313/V-Up/','reps','6–12');
  add('pallof_press','פאלוף פרס בכבל','מייצבי גו נגד סיבוב','pallof-press','reps_per_side','8–12 לכל צד');
  add('russian_twist','ראשן טוויסט בשליטה','בטן ואלכסונים','russian-twist.html','reps_per_side','8–12 לכל צד');
  add('impact_jumps','קפיצות אנכיות וצידיות','רגליים וישבן','bodyweight-jump-squat.html','reps','10 קפיצות בסט','ללא משקל');
  catalog.impact_jumps.second_demo_url='https://www.youtube.com/watch?v=g0AWUXKUinQ';
  const families={
    chest_press:['smith_chest_press','dumbbell_chest_press'],
    incline_press:['smith_incline_press','dumbbell_incline_press'],
    vertical_pull:['lat_pulldown','band_assisted_pullup'],
    calf_raise:['smith_calf_raise','leg_press_calf_raise','dumbbell_calf_raise'],
    leg_curl:['seated_leg_curl','lying_leg_curl'],
    biceps_curl:['dumbbell_curl','cable_curl'],
    reverse_fly:['dumbbell_reverse_fly','cable_reverse_fly']
  };
  // [family/key, sets, range override, paired-set group]. Lower body is first.
  const plans={
    A:[['leg_press',3,'6–10','1'],['cable_row',2,'8–12','1'],['rdl',2,'6–10','2'],['chest_press',3,'6–10','2'],['calf_raise',2,'10–15','3'],['vertical_pull',2,'8–12','3'],['cable_crunch',2,'8–15','']],
    B:[['split_squat',3,'8–10 לכל רגל','1'],['cable_row',2,'8–12','1'],['leg_curl',2,'8–12','2'],['incline_press',3,'6–10','2'],['vertical_pull',2,'8–12',''],['shoulder_press',2,'8–12',''],['farmer_carry_distance',2,'20–40 מטר',''],['side_plank',2,'15–30 שניות לכל צד','']],
    C:[['step_up',3,'8–10 לכל רגל','1'],['cable_row',2,'8–12','1'],['rdl',2,'8–10','2'],['chest_press',3,'8–12','2'],['calf_raise',2,'10–15','3'],['vertical_pull',2,'8–12','3'],['farmer_carry_distance',2,'20–40 מטר',''],['reverse_crunch',2,'8–15','']],
    D:[['leg_press',2,'8–12','1'],['cable_row',2,'8–12','1'],['leg_curl',2,'8–12','2'],['chest_press',2,'8–12','2'],['farmer_carry_distance',2,'20–40 מטר',''],['dead_bug',2,'6–10 לכל צד','']]
  };
  const fixed={A:['leg_curl','biceps_curl'],B:['triceps_pushdown','lateral_raise'],C:['leg_extension','reverse_fly'],D:['biceps_curl','triceps_pushdown']};
  const coreSuggestion={A:'dead_bug',B:'pallof_press',C:'russian_twist',D:'reverse_crunch'};
  const choices=['biceps_curl','triceps_pushdown','lateral_raise','reverse_fly','leg_curl','leg_extension','hip_thrust','calf_raise','reverse_lunge','lateral_lunge','band_lateral_walk','cable_crunch','side_plank','reverse_crunch','dead_bug','pallof_press','russian_twist','v_up'];
  function resolve(family, preferences={}) {
    const options=families[family]||[family];
    const key=options.includes(preferences[family])?preferences[family]:options[0];
    if(!catalog[key])return null;
    return {...catalog[key],slot_id:family,options,variant_label:options.length>1?catalog[key].exercise_name:''};
  }
  function exercises(code, preferences={}) {
    return (plans[code]||[]).map(([key,sets,range,group],i)=>({...resolve(key,preferences),
      program_key:KEY,program_name:'התוכנית הכללית',workout_code:code,exercise_order:i+1,
      planned_sets:sets,rep_time_range:range,superset_group:group,section:'main',optional:false,target_rir:code==='D'?'3–4':'1–3'}));
  }
  const hasValue=v=>String(v??'').trim()!=='';
  function rowPerformed(row,session) {
    return hasValue(row.reps_text)||hasValue(row.duration_seconds)||
      (session.completed_exercises||[]).includes(row.slot_id||row.exercise_key);
  }
  function validSession(s){return (s.completed_exercises||[]).some(k=>k!=='impact_jumps'&&!k.startsWith('__'))||(s.sets||[]).some(r=>r.exercise_key!=='impact_jumps'&&rowPerformed(r,s));}
  function sorted(history){return [...(history||[])].sort((a,b)=>String(b.performed_at).localeCompare(String(a.performed_at))||String(b.created_at||'').localeCompare(String(a.created_at||'')));}
  function nextWorkout(history, date) {
    const last=sorted(history).find(s=>s.program_key===KEY&&['A','B','C'].includes(s.workout_code)&&(!date||s.performed_at<=date)&&validSession(s));
    return last?{A:'B',B:'C',C:'A'}[last.workout_code]:'A';
  }
  function previous(e,history,{date='',sessionId=''}={}) {
    const sessions=sorted(history).filter(s=>s.id!==sessionId&&(!date||s.performed_at<=date));
    for(const s of sessions){
      const rows=(s.sets||[]).filter(r=>r.exercise_key===e.exercise_key&&rowPerformed(r,s));
      let variants={};try{variants=JSON.parse(s.exercise_notes?.__noga_ui_v3__||'{}').variants||{};}catch{}
      const marked=(s.completed_exercises||[]).some(slot=>{
        if(variants[slot])return variants[slot]===e.exercise_key;
        return slot===e.exercise_key||((s.program_snapshot||[]).some(x=>(x.slot_id||x.exercise_key)===slot&&x.exercise_key===e.exercise_key));
      });
      if(rows.length||marked)return{s,rows,legacy:false};
    }
    // Older generic equipment keys are shown as explicitly unspecified history,
    // never as a comparable Smith/machine/dumbbell measurement.
    for(const s of sessions){
      const rows=(s.sets||[]).filter(r=>(e.legacy||[]).includes(r.exercise_key)&&rowPerformed(r,s));
      if(rows.length)return{s,rows,legacy:true};
    }
    return null;
  }
  const api={KEY,catalog,families,plans,fixed,choices,coreSuggestion,resolve,exercises,previous,nextWorkout,validSession,sorted};
  root.WorkoutProgram=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
