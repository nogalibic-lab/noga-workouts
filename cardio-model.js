/* Shared, deterministic weekly arithmetic. No health records or credentials. */
(function (root) {
  'use strict';
  const round = n => Math.round((Number(n) + Number.EPSILON) * 10) / 10;
  const num = v => Number(String(v ?? '').replace(',', '.'));
  function day(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error('invalid_date');
    const d = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new Error('invalid_date');
    return d;
  }
  const dateString = d => d.toISOString().slice(0, 10);
  function today() {
    const p = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get = key => p.find(x => x.type === key).value;
    return get('year') + '-' + get('month') + '-' + get('day');
  }
  function addDays(value, delta) { const d = day(value); d.setUTCDate(d.getUTCDate() + delta); return dateString(d); }
  function week(value = today(), offset = 0) {
    const d = day(value), weekday = d.getUTCDay();
    const start = addDays(value, -weekday + offset * 7);
    return {start, end:addDays(start, 6), weekday};
  }
  function summarize(sessions, start, end, target = 75) {
    const rows = sessions.filter(s => !s.deleted_at && s.performed_at >= start && s.performed_at <= end);
    const sum = key => round(rows.reduce((n,s) => n + Number(s[key] || 0), 0));
    const vigorous = sum('vigorous_minutes'), moderate = sum('moderate_minutes');
    const equivalent = round(vigorous + moderate / 2);
    return {rows,total:sum('duration_minutes'),vigorous,moderate,equivalent,target,remaining:round(Math.max(0,target-equivalent)),
      runMinutes:round(rows.filter(s=>s.activity_type==='run').reduce((n,s)=>n+Number(s.duration_minutes),0)),
      runningDays:new Set(rows.filter(s=>s.activity_type==='run').map(s=>s.performed_at)).size};
  }
  function checkpoint(sessions, value = today(), plan = {}) {
    const w = week(value), stats = summarize(sessions,w.start,w.end,Number(plan.weekly_target || 75));
    const phase = w.weekday >= 5 ? 'end' : w.weekday >= 3 ? 'middle' : 'early';
    const daily = Math.max(0, Number(plan.daily_run_goal || 0));
    const ranToday = stats.rows.some(s=>s.performed_at===value && s.activity_type==='run' && Number(s.duration_minutes)>=daily);
    const opportunities = Math.max(0, 6-w.weekday + (ranToday ? 0 : 1));
    const forecast = round(daily * opportunities);
    const extra = round(Math.max(0,stats.remaining-forecast));
    const hiitDone = stats.rows.some(s=>s.activity_type.startsWith('hiit'));
    return {...stats,phase,opportunities,forecast,extra,hiitDone,met:stats.remaining===0};
  }
  function validate(raw, now = today()) {
    day(raw.performed_at);
    if (raw.performed_at > now) throw new Error('אפשר לתעד רק אימון שבוצע היום או בעבר.');
    if (!['run','hiit_run','hiit_rope','walk','other'].includes(raw.activity_type)) throw new Error('יש לבחור סוג פעילות.');
    const duration = num(raw.duration_minutes);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 300) throw new Error('משך האימון צריך להיות גדול מאפס ועד 300 דקות.');
    const intensity = raw.intensity;
    if (!['vigorous','moderate','light','mixed'].includes(intensity)) throw new Error('יש לבחור את העצימות שהרגשת בפועל.');
    if (raw.activity_type.startsWith('hiit') && intensity !== 'mixed') throw new Error('ב־HIIT יש להפריד את דקות המאמץ וההתאוששות.');
    const vigorous = intensity==='vigorous' ? duration : intensity==='mixed' ? num(raw.vigorous_minutes || 0) : 0;
    const moderate = intensity==='moderate' ? duration : intensity==='mixed' ? num(raw.moderate_minutes || 0) : 0;
    if (![vigorous,moderate].every(n=>Number.isFinite(n)&&n>=0) || vigorous+moderate>duration+0.001) throw new Error('דקות המאמץ והפעילות המתונה יחד אינן יכולות לעלות על משך האימון.');
    function hr(v) {
      if (v==null || String(v).trim()==='') return null;
      const n=num(v);
      if (!Number.isInteger(n)||n<30||n>240) throw new Error('דופק צריך להיות מספר שלם בין 30 ל־240, או להישאר ריק.');
      return n;
    }
    const avg=hr(raw.avg_hr), max=hr(raw.max_hr);
    if (avg && max && avg>max) throw new Error('הדופק הממוצע אינו יכול להיות גבוה מהדופק המרבי.');
    return {id:raw.id,revision:Number(raw.revision||0),performed_at:raw.performed_at,activity_type:raw.activity_type,
      duration_minutes:round(duration),vigorous_minutes:round(vigorous),moderate_minutes:round(moderate),
      avg_hr:avg,max_hr:max,notes:String(raw.notes||'').trim().slice(0,1500)};
  }
  const api = Object.freeze({round,day,today,addDays,week,summarize,checkpoint,validate});
  root.CardioModel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
