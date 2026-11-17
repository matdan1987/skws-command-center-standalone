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
async function loadAllMetrics(from){
 var rows=[],page=0,chunk=1000;
 for(;page<30;page++){
  var next=await request('cc_metric_entries?select=member_name,metric,metric_value,recorded_on,notes&recorded_on=gte.'+from+'&order=recorded_on.desc,member_name.asc,metric.asc&limit='+chunk+'&offset='+(page*chunk));
  if(!Array.isArray(next))throw Error('Tracking-Paginierung fehlgeschlagen');
  rows.push(...next);
  if(next.length<chunk)return rows;
 }
 throw Error('Tracking umfasst zu viele Werte; bitte Zeitraum begrenzen');
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
  var [metrics,shields,events,seasons,vsStrategies,stormMatches,stormRoster,activityRules]=await Promise.all([
   loadAllMetrics(from),
   request('cc_shields?select=member_name,shield_status,expires_at,verified_at&limit=300'),
   request('cc_events?select=id,title,category,starts_at,ends_at,description,location_note&order=starts_at.asc&limit=300'),
   request('cc_seasons?select=id,title,phase,starts_on,ends_on,notes&order=created_at.desc&limit=30'),
   request('cc_vs_week_strategies?select=week_start,mode,daily_target_points,notes&order=week_start.desc&limit=40'),
   request('cc_desert_storm_matches?select=id,event_date,team,starts_at,opponent,result,own_points,enemy_points,notes&order=event_date.desc&limit=150'),
   request('cc_desert_storm_roster?select=id,match_id,member_name,slot,attendance,individual_points,notes&limit=1000'),
   request('cc_activity_rules?select=id,min_daily_donations,min_storm_individual_points,min_final_vs_days,min_final_donation_days,weight_vs,weight_donations,weight_storm,highlight_score,lowlight_score,notes&limit=1')
  ]);
  if(!Array.isArray(metrics)||!Array.isArray(shields)||!Array.isArray(events)||!Array.isArray(seasons)||!Array.isArray(vsStrategies)||!Array.isArray(stormMatches)||!Array.isArray(stormRoster)||!Array.isArray(activityRules))throw new Error('Tracking-Daten nicht lesbar');
  return {metrics:metrics,shields:shields,events:events,seasons:seasons,vsStrategies:vsStrategies,stormMatches:stormMatches,stormRoster:stormRoster,activityRules:activityRules};
 },
 submitMetric(data){
  if(!data||!data.member_name||!['vs_points','donations','kills','train_points'].includes(data.metric))return Promise.reject(new Error('Ungültiger Bericht'));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data.recorded_on)||!Number.isFinite(Number(data.metric_value))||Number(data.metric_value)<0||Number(data.metric_value)>999999999999)return Promise.reject(new Error('Ungültiges Datum oder Punkte'));
  if(data.metric==='vs_points'&&new Date(data.recorded_on+'T12:00:00').getDay()===0)return Promise.reject(new Error('Sonntag zählt nicht zur VS-Wertung'));
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