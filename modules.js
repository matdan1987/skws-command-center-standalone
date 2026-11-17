/* SKWS/FarmOps-inspired operational modules. All data are real, moderated and stored only in standalone Supabase. */
(function(){
'use strict';
var DATA={metrics:[],shields:[],events:[],seasons:[],vsStrategies:[]}, READY=false,ERROR='',VS_WEEK_VIEW='',host={toast:function(){},refresh:function(){},rerender:function(){}};
var CATS={
 vs:{title:'VS-Punkte',name:'VS-Duelle',metric:'vs_points',unit:'Punkte',icon:'swords',subtitle:'Wöchentliche VS-Leistung, Beteiligung und Gruppenvergleich',target:'vs'},
 donations:{title:'Spenden',name:'Allianzspenden',metric:'donations',unit:'Spendenpunkte',icon:'chart',subtitle:'Spenden je Spieler, Woche und Mentorengruppe',target:'donations'},
 storms:{title:'Stürme',name:'Sturm-Events',metric:'storm_score',unit:'Sturmpunkte',icon:'activity',subtitle:'Storm-Performance, Scores und aktuelle Sturmtermine',target:'storms'},
 train:{title:'Zug',name:'Zugbeiträge',metric:'train_points',unit:'Zugpunkte',icon:'layers',subtitle:'Beteiligung und Punkte rund um den Allianzzug',target:'train'},
 kills:{title:'Kills',name:'Wöchentlicher Kill-Tracker',metric:'kills',unit:'Kills',icon:'trophy',subtitle:'Bestätigte Kills pro Woche, Spieler und Mentorengruppe',target:'kills'}
};
var EVENT_TYPES={alliance:'Allianz',vs:'VS',storm:'Sturm',train:'Zug',custom:'Eigenes Event'};
function escape(x){return String(x===null||x===undefined?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ico(name){return '<svg class="icon" aria-hidden="true"><use href="#ic-'+name+'"/></svg>';}
function nums(n,d){return Number(n||0).toLocaleString('de-DE',{maximumFractionDigits:d===undefined?1:d});}
function compact(n){if(n>=1000000000)return nums(n/1000000000,2)+' Mrd.';if(n>=1000000)return nums(n/1000000,2)+' Mio.';if(n>=1000)return nums(n/1000,1)+' Tsd.';return nums(n,2);}
function localDate(date){var d=new Date(date);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
function weekStart(date){var d=new Date((date||new Date()).getTime());d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return localDate(d);}
function addDays(date,days){var d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return localDate(d);}
function weekEnd(start){return addDays(start,6);}
function currentWeek(){return weekStart(new Date());}
function previousWeek(){return addDays(currentWeek(),-7);}
function inWeek(row,start){return row.recorded_on>=start&&row.recorded_on<=weekEnd(start);}
function forMetric(metric,start){return DATA.metrics.filter(function(m){return m.metric===metric&&(!start||(inWeek(m,start)&&(metric!=='vs_points'||m.recorded_on<=addDays(start,5))));});}
function aggregate(rows){return rows.reduce(function(n,r){return n+Number(r.metric_value||0);},0);}
function contributors(rows){return new Set(rows.map(function(r){return r.member_name;})).size;}
function groupOf(name,members){var m=members.find(function(x){return x.name===name;});return m?m.group:0;}
function totals(metric,week){var rows=forMetric(metric,week);return {rows:rows,sum:aggregate(rows),count:contributors(rows)};}
function displayDate(v){if(!v)return 'Nicht festgelegt';var d=new Date(v);return isNaN(d.getTime())?'Nicht bekannt':d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function prettyDate(v){return new Date(v+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
function weekLabel(week){return prettyDate(week)+' – '+prettyDate(weekEnd(week));}
function healthy(){return READY&&!ERROR;}
function statusText(){return '<div class="mod-state">'+(healthy()?ico('check')+' Online-Daten geladen, Stand '+new Date().toLocaleDateString('de-DE'):ico('alert')+' '+escape(ERROR||'Lade Daten'))+'</div>';}
function header(kicker,title,sub,action){
 return '<header class="page-header"><div><div class="eyebrow">'+escape(kicker)+'</div><h1 class="page-title">'+escape(title)+'</h1><p class="muted">'+escape(sub)+'</p></div><div class="page-actions">'+(action||'')+'</div></header>';
}
function btn(text,view){return '<button type="button" class="btn btn-ghost" data-view="'+view+'">'+escape(text)+' '+ico('arrow')+'</button>';}
function hint(text){return '<div class="message">'+ico('shield')+'<div>'+text+'</div></div>';}
function metricsCard(label,val,foot,icon){return '<div class="metric"><div class="metric-label">'+ico(icon)+' '+escape(label)+'</div><div class="metric-value">'+escape(val)+'</div><div class="metric-foot">'+escape(foot)+'</div></div>';}
function noRecords(title,detail){return '<div class="mod-empty">'+ico('activity')+'<strong>'+escape(title)+'</strong><span>'+escape(detail)+'</span></div>';}
function memberOptions(members){return '<option value="">Spieler auswählen</option>'+members.slice().sort(function(a,b){return a.display.localeCompare(b.display,'de');}).map(function(m){return '<option value="'+escape(m.name)+'">'+escape(m.display)+'</option>';}).join('');}
function metricRows(metric,members,start){
 var rows=forMetric(metric,start),byPerson={};
 rows.forEach(function(r){var name=r.member_name;byPerson[name]=(byPerson[name]||0)+Number(r.metric_value);});
 return Object.keys(byPerson).map(function(name){var p=members.find(function(m){return m.name===name;});return {name:name,display:p?p.display:name,group:p?p.group:0,value:byPerson[name]};}).sort(function(a,b){return b.value-a.value||a.display.localeCompare(b.display,'de');});
}

/* Weekly strategies are admin-managed in Supabase; analysis is read-only. */
var VS_DAYS=[
 ['Mo','Radartraining'],['Di','Basisausbau'],['Mi','Forschung'],
 ['Do','Helden'],['Fr','Mobilisierung'],['Sa','Enemy Buster']
];
function vsConfig(week){
 return (DATA.vsStrategies||[]).find(function(x){return x.week_start===week;})||null;
}
function vsModeName(mode){return ({eco:'Eco',eco_plus:'Eco Plus',all_in:'All In'})[mode]||'Nicht festgelegt';}
function vsWeeks(){
 var set=new Set([currentWeek()]);
 (DATA.vsStrategies||[]).forEach(function(x){if(/^\d{4}-\d{2}-\d{2}$/.test(x.week_start))set.add(x.week_start);});
 (DATA.metrics||[]).forEach(function(x){if(x.metric==='vs_points'&&/^\d{4}-\d{2}-\d{2}$/.test(x.recorded_on))set.add(weekStart(new Date(x.recorded_on+'T12:00:00')));});
 if(VS_WEEK_VIEW)set.add(VS_WEEK_VIEW);
 return Array.from(set).sort().reverse();
}
function vsWeekPicker(selected){
 return '<label class="vs-week-picker"><span>VS-WOCHE</span><select id="vsWeekPicker" aria-label="VS-Woche auswählen">'+
  vsWeeks().map(function(w){return '<option value="'+escape(w)+'"'+(w===selected?' selected':'')+'>'+escape(prettyDate(w))+' – '+escape(prettyDate(addDays(w,5)))+'</option>';}).join('')+
  '</select></label>';
}
function vsDayRows(week,index){
 var date=addDays(week,index);
 return forMetric('vs_points',week).filter(function(r){return r.recorded_on===date;});
}
function vsMemberExcess(name,week,target){
 var rows=forMetric('vs_points',week).filter(function(r){return r.member_name===name;});
 var extra=rows.reduce(function(sum,r){return sum+Math.max(0,Number(r.metric_value||0)-target);},0);
 var days=rows.filter(function(r){return Number(r.metric_value)>target;}).length;
 return {extra:extra,days:days};
}
function vsStrategyPanel(week){
 var cfg=vsConfig(week);
 if(!cfg)return '<section class="panel vs-strategy-panel"><div class="panel-heading"><div><h2>VS-Wochenstrategie</h2><p class="muted">Für diese Woche ist noch keine Eco-, Eco-Plus- oder All-In-Strategie hinterlegt.</p></div></div>'+
 '<p class="muted">Ohne explizite Strategie werden keine Überschreitungen negativ bewertet.</p></section>';
 var goal=Number(cfg.daily_target_points),rows=forMetric('vs_points',week),
   exceeds=rows.filter(function(r){return Number(r.metric_value)>goal;}),
   overPoints=exceeds.reduce(function(sum,r){return sum+(Number(r.metric_value)-goal);},0),
   full=rows.filter(function(r){return Number(r.metric_value)>=goal;}).length,
   provisional=rows.some(function(r){return /zwischenstand/i.test(r.notes||'');}),
   negative=cfg.mode==='eco',
   modeClass=negative?'vs-mode-eco':cfg.mode==='eco_plus'?'vs-mode-plus':'vs-mode-all',
   days=VS_DAYS.map(function(day,i){
    var records=vsDayRows(week,i),over=records.filter(function(r){return Number(r.metric_value)>goal;}),
      amount=over.reduce(function(sum,r){return sum+Number(r.metric_value)-goal;},0),
      count=records.filter(function(r){return Number(r.metric_value)>=goal;}).length,
      status=!records.length?'<span class="vs-pill vs-pill-neutral">Keine Meldungen</span>':
        (cfg.mode==='eco'&&over.length?'<span class="vs-pill vs-pill-negative">'+over.length+' über Ziel</span>':
        cfg.mode==='eco_plus'&&over.length?'<span class="vs-pill vs-pill-review">'+over.length+' prüfen</span>':
        '<span class="vs-pill vs-pill-good">'+(cfg.mode==='all_in'?'Offensiv':'Im Rahmen')+'</span>');
    return '<tr><td><strong>'+day[0]+'</strong> <small class="vs-day-theme">'+escape(day[1])+'</small></td>'+
      '<td class="num">'+(records.length?records.length:'–')+'</td>'+
      '<td class="num">'+(records.length?count:'–')+'</td>'+
      '<td class="num">'+(records.length?over.length:'–')+'</td>'+
      '<td class="num '+(negative&&amount?'vs-negative':'')+'">'+(records.length?'+'+nums(amount,0):'–')+'</td>'+
      '<td>'+status+'</td></tr>';
   }).join('');
 return '<section class="panel vs-strategy-panel">'+
 '<div class="panel-heading"><div><div class="vs-eyebrow">ALLIANZ-VORGABE · '+escape(prettyDate(week))+' BIS '+escape(prettyDate(addDays(week,5)))+'</div>'+
 '<h2>Strategie: <span class="vs-mode '+modeClass+'">'+escape(vsModeName(cfg.mode))+'</span></h2>'+
 '<p class="muted">'+(negative?'7,2-Mio.-Prinzip: Jeder Punkt über dem Tageslimit wird als Eco-Abweichung markiert.':
 cfg.mode==='eco_plus'?'Truhen sichern und nur die für einen Tagessieg nötigen Zusatzpunkte einsetzen. Ohne Gegnerdaten kein automatischer Malus.':
 'Keine Eco-Strafe: Jeder zusätzliche VS-Punkt zählt regulär.')+'</p></div></div>'+
 '<div class="vs-summary">'+
 '<div><span>Truhenziel / Tag</span><strong>'+nums(goal,0)+'</strong></div>'+
 '<div><span>Erfasste Tageswerte</span><strong>'+rows.length+'</strong></div>'+
 '<div><span>Truhenziel erreicht</span><strong>'+full+'</strong></div>'+
 '<div><span>'+(negative?'Eco-Abweichungen':'Tageswerte über Ziel')+'</span><strong class="'+(negative&&exceeds.length?'vs-negative':'')+'">'+exceeds.length+'</strong></div>'+
 '<div><span>'+(negative?'Überschuss (negativ)':'Punkte über Ziel')+'</span><strong class="'+(negative&&overPoints?'vs-negative':'')+'">+'+nums(overPoints,0)+'</strong></div></div>'+
 '<div class="table-scroll"><table class="vs-days-table"><thead><tr><th>Tag</th><th>Meldungen</th><th>Truhenziel</th><th>Über Ziel</th><th>Zusatzpunkte</th><th>Strategie</th></tr></thead><tbody>'+days+'</tbody></table></div>'+
 '<p class="vs-explainer">'+(provisional?'Diese Zahlen enthalten Zwischenstände und sind noch keine Tages-Endergebnisse. ':'')+
 'Bewertung pro Spieler und Tag, Montag bis Samstag. Überschuss ist eine Strategieabweichung, kein automatisch belegter Ressourcenverlust. '+
 'Sonntag ist Vorbereitungstag. Die Tagesaufgaben können je nach Spielversion abweichen.</p></section>';
}
function vsExtraCell(row,week,cfg){
 if(!cfg)return '';
 var total=vsMemberExcess(row.name,week,Number(cfg.daily_target_points));
 if(!total.extra)return '<td><span class="vs-pill vs-pill-neutral">Kein Überschuss</span></td>';
 var negative=cfg.mode==='eco',clazz=negative?'vs-pill-negative':cfg.mode==='eco_plus'?'vs-pill-review':'vs-pill-good',
   word=negative?'Eco-Malus':cfg.mode==='eco_plus'?'Prüfen':'All In';
 return '<td><span class="vs-pill '+clazz+'">'+word+': +'+nums(total.extra,0)+'</span> <small class="vs-day-count">'+total.days+' Tag'+(total.days===1?'':'e')+'</small></td>';
}

function metricTable(metric,members,start){
 var rows=metricRows(metric,members,start);
 if(!rows.length)return noRecords('Noch keine bestätigten Meldungen','Reiche den ersten Wert ein. Nach Freigabe erscheint die Rangliste.');
 var strategy=metric==='vs_points'?vsConfig(start):null;
 return '<div class="table-scroll"><table><thead><tr><th>Platz</th><th>Spieler</th><th>Gruppe</th><th>Wochenwert</th>'+(strategy?'<th>Strategie-Auswertung</th>':'')+'</tr></thead><tbody>'+
 rows.map(function(r,i){return '<tr><td><b class="num">'+(i+1)+'.</b></td><td><strong>'+escape(r.display)+'</strong></td><td>'+(r.group?'G'+r.group:'–')+'</td>'+
 '<td class="num">'+escape(metric==='vs_points'?nums(r.value,0):compact(r.value))+'</td>'+(strategy?vsExtraCell(r,start,strategy):'')+'</tr>';}).join('')+'</tbody></table></div>';
}
function groupTable(metric,members,start){
 var rows=metricRows(metric,members,start);var values=[1,2,3,4,5].map(function(g){return {group:g,value:rows.filter(function(r){return r.group===g;}).reduce(function(a,r){return a+r.value;},0)};});
 var max=Math.max(0,...values.map(function(r){return r.value;}));
 if(!max)return noRecords('Noch keine Gruppenwerte','Freigegebene Meldungen werden hier nach Mentorengruppe verglichen.');
 return '<div class="group-track">'+values.map(function(r){var pct=max?Math.round(100*r.value/max):0;return '<div class="group-track-row"><div class="group-track-head"><span>Gruppe '+r.group+'</span><small>'+escape(compact(r.value))+'</small></div><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div></div>';}).join('')+'</div>';
}
function metricReportForm(cat,members){
 return '<section class="mod-panel mod-report-panel"><div class="panel-heading"><div><h2>Wert zur Prüfung einreichen</h2><p class="muted">Erst nach Admin-Freigabe erscheint er in den öffentlichen Statistiken.</p></div></div>'+
 '<form id="metricReportForm" class="mod-form" data-metric="'+cat.metric+'">'+
 '<div class="form-grid"><div class="field"><label for="metricMember">SPIELER *</label><select id="metricMember" class="select" required>'+memberOptions(members)+'</select></div>'+
 '<div class="field"><label for="metricDate">DATUM *</label><input id="metricDate" class="input" type="date" required value="'+localDate(new Date())+'"></div>'+
 '<div class="field"><label for="metricValue">'+escape(cat.unit.toUpperCase())+' *</label><input id="metricValue" class="input" type="number" min="0" max="999999999999" step="0.01" inputmode="decimal" required placeholder="0"></div>'+
 '<div class="field"><label for="metricNote">ANMERKUNG (OPTIONAL)</label><input id="metricNote" class="input" maxlength="280" placeholder="z. B. Event oder VS-Tag"></div></div>'+
 '<div class="form-actions"><button class="btn btn-primary" type="submit"'+(healthy()?'':' disabled')+'>'+ico('send')+'Meldung einreichen</button></div></form></section>';
}
function metricPage(key,members){
 var cfg=CATS[key];if(!cfg)return '';
 var wk=key==='vs'?(VS_WEEK_VIEW||currentWeek()):currentWeek(),prev=key==='vs'?addDays(wk,-7):previousWeek(),current=totals(cfg.metric,wk),last=totals(cfg.metric,prev);
 var change=last.sum>0?nums((current.sum-last.sum)/last.sum*100,1)+' % gegenüber Vorwoche':'Keine Vorwochen-Daten';
 var history=[0,1,2,3].map(function(i){var w=addDays(wk,-7*(3-i)),r=totals(cfg.metric,w);return {week:w,sum:r.sum};});var max=Math.max(0,...history.map(function(r){return r.sum;}));
 var bars='<div class="mod-weeks">'+history.map(function(r){return '<div class="mod-week"><span>'+escape(prettyDate(r.week))+'</span><div class="mod-weekbar"><div style="height:'+(max?Math.max(2,Math.round(100*r.sum/max)):0)+'%"></div></div><b>'+escape(r.sum?compact(r.sum):'–')+'</b></div>';}).join('')+'</div>';
 var panel='<div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>Gruppenvergleich</h2><div class="description">Bestätigte Werte in dieser Woche</div></div></div>'+groupTable(cfg.metric,members,wk)+'</section>'+
 '<section class="panel"><div class="panel-heading"><div><h2>Vierwochen-Trend</h2><div class="description">Tagesmeldungen summiert pro Kalenderwoche</div></div></div>'+bars+'</section></div>';
 return header('ALLIANCE / TRACKING',cfg.name,cfg.subtitle,(key==='vs'?vsWeekPicker(wk):'')+btn('Vergleich öffnen','compare'))+statusText()+(forMetric(cfg.metric,wk).some(function(r){return /Zwischenstand/i.test(r.notes||'');}) ? hint(cfg.metric==='donations' ? '<strong>Vorläufiger Spenden-Tagesstand (16.11.2026):</strong> Die 97 Werte stammen aus der täglichen Last-War-Rangliste. Die angezeigte Wochensumme enthält derzeit nur gemeldete Tageswerte und ist weder das abgeschlossene Wochen- noch das Endergebnis.' : '<strong>Vorläufiger VS-Zwischenstand:</strong> Die eingetragenen Punkte stammen aus den Last-War-Screenshots und sind ausdrücklich noch kein Endergebnis. Die Werte werden nach dem offiziellen Abschluss aktualisiert.') : '')+
 '<div class="metrics">'+metricsCard(key==='vs'?'Ausgewählte VS-Woche':'Diese Woche',current.rows.length?compact(current.sum):'–','Woche '+(key==='vs'?prettyDate(wk)+' – '+prettyDate(addDays(wk,5)):weekLabel(wk)),'chart')+
 metricsCard('Aktive Melder',current.rows.length?String(current.count):'–','Spieler mit freigegebenen Werten','users')+
 metricsCard('Vorwoche',last.rows.length?compact(last.sum):'–','Woche '+weekLabel(prev),'clock')+
 metricsCard('Entwicklung',last.rows.length&&current.rows.length?change:'–','Ohne Meldungen keine belastbare Quote','activity')+'</div>'+(key==='vs'?vsStrategyPanel(wk):'')+panel+
 '<section class="panel table-panel"><div class="table-panel-header"><div><h2>Spieler-Rangliste</h2><small>'+escape(key==='vs'?prettyDate(wk)+' – '+prettyDate(addDays(wk,5)):weekLabel(wk))+'</small></div></div>'+metricTable(cfg.metric,members,wk)+'</section>'+
 '<div style="height:22px"></div>'+metricReportForm(cfg,members);
}
function shieldStatus(s){
 if(!s)return {status:'unknown',label:'Nicht gemeldet'};
 if(s.shield_status==='active'&&s.expires_at&&new Date(s.expires_at).getTime()<Date.now())return {status:'missing',label:'Abgelaufen'};
 if(s.shield_status==='active')return {status:'active',label:'Schild aktiv'};
 if(s.shield_status==='missing')return {status:'missing',label:'Kein Schild'};
 return {status:'unknown',label:'Unbekannt'};
}
function shieldsPage(members){
 var mapped=new Map(DATA.shields.map(function(s){return [s.member_name,s];}));var list=members.map(function(m){var record=mapped.get(m.name),s=shieldStatus(record);return {member:m,record:record,status:s.status,label:s.label};});
 var active=list.filter(function(m){return m.status==='active';}),missing=list.filter(function(m){return m.status==='missing';}),unknown=list.filter(function(m){return m.status==='unknown';});
 return header('ALLIANCE / DEFENSE','Schildkontrolle','Manuell bestätigter Schildstatus, einschließlich Ablaufzeiten',btn('Events öffnen','events'))+statusText()+
 '<div class="metrics">'+metricsCard('Aktive Schilde',String(active.length),'Nur bestätigte und nicht abgelaufene Schilde','shield')+
 metricsCard('Ohne Schild',String(missing.length),'Gemeldet oder zeitlich abgelaufen','alert')+
 metricsCard('Ohne Status',String(unknown.length),'Noch keine geprüfte Schildmeldung','users')+
 metricsCard('Abdeckung',DATA.shields.length?nums(active.length/members.length*100,1)+' %':'–','Von '+members.length+' Spielern','chart')+'</div>'+
 hint('<strong>Hinweis:</strong> Ohne technische Last-War-Schnittstelle sind diese Angaben nicht automatisch geprüft. Sie beruhen auf freigegebenen Spieler-Meldungen. Ein nicht gemeldeter Status ist ausdrücklich kein bestätigter Schildverlust.')+
 '<div class="dashboard-grid"><section class="panel table-panel"><div class="table-panel-header"><div><h2>Schildübersicht</h2><small>Stand der freigegebenen Einträge</small></div></div><div class="table-scroll"><table><thead><tr><th>Spieler</th><th>Gruppe</th><th>Status</th><th>Läuft ab</th></tr></thead><tbody>'+
 list.map(function(x){return '<tr><td><strong>'+escape(x.member.display)+'</strong></td><td>'+(x.member.group?'G'+x.member.group:'–')+'</td><td><span class="pill '+(x.status==='active'?'':x.status==='missing'?'pending':'off')+'">'+escape(x.label)+'</span></td><td>'+escape(x.record&&x.record.expires_at?displayDate(x.record.expires_at):'–')+'</td></tr>';}).join('')+'</tbody></table></div></section>'+
 '<section class="panel"><div class="panel-heading"><div><h2>Schildstatus melden</h2><p class="muted">Die Meldung wird erst nach Prüfung übernommen.</p></div></div><form id="shieldReportForm" class="mod-form">'+
 '<div class="field"><label for="shieldMember">SPIELER *</label><select id="shieldMember" class="select" required>'+memberOptions(members)+'</select></div>'+
 '<div class="field"><label for="shieldStatus">SCHILDSTATUS *</label><select id="shieldStatus" class="select" required><option value="active">Schild aktiv</option><option value="missing">Kein Schild</option><option value="unknown">Unbekannt</option></select></div>'+
 '<div class="field"><label for="shieldExpires">ABLAUFZEIT (WENN BEKANNT)</label><input id="shieldExpires" type="datetime-local" class="input"></div>'+
 '<div class="field"><label for="shieldNote">ANMERKUNG</label><input id="shieldNote" maxlength="280" class="input" placeholder="Optional"></div>'+
 '<div class="form-actions"><button type="submit" class="btn btn-primary"'+(healthy()?'':' disabled')+'>'+ico('send')+'Zur Prüfung senden</button></div></form></section></div>';
}
function upcomingEvents(category){
 return DATA.events.filter(function(e){return !category||e.category===category;}).slice().sort(function(a,b){return new Date(a.starts_at)-new Date(b.starts_at);});
}
function eventList(category){
 var events=upcomingEvents(category);if(!events.length)return noRecords('Noch keine bestätigten Termine','Erstelle einen Vorschlag. Ein Admin kann ihn danach veröffentlichen.');
 return '<div class="mod-event-list">'+events.map(function(e){
  var when=new Date(e.starts_at),past=!!e.ends_at?new Date(e.ends_at)<new Date():when<new Date();return '<article class="mod-event"><div class="mod-event-day"><strong>'+escape(when.toLocaleDateString('de-DE',{day:'2-digit'}))+'</strong><small>'+escape(when.toLocaleDateString('de-DE',{month:'short'}))+'</small></div><div class="mod-event-info"><div><span class="role-badge">'+escape(EVENT_TYPES[e.category]||e.category)+'</span>'+(past?'<span class="role-badge">Vergangen</span>':'')+'</div><h3>'+escape(e.title)+'</h3><p>'+escape(e.description||'Keine Beschreibung hinterlegt')+'</p><small>'+escape(displayDate(e.starts_at))+(e.ends_at?' bis '+escape(displayDate(e.ends_at)):'')+'</small></div></article>';
 }).join('')+'</div>';
}
function eventForm(members,category){
 var types=Object.keys(EVENT_TYPES).map(function(k){return '<option value="'+k+'"'+(k===(category||'custom')?' selected':'')+'>'+escape(EVENT_TYPES[k])+'</option>';}).join('');
 return '<section class="mod-panel mod-report-panel"><div class="panel-heading"><div><h2>Neues Event vorschlagen</h2><p class="muted">Ein Admin prüft den Termin, bevor er öffentlich sichtbar wird.</p></div></div><form id="eventProposalForm" class="mod-form"><div class="form-grid">'+
 '<div class="field"><label for="eventMember">VORSCHLAG VON *</label><select id="eventMember" class="select" required>'+memberOptions(members)+'</select></div>'+
 '<div class="field"><label for="eventCategory">KATEGORIE *</label><select id="eventCategory" class="select" required>'+types+'</select></div>'+
 '<div class="field"><label for="eventTitle">EVENTNAME *</label><input id="eventTitle" class="input" maxlength="110" minlength="3" placeholder="Name des Events" required></div>'+
 '<div class="field"><label for="eventStart">BEGINN *</label><input id="eventStart" type="datetime-local" class="input" required></div>'+
 '<div class="field"><label for="eventEnd">ENDE (OPTIONAL)</label><input id="eventEnd" type="datetime-local" class="input"></div>'+
 '<div class="field"><label for="eventDescription">BESCHREIBUNG</label><input id="eventDescription" class="input" maxlength="1000" placeholder="Optionale Details"></div></div>'+
 '<div class="form-actions"><button type="submit" class="btn btn-primary"'+(healthy()?'':' disabled')+'>'+ico('send')+'Eventvorschlag senden</button></div></form></section>';
}
function eventsPage(members,customOnly){
 var cat=customOnly?'custom':null,events=upcomingEvents(cat),future=events.filter(function(e){return !e.ends_at?new Date(e.starts_at)>=new Date():new Date(e.ends_at)>=new Date();});
 return header('ALLIANCE / CALENDAR',customOnly?'Eigene Events':'Eventkalender',customOnly?'Individuelle Allianz-Events erstellen und verwalten':'Allianz-, VS-, Sturm- und Zugtermine im Überblick',btn(customOnly?'Alle Events':'Eigene Events',customOnly?'events':'custom'))+statusText()+
 '<div class="metrics">'+metricsCard('Veröffentlichte Events',events.length+'','Nur bestätigte Termine','grid')+
 metricsCard('Kommende Events',future.length+'','Laufende und zukünftige Termine','clock')+
 metricsCard('Eventkategorien',String(Object.keys(EVENT_TYPES).length),'Allianz, VS, Sturm, Zug, Eigenes','layers')+
 metricsCard('Freigabe','Aktiv','Neue Vorschläge müssen geprüft werden','shield')+'</div>'+
 '<section class="panel"><div class="panel-heading"><div><h2>'+escape(customOnly?'Custom-Events':'Termine & Aktivitäten')+'</h2><div class="description">Zeitangaben in deiner lokalen Zeitzone</div></div></div>'+eventList(cat)+'</section>'+
 '<div style="height:20px"></div>'+eventForm(members,cat);
}
function seasonsPage(){
 var seasons=DATA.seasons.slice().sort(function(a,b){return Number(b.id)-Number(a.id);});
 var latest=seasons.length?seasons[0]:null;
 return header('ALLIANCE / SEASONS','Saisons','Phasen, Termine und Saisoninformationen für Server 1858',btn('Eventkalender','events'))+statusText()+
 '<div class="metrics">'+metricsCard('Dokumentierte Saisons',String(seasons.length),'Von der Allianz eingetragen','layers')+
 metricsCard('Aktuelle Phase',latest&&latest.phase==='current'?'Laufend':latest&&latest.phase==='after'?'After Season':'–','Aus hinterlegten Saisonangaben','activity')+
 metricsCard('Saison-Events',String(DATA.events.filter(function(e){return e.category==='alliance'||e.category==='custom';}).length),'Öffentlich bestätigte Termine','grid')+
 metricsCard('Datengrundlage','Manuell','Keine automatische Spiel-API','shield')+'</div>'+
 '<section class="panel"><div class="panel-heading"><div><h2>Saisonverlauf</h2><div class="description">Nur eingetragene, bestätigte Informationen</div></div></div>'+
 (seasons.length?'<div class="mod-seasons">'+seasons.map(function(s){return '<article class="mod-season"><span class="mod-season-node"></span><div><span class="role-badge">'+escape({planned:'Geplant',current:'Aktuell',after:'After Season',completed:'Abgeschlossen'}[s.phase]||s.phase)+'</span><h3>'+escape(s.title)+'</h3><small>'+escape(s.starts_on?prettyDate(s.starts_on):'Beginn unbekannt')+' · '+escape(s.ends_on?prettyDate(s.ends_on):'Ende offen')+'</small><p>'+escape(s.notes||'Keine weiteren Details')+'</p></div></article>';}).join('')+'</div>':
 noRecords('Noch keine Saison eingetragen','Saisoninformationen werden geschützt im neuen Supabase-Projekt verwaltet.'))+'</section>'+
 '<div style="height:18px"></div>'+hint('<strong>Administration:</strong> Saisontexte und Phasen dürfen nur über den separaten Supabase-Adminbereich gepflegt werden. Öffentliche Besucher können sie lesen, aber nicht verändern.');
}
function comparePage(members){
 var weeks=[currentWeek(),previousWeek(),addDays(currentWeek(),-14),addDays(currentWeek(),-21)];
 var columns=[['VS-Punkte','vs_points'],['Spenden','donations'],['Kills','kills'],['Zugpunkte','train_points']];
 var any=DATA.metrics.length>0;
 var rows=columns.map(function(c){var sums=weeks.map(function(w){return totals(c[1],w);});return '<tr><td><b>'+escape(c[0])+'</b></td>'+sums.map(function(v){return '<td class="num">'+(v.rows.length?escape(compact(v.sum)):'–')+'</td>';}).join('')+'</tr>';}).join('');
 var bars=columns.map(function(c){var cur=totals(c[1],weeks[0]),prev=totals(c[1],weeks[1]),max=Math.max(cur.sum,prev.sum,1);return '<div class="mod-compare-row"><strong>'+escape(c[0])+'</strong><div class="mod-compare-values"><span>'+ico('chart')+' Diese Woche '+(cur.rows.length?escape(compact(cur.sum)):'–')+'</span><span>Vorwoche '+(prev.rows.length?escape(compact(prev.sum)):'–')+'</span></div><div class="mod-two-bars"><div style="width:'+Math.round(cur.sum/max*100)+'%"></div><div style="width:'+Math.round(prev.sum/max*100)+'%"></div></div></div>';}).join('');
 return header('ANALYTICS / COMPARE','Vergleich','Allianzleistung und Entwicklung über die letzten vier Wochen',btn('Dashboard','overview'))+statusText()+
 (!any?hint('<strong>Noch keine Trackingdaten:</strong> Das ist kein Ergebnis von null Punkten. Es wurden bisher schlicht keine geprüften VS-, Spenden-, Sturm-, Kill- oder Zugwerte erfasst.'): '')+
 '<div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>Wochenvergleich</h2><div class="description">Aktuelle Woche gegen Vorwoche, nur bestätigte Meldungen</div></div></div>'+bars+'</section>'+
 '<section class="panel"><div class="panel-heading"><div><h2>Erfassungsumfang</h2><div class="description">Transparenz statt künstlicher Prozentwerte</div></div></div>'+
 columns.map(function(c){var rows=totals(c[1],weeks[0]);return '<div class="status-item"><span>'+escape(c[0])+'</span><b>'+(rows.rows.length?rows.count+' Spieler · '+rows.rows.length+' Tagesmeldungen':'Keine Daten')+'</b></div>';}).join('')+'</section></div>'+
 '<section class="panel table-panel"><div class="table-panel-header"><div><h2>Vierwochen-Tabelle</h2><small>Alle Zahlen basieren ausschließlich auf freigegebenen Meldungen</small></div></div><div class="table-scroll"><table><thead><tr><th>Kategorie</th>'+weeks.map(function(w){return '<th>'+escape(prettyDate(w))+'</th>';}).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div></section>';
}
function dashboardAddon(members){
 var wk=currentWeek(),vs=totals('vs_points',wk),don=totals('donations',wk),storm=totals('storm_score',wk),kill=totals('kills',wk),strategy=vsConfig(wk),ecoCount=0;
 if(strategy&&strategy.mode==='eco')ecoCount=vs.rows.filter(function(r){return Number(r.metric_value)>Number(strategy.daily_target_points);}).length;
 var stormMatches=Array.isArray(DATA.stormMatches)?DATA.stormMatches.filter(function(m){return m.event_date>=wk&&m.event_date<=addDays(wk,6);}):[];
 var cols=[{label:'VS-Duelle diese Woche',view:'vs',metric:'vs_points',data:vs,icon:'swords'},
 {label:'Spenden diese Woche',view:'donations',metric:'donations',data:don,icon:'chart'},
 {label:'Wüstensturm A/B',view:'storms',metric:'storm_matches',data:{rows:stormMatches,count:stormMatches.length,sum:stormMatches.length},icon:'activity'}];
 var cards=cols.map(function(c){return '<section class="mod-summary-card"><div class="mod-card-title">'+ico(c.icon)+'<strong>'+escape(c.label)+'</strong><button class="micro-link" data-view="'+c.view+'">Alle anzeigen '+ico('arrow')+'</button></div>'+
 (c.data.rows.length?'<div class="mod-summary-value">'+escape(compact(c.data.sum))+'</div><div class="mod-summary-sub">'+(c.metric==='storm_matches'?'Getrennte Team-A- und Team-B-Einsätze':'Spieler mit erfassten Werten: '+c.data.count)+'</div>':
 noRecords(c.metric==='storm_matches'?'Noch keine Wüstensturm-Einsätze':'Noch keine Trackingdaten',c.metric==='storm_matches'?'Team-A- und Team-B-Ergebnisse werden getrennt verwaltet.':'Neue Meldungen erscheinen nach Prüfung.'))+
 '<div class="mod-summary-footer"><span>'+escape(weekLabel(wk))+'</span>'+(c.metric==='vs_points'&&strategy?'<div class="vs-dashboard-note">VS-Strategie: '+escape(vsModeName(strategy.mode))+(strategy.mode==='eco'?' · '+ecoCount+' Tageswerte über Eco-Ziel':'')+'</div>':'')+'</div></section>';}).join('');
 var leaders=[
  {name:'VS-Punkte',data:metricRows('vs_points',members,wk)},
  {name:'Spenden',data:metricRows('donations',members,wk)},
  {name:'Zugpunkte',data:metricRows('train_points',members,wk)}
 ];
 var ranked=(strategy&&strategy.mode==='eco'?leaders.find(function(c){return c.name==='Spenden'&&c.data.length>0;}):null)||leaders.find(function(c){return c.data.length>0;});
 var first=ranked?ranked.data[0]:null;
 return '<section class="mod-section-header"><div><h2>Allianz-Aktivität</h2><p>Die Bereiche aus dem Operations-Dashboard, mit echten Daten statt Demo-Statistiken</p></div>'+btn('Alle Vergleiche','compare')+'</section>'+
 '<div class="mod-summary-grid">'+cards+'</div>'+
 '<div class="mod-secondary"><div class="mod-secondary-title">'+ico('trophy')+' Wochenleistung</div>'+
 (first?'<div class="mod-secondary-member"><strong>'+escape(first.display)+'</strong><span>'+(strategy&&strategy.mode==='eco'&&ranked.name==='VS-Punkte'?'Höchster VS-Wert (Eco-Regel prüfen)':'Beste Meldung in '+escape(ranked.name))+' · '+escape(compact(first.value))+'</span></div>':
 '<span>Für eine Wochenrangliste fehlen noch freigegebene Aktivitätswerte.</span>')+
 '<button class="micro-link" data-view="kills">'+ico('trophy')+' Kill-Tracker '+(kill.rows.length?escape(compact(kill.sum)):'ohne Meldungen')+'</button></div>';
}
function shareSummary(members){
 var wk=currentWeek(),roster=members.length,t1=members.filter(function(m){return m.squads&&m.squads[0];}).length;
 var total=members.reduce(function(n,m){return n+(m.squads&&m.squads[0]?Number(m.squads[0].power||0):0);},0);
 var lines=['SKWS / Skywalkers · Server 1858','Allianzbericht für '+weekLabel(wk),'',
 'Mitglieder: '+roster,'T1 gemeldet: '+t1,'Gesamte gemeldete T1-Kampfkraft: '+nums(total,2)+' Mio.',''];
 [['VS-Punkte','vs_points'],['Spenden','donations'],['Kills','kills'],['Zugpunkte','train_points']].forEach(function(c){
  var info=totals(c[1],wk);lines.push(c[0]+': '+(info.rows.length?nums(info.sum,2)+' · '+info.count+' meldende Spieler':'noch keine freigegebenen Werte'));
 });
 lines.push('','Datenbasis: nur bestätigte Meldungen aus dem unabhängigen SKWS Command Center.','https://matdan1987.github.io/skws-command-center-standalone/');
 return lines.join('\n');
}
function render(type,members){if(CATS[type])return metricPage(type,members);if(type==='shields')return shieldsPage(members);if(type==='events')return eventsPage(members,false);if(type==='custom')return eventsPage(members,true);if(type==='seasons')return seasonsPage();if(type==='compare')return comparePage(members);return null;}
async function send(event){
 var form=event.target,kind=form.id;
 if(!['metricReportForm','shieldReportForm','eventProposalForm'].includes(kind))return false;
 event.preventDefault();
 if(!healthy()){host.toast('Online-Tracking ist nicht erreichbar.');return true;}
 var api=window.SKWS_BACKEND,button=form.querySelector('button[type="submit"]');
 if(!api)return true;
 if(button){button.disabled=true;button.textContent='Wird übermittelt …';}
 try{
  if(kind==='metricReportForm'){
   var name=form.querySelector('#metricMember').value,metric=form.dataset.metric,raw=form.querySelector('#metricValue').value,day=form.querySelector('#metricDate').value;
   var value=Number(raw.replace(',','.')),note=form.querySelector('#metricNote').value;
   if(!name||!raw||!Number.isFinite(value)||value<0||value>999999999999)throw Error('Ungültige Eingaben');
   if(metric==='vs_points'&&new Date(day+'T12:00:00').getDay()===0)throw Error('Sonntag ist VS-Vorbereitungstag. Wähle Montag bis Samstag.');
   await api.submitMetric({member_name:name,metric:metric,recorded_on:day,metric_value:value,notes:note});
  }else if(kind==='shieldReportForm'){
   var player=form.querySelector('#shieldMember').value,status=form.querySelector('#shieldStatus').value,expiration=form.querySelector('#shieldExpires').value;
   if(!player)throw Error('Spieler wählen');
   await api.submitShield({member_name:player,shield_status:status,expires_at:status==='active'&&expiration?new Date(expiration).toISOString():null,notes:form.querySelector('#shieldNote').value});
  }else{
   var person=form.querySelector('#eventMember').value,title=form.querySelector('#eventTitle').value.trim(),
   category=form.querySelector('#eventCategory').value,start=form.querySelector('#eventStart').value,end=form.querySelector('#eventEnd').value;
   if(!person||title.length<3||!start)throw Error('Pflichtfelder fehlen');
   var startIso=new Date(start).toISOString(),endIso=end?new Date(end).toISOString():null;
   if(endIso&&new Date(endIso)<=new Date(startIso))throw Error('Ende muss nach Beginn liegen');
   await api.proposeEvent({requester_name:person,title:title,category:category,starts_at:startIso,ends_at:endIso,description:form.querySelector('#eventDescription').value});
  }
  form.reset();host.toast('Online eingereicht. Nach Admin-Freigabe öffentlich sichtbar.');
  return true;
 }catch(e){host.toast('Einreichen fehlgeschlagen: '+(e&&e.message||'Unbekannter Fehler'));return true;}
 finally{if(button){button.disabled=false;button.innerHTML=ico('send')+'Zur Prüfung einreichen';}}
}
window.SKWS_MODULES={
 setHost:function(x){host=x;},
 setData:function(data){DATA=data||{metrics:[],shields:[],events:[],seasons:[],vsStrategies:[]};if(!Array.isArray(DATA.vsStrategies))DATA.vsStrategies=[];READY=true;ERROR='';},
 setVsWeek:function(week){VS_WEEK_VIEW=/^\d{4}-\d{2}-\d{2}$/.test(week)?week:'';host.rerender();},
 setError:function(err){READY=false;ERROR=err&&err.message||'Tracking nicht verfügbar';},
 render:render,
 dashboardAddon:dashboardAddon,
 shareSummary:shareSummary,
 handleSubmit:send,
 status:function(){return {ready:READY,error:ERROR,counts:{metrics:DATA.metrics.length,shields:DATA.shields.length,events:DATA.events.length,seasons:DATA.seasons.length}}}
};
})();
