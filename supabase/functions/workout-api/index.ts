import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-workout-key","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Cache-Control":"no-store"};
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
const clean=(v:unknown,n=300)=>String(v??"").trim().slice(0,n);
async function sha256(s:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function access(req:Request){
  const token=clean(req.headers.get("x-workout-key"),256);
  if(!token)return null;
  const h=await sha256(token);
  const {data,error}=await db.from("app_access_keys").select("user_key,is_owner").eq("token_hash",h).is("revoked_at",null).maybeSingle();
  if(error)throw error; return data;
}
async function history(user:string){
  const sessions:any[]=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await db.from("app_workout_sessions")
      .select("id,program_key,workout_code,performed_at,duration_minutes,notes,revision,exercise_notes,completed_exercises,created_at,program_snapshot")
      .eq("user_key",user).order("performed_at",{ascending:false}).order("created_at",{ascending:false}).order("id").range(offset,offset+499);
    if(error)throw error;sessions.push(...(data??[]));if((data??[]).length<500)break;
  }
  const by=new Map<string,any[]>();
  for(let start=0;start<sessions.length;start+=40){
    const ids=sessions.slice(start,start+40).map(s=>s.id);
    for(let offset=0;;offset+=500){
      const {data,error}=await db.from("app_workout_sets")
        .select("session_id,exercise_key,exercise_name,set_number,load_text,reps_text,duration_seconds,rir_text,notes,slot_id,variant_label")
        .eq("user_key",user).in("session_id",ids).order("id").range(offset,offset+499);
      if(error)throw error;
      for(const x of data??[]){const rows=by.get(x.session_id)||[];rows.push(x);by.set(x.session_id,rows);}
      if((data??[]).length<500)break;
    }
  }
  return sessions.map(s=>({...s,sets:(by.get(s.id)||[]).sort((a,b)=>a.set_number-b.set_number)}));
}
function validate(p:any){
  if(!p||typeof p!=="object")throw new Error("invalid_payload");
  if(!["general","emphasis","general_v2","emphasis_v2","general_v3"].includes(p.program_key))throw new Error("invalid_program");
  if(!["A","B","C","D","2A","2B"].includes(p.workout_code))throw new Error("invalid_workout");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(clean(p.performed_at,10)))throw new Error("invalid_date");
  const d=clean(p.duration_minutes,4);
  if(d&&(Number(d)<1||Number(d)>300||!Number.isInteger(Number(d))))throw new Error("invalid_duration");
  if(!Array.isArray(p.exercises)||p.exercises.length>30)throw new Error("invalid_exercises");
  if(p.completed_exercises!=null&&(!Array.isArray(p.completed_exercises)||p.completed_exercises.length>30))throw new Error("invalid_completed");
  for(const ex of p.exercises){if(!Array.isArray(ex.sets)||ex.sets.length>20)throw new Error("invalid_sets")}
}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const a=await access(req); if(!a)return out({error:"קישור הגישה אינו תקין או שפג תוקפו."},401);
    const u=new URL(req.url), action=u.searchParams.get("action")||"bootstrap";
    if(req.method==="GET"&&action==="bootstrap"){
      const [{data:user,error:ue},{data:programs,error:pe},h]=await Promise.all([
        db.from("app_users").select("user_key,display_name,default_program").eq("user_key",a.user_key).eq("active",true).single(),
        db.from("app_program_exercises").select("program_key,program_name,workout_code,exercise_order,section,exercise_key,exercise_name,planned_sets,rep_time_range,target_rir,rest_superset,coaching_notes,demo_url,optional,metric_type,load_label,superset_group").order("program_key").order("workout_code").order("exercise_order"),
        history(a.user_key)
      ]);
      if(ue||pe)throw ue||pe;
      return out({user,programs:programs??[],history:h,is_owner:a.is_owner});
    }
    if(req.method==="GET"&&action==="history")return out({history:await history(a.user_key)});
    if(req.method==="POST"&&action==="save"){
      const p=await req.json(); validate(p);
      p.id=clean(p.id,36); if(!/^[0-9a-f-]{36}$/i.test(p.id))throw new Error("invalid_session_id");
      p.revision=Number.isInteger(Number(p.revision))?Number(p.revision):0;
      p.notes=clean(p.notes,2000); p.duration_minutes=clean(p.duration_minutes,4);
      const completed=[...new Set((p.completed_exercises||[]).map((x:unknown)=>clean(x,100)).filter(Boolean))].slice(0,30);
      const notes:any={}; const exercises:any[]=[];
      for(const ex of p.exercises){
        const key=clean(ex.exercise_key,80), slot=clean(ex.slot_id||ex.exercise_key,100), name=clean(ex.exercise_name,120), variant=clean(ex.variant_label,120);
        const en=clean(ex.exercise_note,key==="__noga_ui_v3__"?8000:1500); if(en)notes[slot]=en;
        const sets=(ex.sets||[]).map((s:any,i:number)=>({
          set_number:Number.isInteger(s.set_number)&&s.set_number>=1&&s.set_number<=20?s.set_number:i+1,load_text:clean(s.load_text,80),reps_text:clean(s.reps_text,40),duration_seconds:clean(s.duration_seconds,40),rir_text:clean(s.rir_text,120),notes:clean(s.notes,500)
        })).filter((s:any)=>s.load_text||s.reps_text||s.duration_seconds||s.rir_text||s.notes);
        if(sets.length||en)exercises.push({slot_id:slot,exercise_key:key,exercise_name:name,variant_label:variant,sets});
      }
      p.exercises=exercises;p.exercise_notes=notes;p.completed_exercises=completed;
      const {data:snapshot,error:pe}=await db.from("app_program_exercises").select("*").eq("program_key",p.program_key).eq("workout_code",p.workout_code).order("exercise_order");
      if(pe)throw pe;
      const canonical=JSON.stringify({
        performed_at:p.performed_at,program_key:p.program_key,workout_code:p.workout_code,
        duration_minutes:p.duration_minutes,notes:p.notes,exercises:p.exercises,exercise_notes:p.exercise_notes,completed_exercises:p.completed_exercises
      });
      const hash=await sha256(canonical);
      // Resolve ordinary stale/retried writes before the transactional RPC.
      // Its advisory lock still protects concurrent writes and ownership.
      const {data:existing,error:readError}=await db.from("app_workout_sessions")
        .select("user_key,revision,content_hash").eq("id",p.id).maybeSingle();
      if(readError)throw readError;
      if(existing&&existing.user_key!==a.user_key)return out({error:"אין הרשאה."},403);
      if(existing?.content_hash===hash)return out({ok:true,id:p.id,revision:existing.revision,duplicate:true});
      if((existing&&existing.revision!==p.revision)||(!existing&&p.revision!==0))
        return out({error:"האימון השתנה מאז שנפתח. רענני לפני שמירה נוספת.",code:"revision_conflict"},409);
      const {data,error}=await db.rpc("save_workout_v2",{p_user:a.user_key,p_payload:p,p_hash:hash,p_snapshot:snapshot??[]});
      if(error){
        if(error.message?.includes("revision_conflict"))return out({error:"האימון השתנה מאז שנפתח. רענני לפני שמירה נוספת.",code:"revision_conflict"},409);
        throw error;
      }
      return out({ok:true,...data});
    }
    if(req.method==="POST"&&action==="create_guest"){
      if(!a.is_owner)return out({error:"אין הרשאה."},403);
      const p=await req.json(),name=clean(p.display_name,80);if(name.length<2)return out({error:"יש להזין שם."},400);
      const userKey="u_"+crypto.randomUUID().replaceAll("-","").slice(0,16);
      const token=crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","");
      const hash=await sha256(token);
      const {error}=await db.rpc("create_workout_guest_v2",{p_issuer:a.user_key,p_key:userKey,p_name:name,p_hash:hash});if(error)throw error;
      return out({ok:true,user_key:userKey,token});
    }
    return out({error:"לא נמצא."},404);
  }catch(e){
    console.error(e);
    return out({error:"הפעולה נכשלה. נסי שוב.",detail:e instanceof Error?e.message:String(e)},500);
  }
});