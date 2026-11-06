const fs=require('node:fs'),P=require('../program.js');
const cols=['program_key','program_name','workout_code','exercise_order','section','exercise_key','exercise_name','planned_sets','rep_time_range','target_rir','rest_superset','coaching_notes','demo_url','optional','metric_type','load_label','superset_group'];
const rows=[];
for(const code of ['A','B','C','D']){
 const items=P.exercises(code);
 items.push(...P.fixed[code].map((f,i)=>({...P.resolve(f),program_key:P.KEY,program_name:'התוכנית הכללית',workout_code:code,exercise_order:21+i,section:'bonus',optional:true,target_rir:code==='D'?'3–4':'1–3',superset_group:''})));
 for(const e of items)rows.push(Object.fromEntries(cols.map(k=>[k,e[k]??''])));
}
const values=JSON.stringify(rows).replaceAll("'","''");
const sql=`-- Preserve all earlier prescriptions and workout logs. No existing rows are changed.\nALTER TABLE public.app_program_exercises DROP CONSTRAINT app_program_exercises_program_key_check;\nALTER TABLE public.app_program_exercises ADD CONSTRAINT app_program_exercises_program_key_check CHECK (program_key IN ('general','emphasis','general_v2','emphasis_v2','general_v3'));\nALTER TABLE public.app_workout_sessions DROP CONSTRAINT app_workout_sessions_program_key_check;\nALTER TABLE public.app_workout_sessions ADD CONSTRAINT app_workout_sessions_program_key_check CHECK (program_key IN ('general','emphasis','general_v2','emphasis_v2','general_v3'));\n-- Earlier seed rows used explicit IDs; align the existing identity sequence before adding rows.\nSELECT setval(pg_get_serial_sequence('public.app_program_exercises','id'), (SELECT max(id) FROM public.app_program_exercises), true);\nINSERT INTO public.app_program_exercises (${cols.join(',')})\nSELECT ${cols.join(',')} FROM jsonb_populate_recordset(null::public.app_program_exercises, '${values}'::jsonb)\nON CONFLICT (program_key,workout_code,exercise_order) DO NOTHING;\n`;
fs.mkdirSync('supabase/migrations',{recursive:true});fs.writeFileSync('supabase/migrations/202611060001_rolling_general_program.sql',sql);
console.log(`${rows.length} program rows, main volumes ${['A','B','C','D'].map(c=>P.exercises(c).reduce((n,e)=>n+e.planned_sets,0)).join('/')}`);
