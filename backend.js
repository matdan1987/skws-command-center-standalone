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
 }
};
})();