/* SKWS Command Center v4 · independent frontend, isolated Supabase only. */
(function(){
'use strict';
var PLAN=window.SKWS_MENTOR_GROUPS||{groups:[],aliases:{}};
var SNAP=window.SKWS_SNAPSHOT||{members:[],entries:[]};
var API=window.SKWS_BACKEND||null;
var VIEWS={overview:'DASHBOARD',groups:'MENTORENGRUPPEN',members:'MITGLIEDER',entry:'TRUPPEN MELDEN',vs:'VS-PUNKTE',donations:'SPENDEN',storms:'STÜRME',shields:'SCHILDE',train:'ZUG',events:'EVENTS',seasons:'SAISONS',compare:'VERGLEICH',kills:'KILL-TRACKER',custom:'EIGENE EVENTS',admin:'FREIGABEN',system:'SYSTEMSTATUS'};
var MOD=window.SKWS_MODULES||null;
var TYPE_LABELS={tank:'Tank',aircraft:'Flugzeug',missile:'Rakete',mixed:'Gemischt'};
var TYPE_KEYS=Object.keys(TYPE_LABELS);
var state={view:'overview',members:[],source:'snapshot',loading:true,error:null,syncedAt:null,search:'',groupFilter:'all',statusFilter:'all',sort:'sort',selectedName:'',busy:false};
var root=document.getElementById('content'),toastNode=document.getElementById('toast');
function esc(x){return String(x===null||x===undefined?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ico(name,cls){return '<svg class="icon '+(cls||'')+'" aria-hidden="true"><use href="#ic-'+name+'"/></svg>';}
function formatNumber(n,d){return Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:d===undefined?2:d});}
function power(m){return formatNumber(m,2)+' M';}
function reported(m){return !!(m&&m.squads&&m.squads[0]&&Number(m.squads[0].power)>0);}
function fmtDate(v){if(!v)return 'Noch keine Meldung';var d=new Date(v);return isNaN(d.getTime())?'Unbekannt':d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
function initials(name){var words=String(name).replace(/[^a-zA-Z0-9ÄÖÜäöüß ]/g,'').trim().split(/\s+/);return (words.length>=2?words[0].slice(0,1)+words[1].slice(0,1):words[0]?words[0].slice(0,2):'?').toUpperCase();}
function alias(s){return (PLAN.aliases&&PLAN.aliases[s])||s;}
function allTeams(){return PLAN.groups||[];}
function snapshotMembers(){
 var map=new Map(),data=new Map();
 (SNAP.entries||[]).forEach(function(e){data.set(e.name,e);});
 (SNAP.members||[]).forEach(function(m){map.set(m.name,{name:m.name,display:m.name,rank:m.rank||'—',sort:m.sort||0,group:0,role:'Unzugeordnet',origin:'snapshot',squads:[],updatedAt:null});});
 var roleMap=new Map();
 allTeams().forEach(function(g){
  roleMap.set(alias(g.controller),{group:g.id,role:'R4-Kontrolle',display:g.controller});
  g.mentors.forEach(function(name){roleMap.set(alias(name),{group:g.id,role:'Mentor',display:name});});
  g.members.forEach(function(name){roleMap.set(alias(name),{group:g.id,role:'Mitglied',display:name});});
 });
 roleMap.forEach(function(g,name){var p=map.get(name);if(!p){p={name:name,display:name,rank:'—',sort:9999,group:0,role:'Unzugeordnet',origin:'group_plan',squads:[],updatedAt:null};map.set(name,p);}p.group=g.group;p.role=g.role;p.display=g.display;});
 map.forEach(function(p){var e=data.get(p.name);p.squads=normalizedSquads(e?e.squads:[]);p.updatedAt=e?e.updated:null;});
 return Array.from(map.values()).sort(function(a,b){return a.sort-b.sort||a.display.localeCompare(b.display,'de');});
}
function normalizedSquads(arr){
 return [0,1,2,3].map(function(i){var s=Array.isArray(arr)?arr[i]:null;return s&&s.type&&Number(s.power)>0?{type:String(s.type).toLowerCase(),power:Number(s.power)}:null;});
}
function onlineMembers(data){
 var rows=new Map();
 data.squads.forEach(function(r){rows.set(r.name,r);});
 return data.members.map(function(m){var s=rows.get(m.name);return {name:m.name,display:m.display_name||m.name,rank:m.rank||'—',sort:m.sort_order||0,group:m.group_id||0,role:m.role||'Unzugeordnet',origin:m.origin||'snapshot',squads:normalizedSquads(s?s.squads:[]),updatedAt:s?s.source_updated||s.updated_at:null};})
 .sort(function(a,b){return a.sort-b.sort||a.display.localeCompare(b.display,'de');});
}
function findMember(name){return state.members.find(function(m){return m.name===name;})||null;}
function btn(label,action,kind,iconName){return '<button type="button" class="btn '+(kind||'btn-ghost')+'" data-action="'+action+'">'+(iconName?ico(iconName):'')+esc(label)+'</button>';}
function gotoButton(label,view,kind,iconName){return '<button type="button" class="btn '+(kind||'btn-ghost')+'" data-view="'+view+'">'+(iconName?ico(iconName):'')+esc(label)+'</button>';}
function pageHeader(kicker,title,subtitle,actions){return '<header class="page-header"><div><div class="eyebrow">'+esc(kicker)+'</div><h1 class="page-title">'+esc(title)+'</h1><p class="muted">'+esc(subtitle)+'</p></div><div class="page-actions">'+(actions||'')+'</div></header>';}
function metric(label,value,hint,iconName,tone){return '<div class="metric"><div class="metric-label">'+ico(iconName,'metric-icon '+(tone||''))+esc(label)+'</div><div class="metric-value">'+esc(value)+'</div><div class="metric-foot">'+esc(hint)+'</div></div>';}
function overviewStrip(){
 var online=state.source==='online';
 var title=online?'Online-Datenbank verbunden':state.loading?'Online-Daten werden geladen':'Reserveansicht aktiv';
 var detail=online?'Unabhängiges Supabase · zuletzt aktualisiert '+new Date(state.syncedAt).toLocaleString('de-DE'):state.loading?'Verbindung zum separaten Backend wird geprüft':(state.error||'Online-Daten derzeit nicht erreichbar')+' · Lesbare Reservekopie';
 return '<div class="overview-strip"><div class="strip-main"><span class="strip-icon">'+ico(online?'check':state.loading?'refresh':'alert')+'</span><div><div class="strip-title">'+title+'</div><div class="strip-sub">'+esc(detail)+'</div></div></div><span class="status-pill '+(online?'':'offline')+'">'+(online?'<span class="online-dot"></span> LIVE':state.loading?'VERBINDUNG':'OFFLINE')+'</span></div>';
}
function msg(text,warning){return '<div class="message '+(warning?'warning':'')+'">'+ico(warning?'alert':'shield')+'<div>'+text+'</div></div>';}
function bar(cur,max){var percent=max?Math.min(100,Math.round(cur/max*100)):0;return '<div class="bar-track" role="progressbar" aria-valuenow="'+cur+'" aria-valuemin="0" aria-valuemax="'+max+'"><div class="bar-fill" style="width:'+percent+'%"></div></div>';}
function groupPeople(id){return state.members.filter(function(m){return m.group===id&&m.role!=='R4-Kontrolle';});}
function peopleCount(){return state.members.filter(function(m){return m.role==='Mentor'||m.role==='Mitglied';}).length;}
function mentorCount(){return state.members.filter(function(m){return m.role==='Mentor';}).length;}
function stats(){var members=state.members,reportedCount=members.filter(reported).length,totalPower=members.reduce(function(sum,m){return sum+(reported(m)?m.squads[0].power:0);},0);return {members:members.length,reported:reportedCount,power:totalPower,groups:allTeams().length};}
function leaderboard(n){return state.members.filter(reported).sort(function(a,b){return b.squads[0].power-a.squads[0].power;}).slice(0,n);}
function groupProgress(){
 return allTeams().map(function(g){
  var group=groupPeople(g.id),done=group.filter(reported).length;
  return '<div class="group-track-row"><div class="group-track-head"><span>Gruppe '+g.id+' <span class="mini-muted"> · '+esc(g.controller)+'</span></span><small>'+done+' / '+group.length+' gemeldet</small></div>'+bar(done,group.length)+'</div>';
 }).join('');
}
function topList(){
 var list=leaderboard(5);
 if(!list.length)return '<div class="empty">Noch keine T1-Meldungen vorhanden.</div>';
 return list.map(function(m,i){return '<div class="leader-row"><span class="rank-round '+(i===0?'first':'')+'">'+(i+1)+'</span><span class="leader-name"><strong>'+esc(m.display)+'</strong><small>Gruppe '+(m.group||'–')+' · '+esc(TYPE_LABELS[m.squads[0].type]||m.squads[0].type)+'</small></span><span class="leader-power">'+esc(power(m.squads[0].power))+'</span></div>';}).join('');
}
function tagFor(m){
 if(reported(m))return '<span class="pill">'+ico('check')+'Gemeldet</span>';
 if(m.origin==='group_plan')return '<span class="pill unmatched">Nur Gruppenliste</span>';
 return '<span class="pill pending">T1 offen</span>';
}
function roleBadge(m){var r=m.role||'Unzugeordnet';return '<span class="role-badge '+(r==='Mentor'?'mentor':r==='R4-Kontrolle'?'r4':'')+'">'+esc(r)+'</span>';}
function playerCell(m){return '<div class="name-cell"><span class="player-avatar '+(m.role==='R4-Kontrolle'?'blue':'')+'">'+esc(initials(m.display))+'</span><div><strong>'+esc(m.display)+'</strong>'+(m.name!==m.display?'<small>Datenname: '+esc(m.name)+'</small>':'')+'</div></div>';}
function memberRows(list,limit){var rows=limit?list.slice(0,limit):list;
 if(!rows.length)return '<tr><td colspan="8" class="empty">Für diese Filter wurden keine Spieler gefunden.</td></tr>';
 return rows.map(function(m){return '<tr><td>'+playerCell(m)+'</td><td>'+(m.group?'G'+m.group:'–')+'</td><td>'+roleBadge(m)+'</td><td>'+esc(m.rank)+'</td><td>'+(reported(m)?esc(TYPE_LABELS[m.squads[0].type]||m.squads[0].type):'–')+'</td><td class="num">'+(reported(m)?esc(power(m.squads[0].power)):'–')+'</td><td>'+tagFor(m)+'</td><td><button class="table-action" type="button" data-edit="'+esc(m.name)+'">Melden '+ico('arrow')+'</button></td></tr>';}).join('');
}
function tableHTML(list,limit){return '<div class="table-scroll"><table><thead><tr><th>Spieler</th><th>Gruppe</th><th>Funktion</th><th>Rang</th><th>T1-Typ</th><th>T1-Kraft</th><th>Status</th><th></th></tr></thead><tbody>'+memberRows(list,limit)+'</tbody></table></div>';}
function dashboard(){
 var s=stats(),leader=leaderboard(1),first=leader[0];
 var panels='<div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>T1-Meldestatus nach Gruppe</h2><div class="description">Aktuelle Abdeckung der fünf Mentorengruppen</div></div><button class="micro-link" data-view="groups">Alle Gruppen '+ico('arrow')+'</button></div><div class="group-track">'+groupProgress()+'</div></section><section class="panel"><div class="panel-heading"><div><h2>Stärkste T1-Trupps</h2><div class="description">Rangfolge nach gemeldeter Kampfkraft</div></div><button class="micro-link" data-view="members">Mitglieder '+ico('arrow')+'</button></div>'+topList()+'</section></div>';
 var spotlight=first?'<div class="feature-banner"><span class="feature-icon">'+ico('trophy')+'</span><div class="feature-banner-body"><h3>Stärkster gemeldeter T1-Trupp · '+esc(first.display)+'</h3><p>'+esc(TYPE_LABELS[first.squads[0].type]||first.squads[0].type)+' · '+esc(power(first.squads[0].power))+' · Datenstand '+esc(fmtDate(first.updatedAt))+'</p></div><span class="pill">'+ico('chart')+'T1-RANGLISTE</span></div>':'';
 var recent=state.members.filter(reported).sort(function(a,b){return new Date(b.updatedAt||0)-new Date(a.updatedAt||0);}).slice(0,7);
 return pageHeader('ALLIANCE / OVERVIEW','SKWS Command Center','Skywalkers · Server 1858 · Das operative Dashboard deiner Allianz',btn('Aktualisieren','refresh','btn-ghost','refresh')+gotoButton('Truppen melden','entry','btn-primary','send'))+
 overviewStrip()+
 '<div class="metrics">'+metric('Mitglieder',formatNumber(s.members,0),'In der unabhängigen Datenbank','users','blue')+metric('T1 gemeldet',formatNumber(s.reported,0),'Von '+s.members+' Mitgliedern','check','')+metric('T1-Gesamtkraft',power(s.power),'Summe der gemeldeten T1','activity','amber')+metric('Mentorengruppen',String(s.groups),'78 Spieler · 11 Mentoren · 5 R4','groups','violet')+'</div>'+
 spotlight+panels+
 '<section class="panel table-panel"><div class="table-panel-header"><div><h2>Zuletzt aktualisierte Truppen</h2><small>Nur vorhandene, bestätigte T1-Meldungen</small></div><button class="micro-link" data-view="members">Alle Mitglieder '+ico('arrow')+'</button></div>'+tableHTML(recent)+'</section>'+(MOD?MOD.dashboardAddon(state.members):'');
}
function groupPerson(name,g,role){
 var p=findMember(alias(name)),isKnown=p&&p.origin!=='group_plan';
 return '<div class="directory-person"><span class="player-avatar '+(role==='R4-Kontrolle'?'blue':'')+'">'+esc(initials(name))+'</span><span class="person-info"><strong>'+esc(name)+'</strong><small>'+esc(role)+(p&&p.name!==name?' · Datenname '+esc(p.name):'')+'</small></span>'+
 (p&&reported(p)?'<span class="pill">'+esc(power(p.squads[0].power))+'</span>':isKnown?'<span class="pill pending">T1 offen</span>':'<span class="pill unmatched">Ohne Eintrag</span>')+
 '<button class="table-action" type="button" data-edit="'+esc(p?p.name:alias(name))+'" title="Truppen melden">'+ico('arrow')+'</button></div>';
}
function groupsView(){
 var cards=allTeams().map(function(g){
  var count=g.mentors.length+g.members.length,done=groupPeople(g.id).filter(reported).length;
  return '<section class="directory-card"><div class="directory-head"><div><div class="eyebrow">MENTORENGRUPPE 0'+g.id+'</div><h2>Gruppe '+g.id+'</h2><p>Leitung · '+esc(g.controller)+'</p></div><div class="directory-count">'+count+'<small>SPIELER</small></div></div>'+
  '<div class="directory-progress"><div class="group-track-head"><span>T1-Abdeckung</span><small>'+done+' / '+count+' gemeldet</small></div><div style="height:8px"></div>'+bar(done,count)+'</div>'+
  '<div class="directory-role-label">R4 / KONTROLLE</div>'+groupPerson(g.controller,g.id,'R4')+
  '<div class="directory-role-label"><span>MENTOREN</span><span>'+g.mentors.length+'</span></div>'+g.mentors.map(function(m){return groupPerson(m,g.id,'Mentor');}).join('')+
  '<div class="directory-role-label"><span>MITGLIEDER</span><span>'+g.members.length+'</span></div>'+g.members.map(function(m){return groupPerson(m,g.id,'Mitglied');}).join('')+'</section>';
 }).join('');
 return pageHeader('ALLIANCE / ORGANIZATION','Mentorengruppen','Fünf Gruppen, klare Verantwortlichkeiten und echte T1-Daten',btn('Aktualisieren','refresh','btn-ghost','refresh'))+
 overviewStrip()+
 '<div class="group-summary"><span class="summary-chip"><b>5</b> Gruppen</span><span class="summary-chip"><b>78</b> Gruppenspieler</span><span class="summary-chip"><b>11</b> Mentoren</span><span class="summary-chip"><b>5</b> R4-Kontrolle</span></div>'+
 msg('<strong>Gruppenlogik:</strong> Die 78 Spieler enthalten bereits alle elf Mentoren. Die fünf R4 sind zusätzlich eingetragen. R1 und R5 gehören nicht zu dieser Gruppenplanung. Drei Namen stehen bislang nur in der Gruppenliste: sike, Hadès 930 und Ccalley.',true)+
 '<div class="directory">'+cards+'</div>';
}
function filteredMembers(){
 var q=state.search.trim().toLocaleLowerCase('de');
 var list=state.members.filter(function(m){
  return (state.groupFilter==='all'||Number(state.groupFilter)===m.group)&&
   (state.statusFilter==='all'||(state.statusFilter==='reported'?reported(m):!reported(m)))&&
   (!q||m.name.toLocaleLowerCase('de').includes(q)||m.display.toLocaleLowerCase('de').includes(q));
 });
 return list.sort(function(a,b){
  if(state.sort==='power')return (reported(b)?b.squads[0].power:0)-(reported(a)?a.squads[0].power:0)||a.sort-b.sort;
  if(state.sort==='alpha')return a.display.localeCompare(b.display,'de');
  if(state.sort==='group')return a.group-b.group||a.sort-b.sort;
  return a.sort-b.sort||a.display.localeCompare(b.display,'de');
 });
}
function options(values,selected){return values.map(function(item){return '<option value="'+esc(item[0])+'"'+(String(item[0])===String(selected)?' selected':'')+'>'+esc(item[1])+'</option>';}).join('');}
function rosterTable(){var list=filteredMembers();return '<div class="table-panel-header"><div><h2>Spielerliste</h2><small>'+list.length+' von '+state.members.length+' Mitgliedern · bestätigter Datenstand</small></div><span class="status-pill"><span class="online-dot"></span> READ ONLY</span></div>'+tableHTML(list);}
function membersView(){
 return pageHeader('ALLIANCE / ROSTER','Mitglieder','Alle Spieler, Ränge, Mentorenzuordnungen und gemeldeten Truppen',btn('Aktualisieren','refresh','btn-ghost','refresh')+gotoButton('Truppen melden','entry','btn-primary','send'))+
 overviewStrip()+
 '<div class="filterbar"><div class="search-field">'+ico('search')+'<input class="input" id="rosterSearch" autocomplete="off" placeholder="Spielernamen suchen" aria-label="Spielernamen suchen" value="'+esc(state.search)+'"></div>'+
 '<select class="select" id="rosterGroup" aria-label="Mentorengruppe">'+options([['all','Alle Gruppen'],['0','Ohne Gruppe'],['1','Gruppe 1'],['2','Gruppe 2'],['3','Gruppe 3'],['4','Gruppe 4'],['5','Gruppe 5']],state.groupFilter)+'</select>'+
 '<select class="select" id="rosterStatus" aria-label="Meldestatus">'+options([['all','Alle Meldungen'],['reported','T1 gemeldet'],['open','T1 offen']],state.statusFilter)+'</select>'+
 '<select class="select" id="rosterSort" aria-label="Sortierung">'+options([['sort','Allianz-Reihenfolge'],['alpha','Name A–Z'],['group','Nach Gruppe'],['power','T1-Kraft absteigend']],state.sort)+'</select></div>'+
 '<section class="panel table-panel" id="rosterTable">'+rosterTable()+'</section>';
}
function entryView(){
 var selected=findMember(state.selectedName),squads=selected?selected.squads:[null,null,null,null];
 var select='<select class="select" id="playerSelect" required>'+options([['','Bitte Spieler wählen']].concat(state.members.slice().sort(function(a,b){return a.display.localeCompare(b.display,'de');}).map(function(m){return [m.name,m.display];})),state.selectedName)+'</select>';
 var squadFields=[0,1,2,3].map(function(i){
  var s=squads[i],type=s?s.type:'',value=s?String(s.power):'';
  return '<div class="squad-card"><div class="squad-card-head"><strong>T'+(i+1)+'</strong><small>'+(i===0?'PFLICHTFELDER':'OPTIONAL')+'</small></div><div class="squad-fields"><div class="field"><label for="type'+i+'">TRUPPENTYP</label><select class="select" id="type'+i+'">'+options([['','Bitte auswählen'],['tank','Tank'],['aircraft','Flugzeug'],['missile','Rakete'],['mixed','Gemischt']],type)+'</select></div><div class="field"><label for="power'+i+'">KAMPFKRAFT · MIO.</label><input id="power'+i+'" type="number" class="input" min="0.01" max="999999" step="0.01" inputmode="decimal" placeholder="z. B. 38,25" value="'+esc(value)+'"></div></div></div>';
 }).join('');
 var online=state.source==='online';
 return pageHeader('ALLIANCE / REPORT','Truppen melden','T1 ist Pflicht, T2 bis T4 sind optional. Alle Meldungen werden geprüft.',gotoButton('Mitgliederübersicht','members','btn-ghost','arrow'))+
 overviewStrip()+
 '<div class="form-layout"><form id="squadForm" class="form-panel"><div class="form-header"><h2>Neue Truppenmeldung</h2><p>Die gemeldeten Werte werden erst nach Freigabe im Dashboard angezeigt.</p></div>'+
 '<div class="form-grid"><div class="field"><label for="playerSelect">SPIELERNAME <span class="required">*</span></label>'+select+'</div><div class="field"><label for="chosenGroup">MENTORENGRUPPE</label><input class="input" id="chosenGroup" disabled value="'+(selected&&selected.group?'Gruppe '+selected.group:'Keine Zuordnung')+'"></div></div>'+
 '<div class="squad-section-title">DEINE TRUPPENAUFSTELLUNG</div><div class="squad-cards">'+squadFields+'</div>'+
 '<div class="form-actions"><button class="btn btn-ghost" type="button" data-view="members">Abbrechen</button><button class="btn btn-primary" type="submit"'+(!online||state.busy?' disabled':'')+'>'+ico('send')+(state.busy?'Wird übertragen':'Zur Prüfung einreichen')+'</button></div></form>'+
 '<aside><div class="hint-panel"><h3>'+ico('shield')+' Sichere Einreichung</h3><p>Damit niemand fremde Werte direkt überschreiben kann, landen alle Einsendungen in der eigenen Prüfliste des Command Centers.</p><div class="hint-steps"><div class="hint-step"><span class="step-number">1</span>Spielernamen und Truppenwerte auswählen</div><div class="hint-step"><span class="step-number">2</span>Meldung online zur Prüfung senden</div><div class="hint-step"><span class="step-number">3</span>Nach Freigabe werden die Zahlen für alle aktualisiert</div></div></div>'+
 '<div class="message mini">'+ico('alert')+'<div>Die Anmeldung ist noch nicht mit einem Spielerprofil verknüpft. Die Moderation schützt deshalb die freigegebenen Werte.</div></div></aside></div>';
}
function adminView(){
 var project='https://supabase.com/dashboard/project/yptvjhqqdqrfanixqafg';
 var sql='SELECT id, name, squads, submitted_at FROM public.cc_submissions WHERE status = &#39;pending&#39; ORDER BY submitted_at;';
 var yes='SELECT public.cc_review_submission(&#39;UUID-DER-MELDUNG&#39;, true);';
 var no='SELECT public.cc_review_submission(&#39;UUID-DER-MELDUNG&#39;, false);';
 return pageHeader('MANAGEMENT / REVIEW','Freigaben','Geschützte Truppenmeldungen kontrollieren und veröffentlichen',
 '<a href="'+project+'" class="btn btn-primary" target="_blank" rel="noopener noreferrer">'+ico('external')+'Supabase öffnen</a>')+
 msg('<strong>Zugriffsschutz aktiv:</strong> Die Freigabeliste ist für Besucher nicht lesbar. Aktuell erfolgt die Moderation über das separate Supabase-Dashboard. Ein eigener Admin-Login ist noch nicht eingerichtet.',false)+
 '<div class="status-grid"><section class="panel"><div class="panel-heading"><div><h2>01 / Neue Meldungen prüfen</h2><div class="description">SQL Editor des eigenständigen Projekts</div></div></div><pre class="code-panel">'+sql+'</pre><div class="actions-row"><button class="btn btn-ghost" data-action="copy-list">'+ico('copy')+'SQL kopieren</button></div>'+
 '<div class="divider"></div><h2>02 / Freigeben oder ablehnen</h2><p class="muted">Die UUID der jeweiligen Meldung einsetzen. Die Werte ändern sich ausschließlich in diesem Projekt.</p><div style="height:14px"></div><pre class="code-panel">'+yes+'</pre><div style="height:10px"></div><pre class="code-panel">'+no+'</pre><div class="actions-row"><button class="btn btn-ghost" data-action="copy-approve">'+ico('copy')+'Freigabe-SQL</button><button class="btn btn-ghost" data-action="copy-reject">'+ico('copy')+'Ablehnungs-SQL</button></div></section>'+
 '<section class="panel"><div class="panel-heading"><div><h2>Wie die Freigabe funktioniert</h2><div class="description">Vier klare Schutzmechanismen</div></div></div>'+
 '<div class="hint-steps"><div class="hint-step"><span class="step-number">1</span>Neue Meldungen erscheinen zunächst nur in einer geschützten Datenbanktabelle.</div><div class="hint-step"><span class="step-number">2</span>Öffentliche Besucher dürfen keine bereits bestätigten Werte überschreiben.</div><div class="hint-step"><span class="step-number">3</span>Die Freigabefunktion ist nicht über den öffentlichen Website-Schlüssel ausführbar.</div><div class="hint-step"><span class="step-number">4</span>Nach manueller Freigabe zeigt der Dashboard-Refresh die neuen Werte.</div></div>'+
 '<div class="divider"></div><h2>Offen für später</h2><p class="muted">Ein echter Admin-Login und eine komfortable Freigabeoberfläche kommen erst nach einer gesicherten Authentifizierung. Die öffentliche Website zeigt keine privaten Prüfeinträge.</p>'+
 '<div class="actions-row"><a class="btn btn-ghost" href="https://github.com/matdan1987/skws-command-center-standalone/blob/main/ADMIN.md" target="_blank" rel="noopener noreferrer">'+ico('external')+'Admin-Anleitung</a></div></section></div>'+adminTracking();
}

function adminTracking(){
 var categories=[
  {name:'VS · Spenden · Stürme · Kills · Zug',type:'metric',table:'cc_metric_reports',columns:'id,member_name,metric,metric_value,recorded_on,submitted_at',review:'cc_review_metric'},
  {name:'Schildmeldungen',type:'shield',table:'cc_shield_reports',columns:'id,member_name,shield_status,expires_at,submitted_at',review:'cc_review_shield'},
  {name:'Neue Eventvorschläge',type:'event',table:'cc_event_proposals',columns:'id,requester_name,title,category,starts_at,submitted_at',review:'cc_review_event'}
 ];
 return '<div class="mod-section-header" style="margin-top:24px"><div><h2>Weitere Freigaben</h2><p>Tracking- und Eventmeldungen werden im separaten Supabase-Projekt moderiert</p></div><a class="btn btn-ghost" href="https://github.com/matdan1987/skws-command-center-standalone/blob/main/ADMIN-TRACKING.md" target="_blank" rel="noopener noreferrer">'+ico('external')+'Anleitung</a></div><div class="mod-admin-grid">'+categories.map(function(c){
 var select='SELECT '+c.columns+' FROM public.'+c.table+' WHERE status = '+"'pending'"+' ORDER BY submitted_at;';
 var yes='SELECT public.'+c.review+"('UUID-DER-MELDUNG', true);";
 var no='SELECT public.'+c.review+"('UUID-DER-MELDUNG', false);";
 return '<section class="mod-panel"><div class="panel-heading"><div><h2>'+esc(c.name)+'</h2><div class="description">Freigegebene Meldungen werden öffentlich sichtbar</div></div></div><div class="mod-admin-label">PENDING MELDUNGEN</div><pre class="code-panel">'+esc(select)+'</pre><div class="actions-row"><button class="btn btn-ghost" data-sql-copy="'+esc(select)+'">'+ico('copy')+'Abfrage kopieren</button></div><div class="divider"></div><div class="mod-admin-label">FREIGEBEN / ABLEHNEN</div><pre class="code-panel">'+esc(yes)+'</pre><pre class="code-panel" style="margin-top:8px">'+esc(no)+'</pre><div class="actions-row"><button class="btn btn-ghost" data-sql-copy="'+esc(yes)+'">'+ico('copy')+'Freigabe</button><button class="btn btn-ghost" data-sql-copy="'+esc(no)+'">'+ico('copy')+'Ablehnung</button></div></section>';
 }).join('')+'</div>';
}

function systemView(){
 var online=state.source==='online',s=stats();
 var rows=[
 ['GitHub-Repository','Separat · matdan1987/skws-command-center-standalone'],
 ['Supabase Command Center',online?'Online':'Offline · Reservekopie'],
 ['Mitglieder',String(s.members)],
 ['Gemeldete T1',String(s.reported)],
 ['Mentorengruppen',String(s.groups)],
 ['Produktives SKWS Squads','Nicht verbunden'],
 ['Freigaben','Geschützt · manuell'],
 ['E-Mail-Erinnerungen','Noch nicht eingerichtet']
 ];
 return pageHeader('SYSTEM / INFRASTRUCTURE','Systemstatus','Transparente Übersicht über die getrennte Dateninfrastruktur',btn('Neu laden','refresh','btn-ghost','refresh'))+
 overviewStrip()+
 '<div class="status-grid"><section class="panel"><div class="panel-heading"><div><h2>Verbindungen & Daten</h2><div class="description">Technischer Zustand des Standalone-Projekts</div></div></div>'+rows.map(function(r){return '<div class="status-item"><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>';}).join('')+'</section>'+
 '<section class="panel"><div class="panel-heading"><div><h2>Export & Verwaltung</h2><div class="description">Nur öffentlich sichtbare Allianz-Daten</div></div></div><p class="muted">Du kannst den aktuell geladenen Datenstand als JSON oder CSV exportieren. Geheime Zugangsdaten und private Prüfeinträge sind darin nicht enthalten.</p><div class="actions-row">'+btn('JSON exportieren','export-json','btn-ghost','download')+btn('CSV exportieren','export-csv','btn-ghost','download')+'</div><div class="divider"></div>'+msg('<strong>Wichtig:</strong> Dieses Command Center verwendet ausschließlich das neue Supabase-Projekt. Dein bestehendes Squad-Script bleibt vollständig unabhängig.',false)+
 '<div class="actions-row"><a class="btn btn-ghost" href="https://supabase.com/dashboard/project/yptvjhqqdqrfanixqafg" target="_blank" rel="noopener noreferrer">'+ico('external')+'Neue Datenbank</a><a class="btn btn-ghost" href="https://github.com/matdan1987/skws-command-center-standalone" target="_blank" rel="noopener noreferrer">'+ico('external')+'GitHub</a></div></section></div>';
}
function render(){
 var container=document.getElementById('content');
 document.getElementById('place').textContent=VIEWS[state.view]||'DASHBOARD';
 document.querySelectorAll('.nav-link').forEach(function(el){var active=el.dataset.view===state.view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 var views={overview:dashboard,groups:groupsView,members:membersView,entry:entryView,admin:adminView,system:systemView};
 var extension=MOD?MOD.render(state.view,state.members):null;
 container.innerHTML=extension===null?(views[state.view]||dashboard)():extension;
}
function closeMobile(){var side=document.getElementById('sidebar'),shade=document.getElementById('mobileShade');side.classList.remove('open');shade.hidden=true;}
function openMobile(){var side=document.getElementById('sidebar'),shade=document.getElementById('mobileShade');side.classList.add('open');shade.hidden=false;}
function navigate(view){if(!VIEWS[view])return;state.view=view;closeMobile();render();window.scrollTo({top:0,behavior:'instant'});}
var toastTimer=null;
function toast(msg){toastNode.textContent=msg;toastNode.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toastNode.classList.remove('show');},4500);}
async function refresh(manual){
 if(!API){state.source='snapshot';state.loading=false;state.error='Backend nicht geladen';if(MOD)MOD.setError(new Error('Backend nicht geladen'));render();return;}
 state.loading=true;
 try{
  var data=await API.load();
  state.members=onlineMembers(data);state.source='online';state.error=null;state.syncedAt=Date.now();state.loading=false;
  if(manual)toast('Die Online-Daten wurden aktualisiert.');
 }catch(err){
  state.loading=false;state.source='snapshot';state.error=err&&err.message||'Verbindung fehlgeschlagen';state.members=snapshotMembers();
  if(manual)toast('Online-Daten nicht erreichbar. Es wird die Reservekopie angezeigt.');
 }
 if(MOD){
  try{
   if(!API.loadTracking)throw Error('Tracking-Schnittstelle fehlt');
   var tracking=await API.loadTracking();
   MOD.setData(tracking);
  }catch(trackingErr){MOD.setError(trackingErr);}
 }
 render();
}
async function submitForm(form){
 if(state.busy)return;
 if(state.source!=='online'){toast('Die Online-Datenbank ist derzeit nicht erreichbar.');return;}
 var select=document.getElementById('playerSelect'),name=select?select.value:'',player=findMember(name);
 if(!player){toast('Bitte zuerst einen Spielernamen wählen.');return;}
 var squads=[];
 for(var i=0;i<4;i++){
  var type=document.getElementById('type'+i).value,raw=document.getElementById('power'+i).value;
  var pow=Number(raw.replace(',','.'));
  if((i===0&&(!type||!raw))||(type&&!raw)||(!type&&raw)||(raw&&(!Number.isFinite(pow)||pow<=0||pow>999999))){
   toast('Bitte T'+(i+1)+' vollständig und mit gültigen Werten ausfüllen.');return;
  }
  squads.push(type?{type:type,power:pow}:null);
 }
 state.busy=true;var submit=form.querySelector('button[type="submit"]');if(submit){submit.disabled=true;submit.textContent='Wird gesendet …';}
 try{
  await API.submit(name,squads);
  state.selectedName='';state.busy=false;navigate('members');
  toast('Meldung online eingereicht. Nach Freigabe wird sie sichtbar.');
 }catch(err){
  state.busy=false;
  toast('Übertragung fehlgeschlagen: '+(err.message||'Unbekannter Fehler'));
  if(submit){submit.disabled=false;submit.innerHTML=ico('send')+'Zur Prüfung einreichen';}
 }
}
function csvValue(x){var v=String(x===undefined||x===null?'':x);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function csvContent(){
 var cols=['Name','Datenname','Gruppe','Funktion','Rang','Datenquelle','T1-Typ','T1-Mio','T2-Typ','T2-Mio','T3-Typ','T3-Mio','T4-Typ','T4-Mio'];
 var lines=[cols];
 state.members.forEach(function(m){
  var a=[m.display,m.name,m.group||'',m.role,m.rank,m.origin];
  m.squads.forEach(function(s){a.push(s?TYPE_LABELS[s.type]||s.type:'',s?s.power:'');});
  lines.push(a);
 });
 return '\uFEFF'+lines.map(function(a){return a.map(csvValue).join(';');}).join('\r\n');
}
function download(filename,contents,type){var blob=new Blob([contents],{type:type}),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(href);},1000);}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('SQL-Befehl kopiert.');}catch(e){toast('Kopieren nicht möglich. Öffne die Admin-Anleitung.');}}
document.addEventListener('click',function(e){
 if(e.target.closest('#mobileMenu')){openMobile();return;}
 if(e.target.closest('#mobileShade')){closeMobile();return;}
 var sqlButton=e.target.closest('[data-sql-copy]');if(sqlButton){copyText(sqlButton.dataset.sqlCopy);return;}
 var nav=e.target.closest('[data-view]');if(nav){if(nav.dataset.view==='entry')state.selectedName='';navigate(nav.dataset.view);return;}
 var edit=e.target.closest('[data-edit]');if(edit){state.selectedName=edit.dataset.edit;navigate('entry');return;}
 var button=e.target.closest('[data-action]');if(!button)return;
 switch(button.dataset.action){
  case 'refresh':refresh(true);break;
  case 'export-csv':download('skws-command-center.csv',csvContent(),'text/csv;charset=utf-8');break;
  case 'export-json':download('skws-command-center.json',JSON.stringify({exportedAt:new Date().toISOString(),source:state.source,members:state.members},null,2),'application/json');break;
  case 'copy-list':copyText("SELECT id, name, squads, submitted_at FROM public.cc_submissions WHERE status = 'pending' ORDER BY submitted_at;");break;
  case 'copy-approve':copyText("SELECT public.cc_review_submission('UUID-DER-MELDUNG', true);");break;
  case 'copy-reject':copyText("SELECT public.cc_review_submission('UUID-DER-MELDUNG', false);");break;
 }
});
document.addEventListener('input',function(e){
 if(e.target.id==='rosterSearch'){
  state.search=e.target.value;
  var el=document.getElementById('rosterTable');if(el)el.innerHTML=rosterTable();
 }
});
document.addEventListener('change',function(e){
 var target=e.target;
 if(target.id==='rosterGroup'){state.groupFilter=target.value;document.getElementById('rosterTable').innerHTML=rosterTable();}
 if(target.id==='rosterStatus'){state.statusFilter=target.value;document.getElementById('rosterTable').innerHTML=rosterTable();}
 if(target.id==='rosterSort'){state.sort=target.value;document.getElementById('rosterTable').innerHTML=rosterTable();}
 if(target.id==='playerSelect'){state.selectedName=target.value;render();}
});
document.addEventListener('submit',function(e){if(e.target.id==='squadForm'){e.preventDefault();submitForm(e.target);}else if(MOD){MOD.handleSubmit(e);}});
window.addEventListener('keydown',function(e){if(e.key==='Escape')closeMobile();});
state.members=snapshotMembers();
if(MOD)MOD.setHost({toast:toast,refresh:function(){refresh(true);}});
render();
refresh(false);
})();