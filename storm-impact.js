/* SKWS Wüstensturm A/B + transparente Gesamtstatistik. Kein öffentlicher Schreibzugriff. */
(function(){
'use strict';
var MOD=window.SKWS_MODULES;
if(!MOD)return;
var DATA={},HOST={rerender:function(){}},STORM_WEEK='',IMPACT_WEEK='',IMPACT_FILTER='all',IMPACT_QUERY='';
var previousSetData=MOD.setData,previousSetHost=MOD.setHost,previousRender=MOD.render;
MOD.setData=function(value){DATA=value||{};return previousSetData.call(MOD,value);};
MOD.setHost=function(value){HOST=value||HOST;return previousSetHost.call(MOD,value);};
function esc(value){return String(value===undefined||value===null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function num(n){return Number(n||0).toLocaleString('de-DE',{maximumFractionDigits:0});}
function percent(n){return Math.round(n||0);}
function dayDate(x){return new Date(x+'T12:00:00');}
function fmt(x){return x?dayDate(x).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'–';}
function ds(x,n){var d=dayDate(x);d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function weekOf(x){var d=dayDate(x);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function thisWeek(){return weekOf(today());}
function array(key){return Array.isArray(DATA[key])?DATA[key]:[];}
function weeksFor(key){
 var set=new Set([thisWeek()]);var list=key==='storm'?array('stormMatches'):array('metrics');
 list.forEach(function(x){var d=key==='storm'?x.event_date:x.recorded_on;if(/^\d{4}-\d{2}-\d{2}$/.test(d))set.add(weekOf(d));});
 if(key==='impact')array('stormMatches').forEach(function(x){if(x.event_date)set.add(weekOf(x.event_date));});
 return Array.from(set).sort().reverse().slice(0,24);
}
function weekPicker(id,selected,kind){
 var weeks=weeksFor(kind);
 return '<label class="ops-week-selector">WOCHE <select id="'+id+'" aria-label="Woche auswählen">'+weeks.map(function(w){return '<option value="'+esc(w)+'"'+(w===selected?' selected':'')+'>'+fmt(w)+' bis '+fmt(ds(w,6))+'</option>';}).join('')+'</select></label>';
}
function panelHeading(title,subtitle){
 return '<div class="panel-heading"><div><h2>'+esc(title)+'</h2><p class="muted">'+esc(subtitle)+'</p></div></div>';
}
function block(text){return '<div class="ops-info">'+text+'</div>';}
function pill(kind,label){return '<span class="ops-flag ops-'+kind+'">'+esc(label)+'</span>';}
function matchesIn(week){
 return array('stormMatches').filter(function(m){return m.event_date>=week&&m.event_date<=ds(week,6);})
  .sort(function(a,b){return a.event_date.localeCompare(b.event_date)||a.team.localeCompare(b.team);});
}
function resultName(s){return ({pending:'Noch offen',win:'Gewonnen',loss:'Verloren',draw:'Unentschieden',cancelled:'Ausgefallen'})[s]||'Unbekannt';}
function attendanceName(s){return ({present:'Teilgenommen',absent:'Nicht erschienen',not_called:'Nicht eingewechselt',unknown:'Ungeprüft'})[s]||'Unbekannt';}
function userName(name,members){var m=members.find(function(x){return x.name===name;});return m?m.display:name;}
function stormRosterRows(match,members){
 var rows=array('stormRoster').filter(function(r){return r.match_id===match.id;});
 rows.sort(function(a,b){return (a.slot==='starter'?0:1)-(b.slot==='starter'?0:1)||userName(a.member_name,members).localeCompare(userName(b.member_name,members),'de');});
 if(!rows.length)return block('Noch keine Aufstellung für diese Begegnung eingetragen. Eine fehlende Zuordnung zählt nicht als Nichtteilnahme.');
 return '<div class="table-scroll"><table class="ops-roster"><thead><tr><th>Spieler</th><th>Platz</th><th>Teilnahme</th><th>Einzelpunkte</th></tr></thead><tbody>'+
 rows.map(function(r){var label=r.attendance==='present'?'good':r.attendance==='absent'&&r.slot==='starter'?'warn':'quiet';
 return '<tr><td><strong>'+esc(userName(r.member_name,members))+'</strong></td><td>'+esc(r.slot==='starter'?'Stamm':'Ersatz')+'</td>'+
 '<td>'+pill(label,attendanceName(r.attendance))+'</td><td class="num">'+(r.individual_points===null||r.individual_points===undefined?'Nicht erfasst':num(r.individual_points))+'</td></tr>';}).join('')+'</tbody></table></div>';
}
function teamSection(team,week,members){
 var sessions=matchesIn(week).filter(function(m){return m.team===team;});
 var allRosters=array('stormRoster').filter(function(r){return sessions.some(function(m){return m.id===r.match_id;});});
 var starters=allRosters.filter(function(r){return r.slot==='starter';}).length,
    substitutes=allRosters.filter(function(r){return r.slot==='substitute';}).length,
    present=allRosters.filter(function(r){return r.attendance==='present';}).length,
    absent=allRosters.filter(function(r){return r.slot==='starter'&&r.attendance==='absent';}).length;
 return '<section class="panel ops-team-panel"><div class="ops-team-head"><div><span class="ops-kicker">WÜSTENSTURM · EIGENSTÄNDIGE EINHEIT</span><h2>Team '+team+'</h2></div>'+
 pill(sessions.length?'good':'quiet',sessions.length?sessions.length+' Begegnung'+(sessions.length===1?'':'en'):'Nicht eingetragen')+'</div>'+
 '<div class="ops-team-stats"><div><strong>'+starters+'</strong><span>Stamm / 20</span></div><div><strong>'+substitutes+'</strong><span>Ersatz / 10</span></div>'+
 '<div><strong>'+present+'</strong><span>Teilgenommen</span></div><div><strong>'+absent+'</strong><span>Bestätigt gefehlt</span></div></div>'+
 (sessions.length?sessions.map(function(m){
 var start=m.starts_at?new Date(m.starts_at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):fmt(m.event_date)+' · Uhrzeit offen';
 var own=m.own_points!==null&&m.own_points!==undefined?num(m.own_points):'–',
     enemy=m.enemy_points!==null&&m.enemy_points!==undefined?num(m.enemy_points):'–';
 return '<div class="ops-match"><div class="ops-match-top"><div><strong>'+esc(m.opponent||'Gegner noch unbekannt')+'</strong><small>'+esc(start)+'</small></div>'+
 pill(m.result==='win'?'good':m.result==='loss'?'warn':'quiet',resultName(m.result))+'</div>'+
 '<div class="ops-match-result"><span>Allianzpunkte: '+own+'</span><span>Gegnerpunkte: '+enemy+'</span></div>'+
 (m.notes?'<p class="muted">'+esc(m.notes)+'</p>':'')+stormRosterRows(m,members)+'</div>';
 }).join(''):block('Noch kein Wüstensturm-Einsatz für Team '+team+' hinterlegt. Trage die Begegnung und die tatsächliche Aufstellung über die geschützte Administration ein.'))+
 '</section>';
}
function stormPage(members){
 var week=STORM_WEEK||thisWeek(),matches=matchesIn(week);
 var a=matches.filter(function(m){return m.team==='A';}),b=matches.filter(function(m){return m.team==='B';});
 return '<header class="page-header"><div><div class="eyebrow">OPERATIONS / WÜSTENSTURM</div><h1 class="page-title">Wüstensturm · Team A &amp; B</h1>'+
 '<p class="muted">Zwei eigenständige Teams, eigene Gegner, Einsatzzeiten, Aufstellungen und Ergebnisse</p></div><div class="page-actions">'+
 weekPicker('stormWeekPicker',week,'storm')+'</div></header>'+
 '<div class="ops-overview-strip"><span>Team A: '+esc(a.length?'erfasst':'noch ohne Einsatz')+'</span><span>Team B: '+esc(b.length?'erfasst':'noch ohne Einsatz')+'</span>'+
 '<span>20 Stammspieler + 10 Ersatzspieler je Team</span></div>'+
 '<div class="ops-team-grid">'+teamSection('A',week,members)+teamSection('B',week,members)+'</div>'+
 block('Ein Ersatzspieler wird nur als Teilnehmer gewertet, wenn sein tatsächlicher Einsatz bestätigt ist. Nicht eingewechselt und keine Zuordnung gelten ausdrücklich nicht als fehlende Aktivität. '+ 
 'Kampfzeiten, Punktzahlen und Aufstellungen werden nicht aus Last War automatisch ausgelesen.')+
 '<div class="ops-footer-actions"><a href="https://github.com/matdan1987/skws-command-center-standalone/blob/main/ADMIN-TRACKING.md" target="_blank" rel="noopener noreferrer">Anleitung zur Wüstensturm-Verwaltung</a></div>';
}
function isProvisional(r){return /zwischenstand|vorläufig|kein endergebnis/i.test(String(r.notes||''));}
function cfg(){return array('activityRules')[0]||null;}
function vsStrategy(week){return array('vsStrategies').find(function(s){return s.week_start===week;})||null;}
function classifyPlayer(m,week,rules){
 var start=week,end=ds(week,6),vsend=ds(week,5),strategy=vsStrategy(week),
 vsGoal=Number(strategy&&strategy.daily_target_points||7200000),
 donationMin=Number(rules.min_daily_donations),
 stormMin=Number(rules.min_storm_individual_points),
 vs=array('metrics').filter(function(r){return r.member_name===m.name&&r.metric==='vs_points'&&r.recorded_on>=start&&r.recorded_on<=vsend;}),
 donations=array('metrics').filter(function(r){return r.member_name===m.name&&r.metric==='donations'&&r.recorded_on>=start&&r.recorded_on<=end;}),
 ownMatches=matchesIn(week),
 stormEntries=array('stormRoster').filter(function(r){return r.member_name===m.name&&ownMatches.some(function(match){return match.id===r.match_id;});}),
 validStorm=stormEntries.filter(function(r){
  var match=ownMatches.find(function(x){return x.id===r.match_id;});
  return match&&['win','loss','draw'].includes(match.result)&&(r.attendance==='present'||(r.slot==='starter'&&r.attendance==='absent'));
 }),
 finalVS=vs.filter(function(r){return !isProvisional(r);}),
 finalDonations=donations.filter(function(r){return !isProvisional(r);}),
 surplus=strategy&&strategy.mode==='eco'?vs.reduce(function(n,r){return n+Math.max(0,Number(r.metric_value)-vsGoal);},0):0,
 overDays=strategy&&strategy.mode==='eco'?vs.filter(function(r){return Number(r.metric_value)>vsGoal;}).length:0,
 lowDonations=donations.filter(function(r){return Number(r.metric_value)<donationMin;}).length,
 zeroVS=vs.filter(function(r){return Number(r.metric_value)===0;}).length,
 zeroDon=donations.filter(function(r){return Number(r.metric_value)===0;}).length;
 function avg(list,fun){return list.length?list.reduce(function(s,x){return s+fun(x);},0)/list.length:null;}
 function calcVS(r){
  var val=Number(r.metric_value||0),base=Math.min(100,100*val/vsGoal);
  return Math.max(0,base-(strategy&&strategy.mode==='eco'&&val>vsGoal?Math.min(35,100*(val-vsGoal)/vsGoal):0));
 }
 function calcDonation(r){return donationMin>0?Math.min(100,100*Number(r.metric_value||0)/donationMin):100;}
 function calcStorm(r){
  if(r.attendance==='absent')return 0;
  if(r.attendance!=='present')return null;
  if(r.individual_points===null||r.individual_points===undefined)return 80;
  return stormMin?80+20*Math.min(1,Number(r.individual_points)/stormMin):100;
 }
 var confirmed=[
  {kind:'VS',weight:Number(rules.weight_vs),value:avg(finalVS,calcVS),days:finalVS.length},
  {kind:'Spenden',weight:Number(rules.weight_donations),value:avg(finalDonations,calcDonation),days:finalDonations.length},
  {kind:'Wüstensturm',weight:Number(rules.weight_storm),value:avg(validStorm,calcStorm),days:validStorm.length}
 ];
 var available=confirmed.filter(function(x){return x.value!==null&&x.weight>0;}),
 includedWeight=available.reduce(function(s,x){return s+x.weight;},0),
 score=includedWeight?Math.round(available.reduce(function(s,x){return s+x.value*x.weight;},0)/includedWeight):null;
 // Vergleichbar erst nach ausreichenden abgeschlossenen Tagen in mindestens einem Regelbereich.
 var established=available.length>=2&&(finalVS.length>=Number(rules.min_final_vs_days)||finalDonations.length>=Number(rules.min_final_donation_days));
 var provisionalVS=vs.length?avg(vs,calcVS):null,provisionalDonation=donations.length?avg(donations,calcDonation):null,
 previews=[{w:Number(rules.weight_vs),v:provisionalVS},{w:Number(rules.weight_donations),v:provisionalDonation}].filter(function(x){return x.v!==null&&x.w>0;}),
 previewWeight=previews.reduce(function(s,x){return s+x.w;},0),
 trend=previews.length>=2&&previewWeight?Math.round(previews.reduce(function(s,x){return s+x.w*x.v;},0)/previewWeight):null;
 var issues=[];
 if(surplus>0)issues.push('Eco-Überschuss +'+num(surplus));
 if(lowDonations)issues.push(lowDonations+' Spendentag'+(lowDonations===1?'':'e')+' unter '+num(donationMin));
 if(zeroVS)issues.push(zeroVS+' VS-Nullwert'+(zeroVS===1?'':'e'));
 if(zeroDon)issues.push(zeroDon+' Spenden-Nullwert'+(zeroDon===1?'':'e'));
 var confirmedMiss=validStorm.filter(function(x){return x.slot==='starter'&&x.attendance==='absent';}).length;
 if(confirmedMiss)issues.push(confirmedMiss+' bestätigte Wüstensturm-Fehlteilnahme'+(confirmedMiss===1?'':'n'));
 var positive=trend!==null&&trend>=85&&!surplus&&!lowDonations&&!zeroVS&&!zeroDon;
 var status=established?(score>=Number(rules.highlight_score)?'Highlight':score<=Number(rules.lowlight_score)?'Lowlight':'Im Rahmen'):
    (vs.length||donations.length||stormEntries.length?'Noch vorläufig':'Keine Meldung');
 var teamNames=stormEntries.map(function(r){var match=ownMatches.find(function(x){return x.id===r.match_id;});return match?match.team:null;}).filter(Boolean);
 return {member:m,vs:vs,don:donations,finalVS:finalVS,finalDon:finalDonations,storm:stormEntries,
    attendance:validStorm.filter(function(x){return x.attendance==='present';}).length,assigned:stormEntries.length,
    teams:Array.from(new Set(teamNames)).join('/'),score:score,trend:trend,status:status,established:established,
    issues:issues,positive:positive,surplus:surplus,overDays:overDays,lowDonations:lowDonations,
    observed:vs.length+donations.length+stormEntries.length};
}
function impactWeekOptions(week){return weekPicker('impactWeekPicker',week,'impact');}
function impactHighlights(rows,provisional){
 var list=provisional?rows.filter(function(x){return x.positive&&!x.established;}).sort(function(a,b){return b.trend-a.trend;}).slice(0,6):
 rows.filter(function(x){return x.established&&x.status==='Highlight';}).sort(function(a,b){return b.score-a.score;}).slice(0,6);
 if(!list.length)return block(provisional?'Noch keine ausreichend vergleichbaren positiven Zwischenstände.':'Noch keine belastbar bestätigten Highlights. Dafür sind mehrere abgeschlossene Wertungstage nötig.');
 return '<div class="ops-focus-list">'+list.map(function(x){
 return '<div class="ops-focus-item"><div><strong>'+esc(x.member.display)+'</strong><small>'+
 (x.vs.length?x.vs.length+' VS-Tageswert'+(x.vs.length===1?'':'e'):'Keine VS-Meldung')+' · '+x.don.length+' Spendentag'+(x.don.length===1?'':'e')+
 '</small></div>'+pill(provisional?'review':'good',provisional?'Trend '+x.trend+'/100':'Index '+x.score+'/100')+'</div>';
 }).join('')+'</div>';
}
function impactLowlights(rows){
 var list=rows.filter(function(x){return x.established&&x.status==='Lowlight';}).sort(function(a,b){return a.score-b.score;}).slice(0,6);
 if(!list.length)return block('Noch keine belastbar bestätigten Lowlights. Vorläufige oder fehlende Werte führen hier ausdrücklich nicht zu einer Negativwertung.');
 return '<div class="ops-focus-list">'+list.map(function(x){
 return '<div class="ops-focus-item"><div><strong>'+esc(x.member.display)+'</strong><small>'+esc(x.issues.length?x.issues.join(' · '):'Unter dem Gesamt-Mindestindex')+'</small></div>'+
 pill('warn','Index '+x.score+'/100')+'</div>';}).join('')+'</div>';
}
function impactObservations(rows){
 var list=rows.filter(function(x){return x.issues.length>0&&!x.established;}).sort(function(a,b){
  return (b.surplus-a.surplus)||(b.lowDonations-a.lowDonations)||a.member.display.localeCompare(b.member.display,'de');
 }).slice(0,9);
 if(!list.length)return block('Aktuell keine offenen Auffälligkeiten in den erfassten Zwischenständen.');
 return '<div class="ops-focus-list">'+list.map(function(x){return '<div class="ops-focus-item"><div><strong>'+esc(x.member.display)+'</strong><small>'+esc(x.issues.join(' · '))+'</small></div>'+pill('review','Prüfen')+'</div>';}).join('')+'</div>';
}
function impactTable(rows,week){
 var filtered=rows.filter(function(r){
 if(IMPACT_FILTER==='highlights'&&!(r.established&&r.status==='Highlight'||r.positive))return false;
 if(IMPACT_FILTER==='lowlights'&&!(r.established&&r.status==='Lowlight'))return false;
 if(IMPACT_FILTER==='observe'&&!(r.issues.length>0))return false;
 if(IMPACT_FILTER==='missing'&&r.observed>0)return false;
 return true;
 }).sort(function(a,b){
 if(a.established!==b.established)return a.established?-1:1;
 var as=a.established?a.score:a.trend,bs=b.established?b.score:b.trend;
 if(as===null&&bs!==null)return 1;if(bs===null&&as!==null)return -1;
 return (bs||0)-(as||0)||a.member.display.localeCompare(b.member.display,'de');
 });
 return '<div class="table-scroll"><table class="ops-impact-table"><thead><tr><th>Spieler</th><th>VS-Tage</th><th>Spendentage</th><th>Wüstensturm</th><th>Index / Trend</th><th>Einordnung</th></tr></thead><tbody>'+
 filtered.map(function(r){
 var label=r.established?'Index '+r.score:r.trend!==null?'Trend '+r.trend:'–';
 var flag=r.established?r.status==='Highlight'?'good':r.status==='Lowlight'?'warn':'quiet':
 r.issues.length?'review':'quiet';
 return '<tr data-impact-name="'+esc(r.member.display.toLowerCase())+'"><td><strong>'+esc(r.member.display)+'</strong>'+(r.issues.length?'<small class="ops-row-detail">'+esc(r.issues.join(' · '))+'</small>':'')+'</td>'+
 '<td class="num">'+r.vs.length+(r.finalVS.length!==r.vs.length?' <small>vorl.</small>':'')+'</td>'+
 '<td class="num">'+r.don.length+(r.finalDon.length!==r.don.length?' <small>vorl.</small>':'')+'</td>'+
 '<td>'+esc(r.assigned?r.teams+' · '+r.attendance+'/'+r.assigned+' teilg.':'Nicht eingeteilt')+'</td>'+
 '<td><strong>'+label+'</strong></td><td>'+pill(flag,r.issues.length&&!r.established?'Prüfbedarf':r.status)+'</td></tr>';
 }).join('')+'</tbody></table></div>'+
 (!filtered.length?block('Für diesen Filter sind derzeit keine Einträge vorhanden.'):'');
}
function impactPage(members){
 var rules=cfg();
 var week=IMPACT_WEEK||thisWeek();
 if(!rules)return '<header class="page-header"><div><h1 class="page-title">Gesamtstatistik</h1></div></header>'+block('Die administrativen Mindestanforderungen konnten nicht geladen werden. Keine Bewertung möglich.');
 var rows=members.map(function(m){return classifyPlayer(m,week,rules);}),
 report=rows.filter(function(r){return r.observed>0;}).length,
 good=rows.filter(function(r){return r.established&&r.status==='Highlight';}).length,
 low=rows.filter(function(r){return r.established&&r.status==='Lowlight';}).length,
 pending=rows.filter(function(r){return r.issues.length>0&&!r.established;}).length,
 noRecords=rows.filter(function(r){return !r.observed;}).length;
 var strat=vsStrategy(week);
 return '<header class="page-header"><div><div class="eyebrow">ANALYSE / MITGLIEDER-AKTIVITÄT</div><h1 class="page-title">Gesamtstatistik</h1>'+
 '<p class="muted">Highlights, Lowlights und begründeter Prüfbedarf statt bloßer Punkteranglisten</p></div><div class="page-actions">'+
 impactWeekOptions(week)+'</div></header>'+
 '<div class="ops-overview-strip"><span>VS-Strategie: '+esc(strat?({eco:'Eco',eco_plus:'Eco Plus',all_in:'All In'}[strat.mode]||strat.mode):'Nicht festgelegt')+'</span>'+
 '<span>Spenden-Minimum: '+num(rules.min_daily_donations)+' pro erfasstem Tag</span><span>Wüstensturm A/B separat</span></div>'+
 '<div class="ops-kpi-grid">'+
 '<div><small>Mit Daten</small><strong>'+report+' / '+rows.length+'</strong></div>'+
 '<div><small>Bestätigte Highlights</small><strong>'+good+'</strong></div>'+
 '<div><small>Bestätigte Lowlights</small><strong>'+low+'</strong></div>'+
 '<div><small>Vorläufiger Prüfbedarf</small><strong>'+pending+'</strong></div>'+
 '<div><small>Ohne Meldung</small><strong>'+noRecords+'</strong></div></div>'+
 block('<strong>Bewertungsregeln:</strong> VS '+rules.weight_vs+' %, Spenden '+rules.weight_donations+' %, Wüstensturm '+rules.weight_storm+
 ' %. Nur tatsächlich erfasste, abgeschlossene Kategorien fließen gewichtet ein. Für eine belastbare Einordnung sind mindestens zwei Bereiche und mindestens '+
 rules.min_final_vs_days+' abgeschlossene VS-Tage oder '+rules.min_final_donation_days+' abgeschlossene Spendentage erforderlich. '+
 'Fehlende Daten werden nie stillschweigend als Null gewertet. Der Wüstensturm zählt nur bei bestätigter Teilnahme oder bestätigtem Fehlen eines Stammspielers in einem abgeschlossenen Gefecht.')+
 '<div class="ops-analysis-grid"><section class="panel">'+panelHeading('Highlights','Vorläufig positive Tendenzen; endgültige Highlights erst bei belastbarer Datenlage')+
 impactHighlights(rows,true)+impactHighlights(rows,false)+'</section>'+
 '<section class="panel">'+panelHeading('Lowlights','Nur tatsächlich bestätigte schwache Gesamtleistung')+
 impactLowlights(rows)+'</section></div>'+
 '<section class="panel ops-observation-panel">'+panelHeading('Beobachtungsliste','Eco-Überschüsse, Spendentage unter dem Vorschlagsminimum und tatsächlich gemeldete Nullwerte, noch keine Schuldzuweisung')+
 impactObservations(rows)+'</section>'+
 '<section class="panel table-panel ops-activity-table"><div class="table-panel-header"><div><h2>Alle Allianzmitglieder</h2><small>Index nur bei ausreichender Datenlage, sonst unverbindlicher Trend</small></div>'+
 '<div class="ops-table-actions"><label>FILTER <select id="impactFilter">'+
 [['all','Alle'],['highlights','Highlights / positive Tendenzen'],['lowlights','Bestätigte Lowlights'],['observe','Prüfbedarf'],['missing','Ohne Meldung']].map(function(x){
 return '<option value="'+x[0]+'"'+(x[0]===IMPACT_FILTER?' selected':'')+'>'+x[1]+'</option>';}).join('')+
 '</select></label><input type="search" id="impactSearch" value="'+esc(IMPACT_QUERY)+'" placeholder="Spieler suchen" aria-label="Spieler suchen"></div></div>'+
 impactTable(rows,week)+'</section>'+
 block('Die Startwerte von 5.000 Spendenpunkten, mindestens drei abschließenden Wertungstagen und die Gewichtung sind anpassbare Allianz-Vorschläge, keine Spielregeln. '+
 'Fehlende Wüstensturm-Teilnahme zählt nur dann als negativ, wenn ein bestätigtes Fernbleiben eines Stammspielers dokumentiert wurde. '+
 'Ein Ersatzspieler ohne Einsatz bleibt neutral. VS-Eco-Überschüsse sind Strategieabweichungen, kein nachgewiesener Ressourcenverbrauch.');
}
MOD.render=function(type,members){
 if(type==='storms')return stormPage(members||[]);
 if(type==='impact')return impactPage(members||[]);
 return previousRender.call(MOD,type,members);
};
MOD.handleExtraChange=function(target){
 if(target.id==='stormWeekPicker'){STORM_WEEK=target.value;HOST.rerender();return true;}
 if(target.id==='impactWeekPicker'){IMPACT_WEEK=target.value;HOST.rerender();return true;}
 if(target.id==='impactFilter'){IMPACT_FILTER=target.value;HOST.rerender();return true;}
 return false;
};
MOD.handleExtraInput=function(target){
 if(target.id!=='impactSearch')return false;
 IMPACT_QUERY=target.value.toLowerCase();
 document.querySelectorAll('[data-impact-name]').forEach(function(row){
  row.hidden=row.dataset.impactName.indexOf(IMPACT_QUERY)===-1;
 });
 return true;
};
})();
