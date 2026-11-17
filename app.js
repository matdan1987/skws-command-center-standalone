/* SKWS Command Center Standalone. No backend, no production endpoints. */
(function(){
'use strict';
var KEY='skws_command_center_standalone_online_v3';
var VIEWS={overview:'ÜBERSICHT',groups:'MENTORENGRUPPEN',members:'MITGLIEDER',entry:'TRUPPEN MELDEN',history:'ÄNDERUNGSVERLAUF',system:'SYSTEM & DATEN'};
var TYPES=['Tank','Flugzeug','Rakete','Gemischt'];
var SNAPSHOT=window.SKWS_SNAPSHOT||{members:[],entries:[]};
function initial(){
 var lookup={};(SNAPSHOT.entries||[]).forEach(function(e){lookup[e.name]=e;});
 var types={tank:'Tank',aircraft:'Flugzeug',missile:'Rakete',mixed:'Gemischt'};
 var players=(SNAPSHOT.members||[]).map(function(m,i){
  var e=lookup[m.name],ss=e&&Array.isArray(e.squads)?e.squads:[];
  var squads=[0,1,2,3].map(function(j){var s=ss[j];return s&&s.type&&s.power!=null&&Number(s.power)>0?{type:types[s.type]||s.type,power:Number(s.power)}:null;});
  return {id:'snapshot-'+i,name:String(m.name),group:0,rank:m.rank||'R1',updated:e?e.updated:null,squads:squads};
 });
 return {version:2,players:players,history:[]};
}
function valid(data){return data&&data.version===2&&Array.isArray(data.players)&&data.players.length<=500&&Array.isArray(data.history)&&data.history.length<=500&&data.players.every(function(p){return p&&typeof p.name==='string'&&p.name.length<=90&&[0,1,2,3,4,5].includes(Number(p.group))&&Array.isArray(p.squads)&&p.squads.length===4;});}
var state;try{state=JSON.parse(localStorage.getItem(KEY)||'null');if(!valid(state))state=initial();}catch(e){state=initial();}

var PLAN=window.SKWS_MENTOR_GROUPS||{groups:[],aliases:{}};
function applyGroupPlan(){
 var roster=new Set((SNAPSHOT.members||[]).map(function(m){return m.name.toLowerCase();}));
 // Veralteten, nicht bearbeiteten Doppel-Eintrag aus früheren Gruppenständen bereinigen.
 state.players=state.players.filter(function(p){
  return !(p.id==='group-only-1-Mentor-Harald Thorsson'&&!reported(p));
 });
 state.players.forEach(function(p){p.group=0;p.role='Unzugeordnet';p.listedOnly=!roster.has(p.name.toLowerCase());});
 function assign(name,g,role){
  var real=(PLAN.aliases||{})[name]||name;
  var p=state.players.find(function(p){return p.name.toLowerCase()===real.toLowerCase();});
  if(!p){p={id:'group-only-'+g+'-'+role+'-'+name,name:name,rank:'—',group:0,role:'Unzugeordnet',listedOnly:true,updated:null,squads:[null,null,null,null]};state.players.push(p);}
  p.group=g;p.role=role;p.groupDisplayName=(name!==p.name?name:null);
 }
 (PLAN.groups||[]).forEach(function(g){assign(g.controller,g.id,'R4-Kontrolle');g.mentors.forEach(function(n){assign(n,g.id,'Mentor');});g.members.forEach(function(n){assign(n,g.id,'Mitglied');});});
}
applyGroupPlan();

var view='overview',editing=null,query='',grp='all',status='all',backendConnected=false,backendError='Verbindungsaufbau',lastSynced=null;
var root=document.getElementById('content'),toastNode=document.getElementById('toast');
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function num(n){return Number(n).toLocaleString('de-DE',{maximumFractionDigits:2});}
function sum(arr){return arr.reduce(function(s,p){return s+(p.squads[0]?Number(p.squads[0].power):0);},0);}
function reported(p){return !!(p.squads&&p.squads[0]);}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function notify(msg){toastNode.textContent=msg;toastNode.classList.add('show');setTimeout(function(){toastNode.classList.remove('show');},3000);}
function button(label,target,primary){return '<button class="btn'+(primary?' primary':'')+'" data-view="'+target+'">'+label+'</button>';}
function heading(k,title,desc,actions){return '<div class="heading"><div><div class="eyebrow">'+k+'</div><h1>'+title+'</h1><p class="muted">'+desc+'</p></div><div class="actions">'+(actions||'')+'</div></div>';}
function card(label,val,detail){return '<div class="stat"><div class="stat-label">'+label+'</div><div class="stat-value">'+val+'</div><div class="detail">'+detail+'</div></div>';}
function table(list){
return '<div class="table-wrap"><table><thead><tr><th>Spieler</th><th>Gruppe</th><th>Funktion</th><th>Rang</th><th>T1-Typ</th><th>T1-Kampfkraft</th><th>Meldestatus</th><th></th></tr></thead><tbody>'+list.map(function(p){
 var t=p.squads[0],statusText=p.listedOnly?'Nicht im Datenstand':t?'Gemeldet':'Ausstehend';
 return '<tr><td class="player">'+esc(p.groupDisplayName||p.name)+(p.groupDisplayName?'<div class="dim">Squad-Name: '+esc(p.name)+'</div>':'')+'</td><td>'+(p.group?'G'+p.group:'Offen')+'</td><td><span class="role-chip">'+esc(p.role||'Unzugeordnet')+'</span></td><td>'+esc(p.rank)+'</td><td>'+(t?esc(t.type):'–')+'</td><td>'+(t?'<b>'+num(t.power)+' M</b>':'–')+'</td><td><span class="pill '+(p.listedOnly?'unmatched':t?'':'empty')+'">'+statusText+'</span></td><td><button class="inline-btn" data-edit="'+esc(p.id)+'">Bearbeiten ↗</button></td></tr>';
}).join('')+'</tbody></table>'+(list.length?'':'<div class="empty">Keine Spieler gefunden.</div>')+'</div>';
}
function overview(){
var assigned=state.players.filter(function(p){return p.role==='Mentor'||p.role==='Mitglied';});
var ment=assigned.filter(function(p){return p.role==='Mentor';}).length;
var control=state.players.filter(function(p){return p.role==='R4-Kontrolle';}).length;
var base=(SNAPSHOT.members||[]).length;
var reportedBase=(SNAPSHOT.entries||[]).length;
var bars=PLAN.groups.map(function(g){
 var m=assigned.filter(function(p){return p.group===g.id;}),done=m.filter(reported).length,pct=m.length?Math.round(done/m.length*100):0;
 return '<div><div class="group-head"><span>Gruppe '+g.id+' · '+esc(g.controller)+'</span><small>'+done+' / '+m.length+' T1 · '+pct+' %</small></div><div class="progress"><div style="width:'+pct+'%"></div></div></div>';
}).join('');
var top=state.players.filter(reported).sort(function(a,b){return b.squads[0].power-a.squads[0].power;}).slice(0,5);
return heading('ALLIANZ / OVERVIEW','SKWS Command Center','Skywalkers · Server 1858 · eigenständige Online-Datenbank',button('Mentorengruppen öffnen ↗','groups',true))+
'<div class="notice">◉ <b>Eigenständiges Projekt.</b> Eigenständige Online-Datenbank mit echten Squad-Daten und Mentorengruppen. Keine Verbindung zum Produktivsystem. Neue Meldungen werden geprüft.</div>'+
'<div class="stats">'+card('Squad-Spielerliste',base,'Aus lesender Datenkopie')+card('Gruppenspieler',assigned.length,'Inklusive '+ment+' Mentoren')+card('Bestätigte Mentoren',ment,'In 5 Mentorengruppen')+card('R4-Kontrolle',control,'Zusätzlich zu 78 Spielern')+'</div>'+
'<div class="notice neutral"><b>Verbindung:</b> '+(backendConnected?'Online · aktualisiert '+(lastSynced?new Date(lastSynced).toLocaleTimeString('de-DE'):'gerade'):'Offline: '+esc(backendError)+' · Reservekopie')+'<div style="height:8px"></div><b>Truppenmeldungen:</b> '+reportedBase+' von '+base+' Spielern haben T1 eingetragen. '+(base-reportedBase)+' Spieler noch ohne T1. Drei Namen der Mentorengruppen sind bisher nicht exakt in der Squad-Liste enthalten.</div>'+
'<div class="grid-two"><section class="panel"><h2>T1-Abdeckung je Mentorengruppe</h2><p class="subline">Ohne die jeweilige R4-Kontrollperson</p><div class="groups">'+bars+'</div></section><section class="panel"><h2>Stärkste gemeldete T1</h2><p class="subline">Einmalige Momentaufnahme</p>'+table(top)+'</section></div>';
}
function groupPerson(name,g){
var real=(PLAN.aliases||{})[name]||name,p=state.players.find(function(x){return x.group===g&&x.name.toLowerCase()===real.toLowerCase();});
if(!p)return '<div class="group-person">'+esc(name)+'</div>';
return '<div class="group-person"><div><b>'+esc(name)+'</b>'+(name!==p.name?'<small class="dim">Squad-Alias: '+esc(p.name)+'</small>':'')+'</div><div class="person-meta"><span class="pill '+(p.listedOnly?'unmatched':reported(p)?'':'empty')+'">'+(p.listedOnly?'Nicht im Datenstand':reported(p)?'T1 · '+num(p.squads[0].power)+' M':'T1 offen')+'</span><button type="button" class="inline-btn" data-edit="'+esc(p.id)+'">↗</button></div></div>';
}
function groupsView(){
var cards=PLAN.groups.map(function(g){
 var players=state.players.filter(function(p){return p.group===g.id&&p.role!=='R4-Kontrolle';});
 var done=players.filter(reported).length,total=g.mentors.length+g.members.length;
 return '<section class="group-card"><div class="group-title"><div><div class="eyebrow">MENTORENGRUPPE '+g.id+'</div><h2>Gruppe '+g.id+'</h2></div><div class="group-counter">'+total+'<small>SPIELER</small></div></div>'+
 '<div class="group-report"><div class="group-head"><span>T1 gemeldet</span><small>'+done+' von '+total+'</small></div><div class="progress"><div style="width:'+(total?Math.round(done/total*100):0)+'%"></div></div></div>'+
 '<div class="role-title">R4 / KONTROLLE</div>'+groupPerson(g.controller,g.id)+
 '<div class="role-title">MENTOREN <span>'+g.mentors.length+'</span></div>'+g.mentors.map(function(n){return groupPerson(n,g.id);}).join('')+
 '<div class="role-title">MITGLIEDER <span>'+g.members.length+'</span></div>'+g.members.map(function(n){return groupPerson(n,g.id);}).join('')+'</section>';
}).join('');
var unmatched=state.players.filter(function(p){return p.group>0&&p.listedOnly;}).map(function(p){return esc(p.name);});
return heading('ALLIANZ / GRUPPEN','Mentorengruppen','Verbindliche Aufteilung vom 17. November 2026',button('Alle Mitglieder','members'))+
'<div class="notice">78 Gruppenspieler einschließlich 11 Mentoren, <b>zuzüglich 5 R4-Kontrollpersonen</b>. Die R1- und R5-Spieler sind in dieser Gruppeneinteilung nicht enthalten.</div>'+
'<div class="group-summary"><span><b>5</b> Gruppen</span><span><b>78</b> Gruppenspieler</span><span><b>11</b> Mentoren</span><span><b>5</b> R4</span></div>'+
(unmatched.length?'<div class="notice roster-warning"><b>Abgleich offen ('+unmatched.length+')</b>: '+unmatched.join(', ')+'. Harald wird jetzt unter seinem aktuellen Spielernamen geführt und mit seinen gemeldeten Truppendaten verknüpft.</div>':'')+
'<div class="group-directory">'+cards+'</div>';
}
function members(){var list=state.players.filter(function(p){return (grp==='all'||Number(grp)===p.group)&&(status==='all'||(status==='yes'?reported(p):!reported(p)))&&p.name.toLowerCase().includes(query.toLowerCase());});return heading('ALLIANZ / ROSTER','Mitgliederübersicht','Spieler aus dem Squad-Datenstand und zusätzliche Namen aus der Mentorengruppenplanung.','<button class="btn" data-action="refresh">↻ Online aktualisieren</button>')+'<div class="toolbar"><input id="search" class="control search" placeholder="Spieler suchen …" value="'+esc(query)+'" aria-label="Spieler suchen"><select id="groupFilter" class="control" aria-label="Mentorengruppe">'+['all',0,1,2,3,4,5].map(function(g){return '<option value="'+g+'"'+(String(g)===String(grp)?' selected':'')+'>'+(g==='all'?'Alle Mentorengruppen':g===0?'Nicht zugeordnet':'Gruppe '+g)+'</option>';}).join('')+'</select><select id="statusFilter" class="control" aria-label="Meldestatus"><option value="all"'+(status==='all'?' selected':'')+'>Alle Meldungen</option><option value="yes"'+(status==='yes'?' selected':'')+'>T1 gemeldet</option><option value="no"'+(status==='no'?' selected':'')+'>Noch kein T1</option></select></div><p class="muted" style="margin-bottom:14px">'+list.length+' von '+state.players.length+' angezeigten Personen · '+(SNAPSHOT.members||[]).length+' aus Squad-Liste</p>'+table(list);}
function opt(val,label,current){return '<option value="'+esc(val)+'"'+(String(val)===String(current)?' selected':'')+'>'+esc(label)+'</option>';}
function entry(){var p=state.players.find(function(m){return m.id===editing;})||null;
 var player=p?'<input class="control" value="'+esc(p.groupDisplayName||p.name)+'" disabled><input type="hidden" id="playerName" value="'+esc(p.name)+'">':'<select id="playerName" class="control" required><option value="">Spieler auswählen</option>'+state.players.slice().sort(function(a,b){return a.name.localeCompare(b.name,'de');}).map(function(x){return opt(x.name,x.groupDisplayName||x.name,'');}).join('')+'</select>';
 var groups=[0,1,2,3,4,5].map(function(g){return opt(g,g===0?'Nicht zugeordnet':'Gruppe '+g,p?p.group:0);}).join('');
 var ranks=['R1','R2','R3','R4','R5'].map(function(r){return opt(r,r,p?p.rank:'R2');}).join('');
 var squads=[0,1,2,3].map(function(i){var s=p?p.squads[i]:null;return '<section class="squad'+(i?' optional':'')+'"><h3>T'+(i+1)+' <small>'+(i?'OPTIONAL':'PFLICHT')+'</small></h3><div class="field"><label for="type'+i+'">TRUPPENTYP</label><select class="control" id="type'+i+'">'+opt('','Typ auswählen',s?s.type:'')+TYPES.map(function(t){return opt(t,t,s?s.type:'');}).join('')+'</select></div><div class="field"><label for="power'+i+'">KAMPFKRAFT IN MILLIONEN</label><input id="power'+i+'" type="number" min="0.01" max="999999" step="0.01" class="control" placeholder="z. B. 152.5" value="'+(s?Number(s.power):'')+'"></div></section>';}).join('');
 return heading('ALLIANZ / DATENMELDUNG',p?'Truppen aktualisieren':'Truppenmeldung einreichen','Spielernamen auswählen. T1 ist verpflichtend, T2–T4 optional. Die Meldung wird anschließend geprüft.',button('Zur Mitgliederliste','members',false))+'<div class="notice"><b>Online-Einreichung:</b> Neue Truppenmeldungen werden in einer geschützten Prüfliste der eigenständigen Supabase-Datenbank gespeichert. Erst nach Freigabe erscheinen sie in der Übersicht.</div><form id="entryForm" class="form-panel"><div class="form-grid"><div class="field"><label for="playerName">SPIELER</label>'+player+'</div><div class="field"><label for="mentor">MENTORENGRUPPE</label><select class="control" id="mentor"'+(p&&p.group>0?' disabled':'')+'>'+groups+'</select></div><div class="field"><label for="rank">RANG</label><select class="control" id="rank"'+(p&&p.role==='R4-Kontrolle'?' disabled':'')+'>'+ranks+'</select></div><div class="field"><label>ERINNERUNGEN</label><input class="control" disabled value="In dieser Demo nicht aktiviert"></div></div><div class="squad-grid">'+squads+'</div><div class="form-actions">'+(p?'<button type="button" class="btn" data-action="change-player">Anderen Spieler wählen</button>':'')+'<button type="button" class="btn" data-view="members">Abbrechen</button><button type="submit" class="btn primary">Meldung online einreichen</button></div></form>';}
function history(){return heading('ALLIANZ / AUDIT','Änderungsverlauf','Alle Änderungen in dieser lokalen Testinstanz.',button('Mitglieder ansehen','members'))+(state.history.length?'<div class="activity">'+state.history.slice(0,100).map(function(h){return '<div class="activity-item"><div><b>'+esc(h.action)+' · '+esc(h.name)+'</b><small>'+esc(h.detail)+'</small></div><small>'+new Date(h.at).toLocaleString('de-DE')+'</small></div>';}).join('')+'</div>':'<div class="panel empty">Noch keine Bearbeitungen vorgenommen.</div>');}
function system(){return heading('SYSTEM / ISOLATION','Sicher getrennt','Die neue Website nutzt ausschließlich das getrennte Supabase-Projekt. Das Produktivsystem bleibt unberührt.')+'<div class="system-grid"><section class="panel"><h2>Verbindungen</h2><p class="subline">Eigenständige Online-Infrastruktur</p>'+[['Produktives SKWS Supabase','Nicht verbunden'],['Bestehendes GitHub-Projekt','Nicht verbunden'],['Bestehende Google-Tabelle','Nicht verbunden'],['Neues Supabase-Projekt',backendConnected?'Online':'Offline'],['Einreichungen','Online mit Freigabe']].map(function(x){return '<div class="system-row"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>';}).join('')+'</section><section class="panel"><h2>Online-Daten exportieren</h2><p class="hint">Exportiere die freigegebenen Daten als JSON oder CSV. Neue Meldungen werden online in einer geschützten Prüfliste gespeichert.</p><div class="actions mt"><button class="btn" data-action="json">↓ JSON exportieren</button><button class="btn" data-action="csv">↓ CSV exportieren</button></div><input id="importFile" type="file" accept=".json,application/json" hidden></section></div><div class="panel mt"><h2>Nächster Ausbauschritt</h2><p class="hint">Die <b>eigene Supabase-Datenbank mit RLS-Schutz</b> ist eingerichtet. Freigaben erfolgen vorerst im separaten Supabase-Dashboard. Eine Admin-Weboberfläche kann später ergänzt werden.</p></div>';}
function render(){document.getElementById('place').textContent=VIEWS[view];document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.toggle('active',b.dataset.view===view);});root.innerHTML={overview:overview,groups:groupsView,members:members,entry:entry,history:history,system:system}[view]();}
function go(to){if(!VIEWS[to])return;view=to;if(to==='entry'&&editing===null){}if(to!=='entry')editing=null;render();window.scrollTo({top:0,behavior:'instant'});}
function newID(){return 'demo-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);}
function submit(e){
 e.preventDefault();
 var name=document.getElementById('playerName').value.trim();
 var player=state.players.find(function(p){return p.name===name;});
 if(!player){notify('Bitte einen vorhandenen Spielernamen auswählen');return;}
 if(!backendConnected||!window.SKWS_BACKEND){notify('Online-Verbindung fehlt. Bitte erneut versuchen.');return;}
 var sq=[],types={'Tank':'tank','Flugzeug':'aircraft','Rakete':'missile','Gemischt':'mixed'};
 for(var i=0;i<4;i++){
  var type=document.getElementById('type'+i).value,raw=document.getElementById('power'+i).value,power=Number(raw);
  if((i===0&&(!type||!raw))||(type&&!raw)||(!type&&raw)||(raw&&(!Number.isFinite(power)||power<=0||power>999999))){
   notify('Bitte für T'+(i+1)+' gültige Werte eintragen');return;
  }
  sq.push(type?{type:types[type],power:power}:null);
 }
 var btn=e.target.querySelector('button[type="submit"]');
 if(btn){btn.disabled=true;btn.textContent='Wird eingereicht …';}
 window.SKWS_BACKEND.submit(player.name,sq).then(function(){
  editing=null;go('members');notify('Meldung eingereicht. Freigabe steht aus.');
 }).catch(function(error){
  notify('Einreichen fehlgeschlagen: '+error.message);
  if(btn){btn.disabled=false;btn.textContent='Meldung online einreichen';}
 });
}
function download(name,body,type){var blob=new Blob([body],{type:type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);}
function csv(){var rows=[['Name','Mentorengruppe','Funktion','Abgleich','Rang','Zeitpunkt','T1-Typ','T1-Mio','T2-Typ','T2-Mio','T3-Typ','T3-Mio','T4-Typ','T4-Mio']];state.players.forEach(function(p){rows.push([p.groupDisplayName||p.name,p.group,p.role||'Unzugeordnet',p.listedOnly?'Nur Gruppenplanung':'Squad-Liste',p.rank,p.updated||''].concat(p.squads.flatMap(function(s){return [s?s.type:'',s?s.power:''];})));});return rows.map(function(row){return row.map(function(v){var s=String(v==null?'':v);if(/^[=+@\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(';');}).join('\r\n');}
document.addEventListener('click',function(e){var el=e.target.closest('[data-view],[data-edit],[data-action]');if(!el)return;if(el.dataset.view){if(el.dataset.view==='entry')editing=null;go(el.dataset.view);return;}if(el.dataset.edit){editing=el.dataset.edit;go('entry');return;}var a=el.dataset.action;if(a==='json')download('skws-command-center-demo.json',JSON.stringify(state,null,2),'application/json');if(a==='csv')download('skws-command-center-demo.csv','\uFEFF'+csv(),'text/csv;charset=utf-8');if(a==='refresh')refreshOnlineData(true);if(a==='change-player'){editing=null;go('entry');}if(a==='import')document.getElementById('importFile').click();if(a==='reset'&&confirm('Nur die Daten dieser isolierten Browser-Demo zurücksetzen?')){state=initial();applyGroupPlan();save();render();notify('Lokale Daten zurückgesetzt');}});
document.addEventListener('input',function(e){if(e.target.id==='search'){query=e.target.value;var pos=e.target.selectionStart;render();var input=document.getElementById('search');input.focus();input.setSelectionRange(pos,pos);}});
document.addEventListener('change',function(e){if(e.target.id==='playerName'&&view==='entry'&&e.target.value){var chosen=state.players.find(function(p){return p.name===e.target.value;});if(chosen){editing=chosen.id;render();}}if(e.target.id==='groupFilter'){grp=e.target.value;render();}if(e.target.id==='statusFilter'){status=e.target.value;render();}if(e.target.id==='importFile'){var file=e.target.files[0];if(!file)return;if(file.size>2000000){notify('JSON zu groß');return;}file.text().then(function(t){var d=JSON.parse(t);if(!valid(d))throw Error('Ungültige Datei');if(confirm('Lokale Testdaten mit dieser JSON-Datei ersetzen?')){state=d;applyGroupPlan();save();render();notify('Lokale Daten importiert, Gruppen aktualisiert');}}).catch(function(){notify('Ungültige JSON-Datei');});}});
document.addEventListener('submit',function(e){if(e.target.id==='entryForm')submit(e);});
function refreshOnlineData(manual){
 if(!window.SKWS_BACKEND){backendConnected=false;backendError='Backend-Konfiguration fehlt';render();return;}
 window.SKWS_BACKEND.load().then(function(data){
  var entries={};data.squads.forEach(function(e){entries[e.name]=e;});
  var types={tank:'Tank',aircraft:'Flugzeug',missile:'Rakete',mixed:'Gemischt'};
  var players=data.members.map(function(m,i){
   var e=entries[m.name],ss=e&&Array.isArray(e.squads)?e.squads:[];
   var squads=[0,1,2,3].map(function(j){var v=ss[j];return v&&v.type&&v.power!=null&&Number(v.power)>0?{type:types[v.type]||v.type,power:Number(v.power)}:null;});
   return {id:'online-'+i,name:m.name,group:m.group_id||0,rank:m.rank,updated:e?e.updated_at:null,
    squads:squads,role:m.role,listedOnly:m.origin==='group_plan',
    groupDisplayName:m.display_name!==m.name?m.display_name:null};
  });
  SNAPSHOT={members:data.members.map(function(m){return {name:m.name,rank:m.rank,sort:m.sort_order};}),
    entries:data.squads.map(function(e){return {name:e.name,squads:e.squads,updated:e.source_updated||e.updated_at};})};
  state={version:2,players:players,history:[]};backendConnected=true;backendError='';lastSynced=new Date().toISOString();
  editing=null;render();if(manual)notify('Online-Daten aktualisiert');
 }).catch(function(error){backendConnected=false;backendError=error&&error.message||'Netzwerkfehler';render();if(manual)notify('Online-Aktualisierung fehlgeschlagen');});
}
render();
refreshOnlineData(false);
})();