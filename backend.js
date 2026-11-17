/* Isolated public Supabase API, no service credentials. */
(function(){
'use strict';
var ROOT='https://yptvjhqqdqrfanixqafg.supabase.co/rest/v1/';
var KEY='sb_publishable__bn0iaZ23UhHXJzPbluavQ_ubmhxv6V';
async function request(path,method,data){
 var opts={method:method||'GET',cache:'no-store',headers:{apikey:KEY,Accept:'application/json'}};
 if(data){opts.headers['Content-Type']='application/json';opts.headers.Prefer='return=minimal';opts.body=JSON.stringify(data);}
 var res=await fetch(ROOT+path,opts);
 if(!res.ok){var txt=await res.text();throw new Error('Supabase HTTP '+res.status+' '+txt.slice(0,150));}
 if(method==='POST'||res.status===204)return null;
 return await res.json();
}
window.SKWS_BACKEND={
 project:'yptvjhqqdqrfanixqafg',
 async load(){
  var [members,groups,squads]=await Promise.all([
   request('cc_members?select=name,display_name,rank,sort_order,group_id,role,origin&order=sort_order.asc&limit=300'),
   request('cc_groups?select=id,controller_name,label&order=id.asc&limit=20'),
   request('cc_squads?select=name,squads,source_updated,updated_at&limit=300')
  ]);
  if(!Array.isArray(members)||!Array.isArray(groups)||!Array.isArray(squads)||!members.length||groups.length!==5)throw Error('Unvollständiger Datenstand');
  return {members,groups,squads};
 },
 submit(name,squads){
  if(!name||!Array.isArray(squads)||squads.length!==4||!squads[0])return Promise.reject(new Error('T1 ist erforderlich'));
  return request('cc_submissions','POST',{name,squads});
 },
 async loadTracking(){
  var since=new Date();since.setDate(since.getDate()-90);
  var from=since.toISOString().slice(0,10);
  var [metrics,shields,events,seasons]=await Promise.all([
   request('cc_metric_entries?select=member_name,metric,metric_value,recorded_on,notes&recorded_on=gte.'+from+'&order=recorded_on.desc&limit=1000'),
   request('cc_shields?select=member_name,shield_status,expires_at,verified_at&limit=300'),
   request('cc_events?select=id,title,category,starts_at,ends_at,description,location_note&order=starts_at.asc&limit=300'),
   request('cc_seasons?select=id,title,phase,starts_on,ends_on,notes&order=created_at.desc&limit=30')
  ]);
  if(!Array.isArray(metrics)||!Array.isArray(shields)||!Array.isArray(events)||!Array.isArray(seasons))throw new Error('Tracking-Daten nicht lesbar');
  return {metrics:metrics,shields:shields,events:events,seasons:seasons};
 },
 submitMetric(data){
  if(!data||!data.member_name||!['vs_points','donations','storm_score','kills','train_points'].includes(data.metric))return Promise.reject(new Error('Ungültiger Bericht'));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data.recorded_on)||!Number.isFinite(Number(data.metric_value))||Number(data.metric_value)<0||Number(data.metric_value)>999999999999)return Promise.reject(new Error('Ungültiges Datum oder Punkte'));
  return request('cc_metric_reports','POST',{member_name:data.member_name,metric:data.metric,metric_value:Number(data.metric_value),recorded_on:data.recorded_on,notes:(data.notes||'').slice(0,280)});
 },
 submitShield(data){
  if(!data||!data.member_name||!['active','missing','unknown'].includes(data.shield_status))return Promise.reject(new Error('Ungültiger Schildstatus'));
  return request('cc_shield_reports','POST',{member_name:data.member_name,shield_status:data.shield_status,expires_at:data.shield_status==='active'?(data.expires_at||null):null,notes:(data.notes||'').slice(0,280)});
 },
 proposeEvent(data){
  if(!data||!data.requester_name||!data.title||!data.starts_at||!['alliance','vs','storm','train','custom'].includes(data.category))return Promise.reject(new Error('Ungültiger Termin'));
  return request('cc_event_proposals','POST',{requester_name:data.requester_name,title:data.title.slice(0,110),category:data.category,starts_at:data.starts_at,ends_at:data.ends_at||null,description:(data.description||'').slice(0,1000)});
 }
};
})();