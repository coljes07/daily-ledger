/* eslint-disable */
import { useState, useEffect, useRef } from "react";

var TAG_COLORS = [
  { id: "coral",    bg: "#FF6B6B", light: "#FFF0F0", text: "#C0392B" },
  { id: "sky",      bg: "#4ECDC4", light: "#F0FFFE", text: "#1A7A74" },
  { id: "sun",      bg: "#FFD93D", light: "#FFFBEB", text: "#B8860B" },
  { id: "sage",     bg: "#6BCB77", light: "#F0FFF2", text: "#2D7A36" },
  { id: "lavender", bg: "#C77DFF", light: "#F8F0FF", text: "#6A0DAD" },
  { id: "peach",    bg: "#FF9A3C", light: "#FFF4EC", text: "#C05A00" },
  { id: "rose",     bg: "#FF6BA8", light: "#FFF0F6", text: "#A0175A" },
  { id: "ocean",    bg: "#4D96FF", light: "#EEF5FF", text: "#1A4FAD" },
];

function load(key, fb) {
  try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; }
  catch(e) { return fb; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

function toDS(d) { return d.toISOString().split("T")[0]; }
function todayS() { return toDS(new Date()); }
function weekStart(ds) {
  var d = new Date(ds + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  return toDS(d);
}
function addD(ds, n) {
  var d = new Date(ds + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDS(d);
}
function last7() {
  return Array.from({ length: 7 }, function(_, i) { return addD(todayS(), i - 6); });
}
function shortD(ds) {
  return new Date(ds + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
}
function fmtD(ds) {
  return new Date(ds + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function weeksBack(n) {
  var w = [], ws = weekStart(todayS());
  for (var i = 0; i < n; i++) { w.unshift(ws); ws = addD(ws, -7); }
  return w;
}
function wkLabel(ws) {
  var e = addD(ws, 6);
  var s = new Date(ws + "T00:00:00"), en = new Date(e + "T00:00:00");
  return s.getMonth() === en.getMonth()
    ? s.toLocaleDateString("en-US", { month: "short" }) + " " + s.getDate() + "\u2013" + en.getDate()
    : s.toLocaleDateString("en-US", { month: "short" }) + " " + s.getDate() + " \u2013 " + en.toLocaleDateString("en-US", { month: "short" }) + " " + en.getDate();
}
function uid() { return Math.random().toString(36).slice(2, 9); }
function fmtH(h) {
  if (!h || h <= 0) return "0h";
  var hrs = Math.floor(h), mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return mins + "m";
  return mins > 0 ? hrs + "h " + mins + "m" : hrs + "h";
}

var DEFAULT_TAGS = [
  { id: "t1", name: "Deep Work",         weeklyGoal: 20,  colorId: "ocean"    },
  { id: "t2", name: "Exercise",          weeklyGoal: 5,   colorId: "sage"     },
  { id: "t3", name: "Family Time",       weeklyGoal: 10,  colorId: "coral"    },
  { id: "t4", name: "Creative Projects", weeklyGoal: 7,   colorId: "lavender" },
  { id: "t5", name: "Reading",           weeklyGoal: 3.5, colorId: "sun"      },
];

var TREND_WEEKS = 12;

export default function App() {
  var tags_s = useState(function() { return load("dl_tags_v4", DEFAULT_TAGS); });
  var tags = tags_s[0]; var setTags = tags_s[1];

  var logs_s = useState(function() { return load("dl_logs_v4", {}); });
  var logs = logs_s[0]; var setLogs = logs_s[1];

  var view_s = useState("log");
  var view = view_s[0]; var setView = view_s[1];

  var date_s = useState(todayS());
  var selDate = date_s[0]; var setSelDate = date_s[1];

  var form_s = useState({ tagId: "", hrs: "", mins: "" });
  var form = form_s[0]; var setForm = form_s[1];

  var trends_s = useState(null);
  var trendsTag = trends_s[0]; var setTrendsTag = trends_s[1];

  var modal_s = useState(null);
  var modal = modal_s[0]; var setModal = modal_s[1];

  var editing_s = useState(null);
  var editingTag = editing_s[0]; var setEditingTag = editing_s[1];

  var tf_s = useState({ name: "", weeklyGoal: "", colorId: "ocean" });
  var tagForm = tf_s[0]; var setTagForm = tf_s[1];

  var dragIdx_s = useState(null);
  var dragIdx = dragIdx_s[0]; var setDragIdx = dragIdx_s[1];

  var dragOver_s = useState(null);
  var dragOver = dragOver_s[0]; var setDragOver = dragOver_s[1];

  var dragNode = useRef(null);

  useEffect(function() { save("dl_tags_v4", tags); }, [tags]);
  useEffect(function() { save("dl_logs_v4", logs); }, [logs]);
  useEffect(function() {
    if (tags.length > 0 && !trendsTag) setTrendsTag(tags[0].id);
  }, [tags, trendsTag]);

  function getColor(colorId) {
    return TAG_COLORS.find(function(c) { return c.id === colorId; }) || TAG_COLORS[0];
  }
  function dayTotals(ds) {
    var t = {};
    (logs[ds] || []).forEach(function(e) { t[e.tagId] = (t[e.tagId] || 0) + e.hours; });
    return t;
  }
  function weekTotals(ws) {
    var t = {};
    for (var i = 0; i < 7; i++) {
      var dt = dayTotals(addD(ws, i));
      Object.entries(dt).forEach(function(kv) { t[kv[0]] = (t[kv[0]] || 0) + kv[1]; });
    }
    return t;
  }
  function getStreak(tagId, weeklyGoal) {
    var streak = 0;
    var ws = addD(weekStart(todayS()), -7);
    for (var i = 0; i < TREND_WEEKS; i++) {
      var wt = weekTotals(ws);
      if ((wt[tagId] || 0) >= weeklyGoal) { streak++; ws = addD(ws, -7); }
      else { break; }
    }
    return streak;
  }

  var days7 = last7();
  var thisWS = weekStart(selDate);
  var wkTots = weekTotals(thisWS);
  var dayEntries = logs[selDate] || [];
  var trendWeeks = weeksBack(TREND_WEEKS);
  var dailyTotal = Object.values(dayTotals(selDate)).reduce(function(a,b){return a+b;},0);

  function logIt() {
    if (!form.tagId) return;
    var total = (parseFloat(form.hrs)||0) + (parseFloat(form.mins)||0)/60;
    if (total <= 0) return;
    setLogs(function(p) {
      var n = Object.assign({}, p);
      n[selDate] = (p[selDate]||[]).concat([{id:uid(),tagId:form.tagId,hours:total}]);
      return n;
    });
    setForm({ tagId:"", hrs:"", mins:"" });
  }
  function removeLog(id) {
    setLogs(function(p) {
      var n = Object.assign({}, p);
      n[selDate] = (p[selDate]||[]).filter(function(e){return e.id!==id;});
      return n;
    });
  }
  function openAddTag() { setTagForm({name:"",weeklyGoal:"",colorId:"ocean"}); setModal("addTag"); }
  function openEditTag(tag) { setEditingTag(tag); setTagForm({name:tag.name,weeklyGoal:tag.weeklyGoal,colorId:tag.colorId}); setModal("editTag"); }
  function saveTag() {
    if (!tagForm.name.trim()) return;
    if (modal === "addTag") {
      setTags(function(p) { return p.concat([{id:uid(),name:tagForm.name.trim(),weeklyGoal:parseFloat(tagForm.weeklyGoal)||5,colorId:tagForm.colorId}]); });
    } else {
      setTags(function(p) { return p.map(function(t) { return t.id===editingTag.id ? Object.assign({},t,{name:tagForm.name.trim(),weeklyGoal:parseFloat(tagForm.weeklyGoal)||5,colorId:tagForm.colorId}) : t; }); });
    }
    setModal(null);
  }
  function deleteTag(id) {
    setTags(function(p) { return p.filter(function(t){return t.id!==id;}); });
    if (trendsTag === id) setTrendsTag(null);
    setModal(null);
  }

  function onDragStart(e, idx) {
    setDragIdx(idx);
    dragNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(function() { if (dragNode.current) dragNode.current.style.opacity = "0.4"; }, 0);
  }
  function onDragEnter(idx) { setDragOver(idx); }
  function onDragEnd() {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    if (dragIdx !== null && dragOver !== null && dragIdx !== dragOver) {
      setTags(function(prev) {
        var arr = prev.slice();
        var moved = arr.splice(dragIdx, 1)[0];
        arr.splice(dragOver, 0, moved);
        return arr;
      });
    }
    setDragIdx(null); setDragOver(null); dragNode.current = null;
  }

  var card = { background:"#fff", borderRadius:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", padding:"16px" };
  var inp  = { width:"100%", padding:"12px 14px", borderRadius:10, border:"1.5px solid #e8e8e8", fontSize:16, fontFamily:"inherit", outline:"none", background:"#fafafa", boxSizing:"border-box", color:"#1a1a1a", WebkitAppearance:"none" };

  return (
    <div style={{ minHeight:"100vh", background:"#F5F4F0", fontFamily:"'DM Sans', sans-serif", paddingBottom:90 }}>
      <style>{"\n        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}\n        @keyframes fadeIn{from{opacity:0}to{opacity:1}}\n        @keyframes popIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}\n        .slide-up{animation:slideUp 0.35s ease both}\n        .fade-in{animation:fadeIn 0.2s ease both}\n        button:focus{outline:none}\n        ::-webkit-scrollbar{display:none}\n        input:focus{border-color:#4D96FF!important;background:#fff!important}\n        select:focus{border-color:#4D96FF!important}\n        .log-entry{transition:transform 0.15s}\n        .log-entry:hover{transform:translateX(2px)}\n        .overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:flex-end;justify-content:center}\n        .modal{background:#fff;border-radius:24px 24px 0 0;padding:28px 24px 44px;width:100%;max-width:500px;animation:slideUp 0.3s ease;max-height:90vh;overflow-y:auto}\n        .drag-row{transition:background 0.15s;cursor:grab}\n        .drag-row:active{cursor:grabbing}\n        .streak-badge{animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both}\n        select option{background:#fff;color:#1a1a1a}\n      "}</style>

      {/* Header */}
      <div style={{ background:"#fff", padding:"24px 20px 16px", boxShadow:"0 1px 0 #ececec" }}>
        <div style={{ fontSize:11, letterSpacing:4, textTransform:"uppercase", color:"#aaa", marginBottom:4, fontWeight:600 }}>Daily Ledger</div>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <div style={{ fontSize:26, color:"#1a1a1a", fontFamily:"'DM Serif Display', serif" }}>Where did your time go?</div>
          {dailyTotal > 0 && view === "log" && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase", color:"#aaa", fontWeight:600 }}>Today</div>
              <div style={{ fontSize:20, fontWeight:700, color:"#1a1a1a", fontFamily:"'DM Serif Display', serif", letterSpacing:-0.5 }}>{fmtH(dailyTotal)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"1.5px solid #ececec", position:"sticky", top:0, zIndex:20 }}>
        {[["log","Today"],["week","This Week"],["trends","Trends"]].map(function(item) {
          var v=item[0], label=item[1];
          return (
            <button key={v} onClick={function(){setView(v);}} style={{ flex:1, padding:"13px 0", border:"none", background:"transparent", color:view===v?"#1a1a1a":"#aaa", fontSize:12, fontFamily:"inherit", fontWeight:view===v?600:400, letterSpacing:1.5, textTransform:"uppercase", borderBottom:"2.5px solid "+(view===v?"#1a1a1a":"transparent"), cursor:"pointer", transition:"all 0.2s" }}>{label}</button>
          );
        })}
      </div>

      <div className="slide-up" style={{ padding:"20px 16px", maxWidth:600, margin:"0 auto" }}>

        {/* ══ LOG VIEW ══ */}
        {view === "log" && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
              {days7.map(function(d) {
                var logged=Object.values(dayTotals(d)).reduce(function(a,b){return a+b;},0);
                var isSel=d===selDate, isToday=d===todayS();
                return (
                  <button key={d} onClick={function(){setSelDate(d);}} style={{ flex:"0 0 auto", minWidth:54, padding:"10px 8px", borderRadius:12, border:"2px solid "+(isSel?"#1a1a1a":"transparent"), background:isSel?"#1a1a1a":logged>0?"#f0f0f0":"#fff", color:isSel?"#fff":logged>0?"#1a1a1a":"#bbb", cursor:"pointer", textAlign:"center", boxShadow:isSel?"0 4px 12px rgba(0,0,0,0.15)":"none", fontFamily:"inherit", transition:"all 0.15s" }}>
                    <div style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase", fontWeight:600 }}>{shortD(d)}</div>
                    <div style={{ fontSize:12, marginTop:3, fontWeight:isToday?600:400 }}>{logged>0?fmtH(logged):"\u00b7"}</div>
                  </button>
                );
              })}
            </div>

            <div style={Object.assign({},card,{marginBottom:16})}>
              <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"#aaa", fontWeight:600, marginBottom:12 }}>
                {selDate===todayS()?"Log Today":fmtD(selDate)}
              </div>
              <select value={form.tagId} onChange={function(e){setForm(Object.assign({},form,{tagId:e.target.value}));}} style={Object.assign({},inp,{marginBottom:10,color:form.tagId?"#1a1a1a":"#aaa"})}>
                <option value="">Choose a tag\u2026</option>
                {tags.map(function(t){return <option key={t.id} value={t.id}>{t.name}</option>;})}
              </select>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                {[["hrs","Hours","0\u201316"],["mins","Minutes","0\u201359"]].map(function(item){
                  var f=item[0],label=item[1],ph=item[2];
                  return (
                    <div key={f}>
                      <div style={{ fontSize:10, letterSpacing:2, color:"#aaa", textTransform:"uppercase", fontWeight:600, marginBottom:5 }}>{label}</div>
                      <input type="number" min="0" placeholder={ph} value={form[f]} onChange={function(e){var u=Object.assign({},form);u[f]=e.target.value;setForm(u);}} onKeyDown={function(e){if(e.key==="Enter")logIt();}} style={inp} />
                    </div>
                  );
                })}
              </div>
              <button onClick={logIt} style={{ width:"100%", padding:"14px", background:"#1a1a1a", color:"#fff", border:"none", borderRadius:12, cursor:"pointer", fontSize:14, fontFamily:"inherit", fontWeight:600, letterSpacing:1, boxShadow:"0 4px 12px rgba(0,0,0,0.15)", transition:"transform 0.1s" }}
                onMouseDown={function(e){e.currentTarget.style.transform="scale(0.98)";}}
                onMouseUp={function(e){e.currentTarget.style.transform="scale(1)";}}>
                Log It
              </button>
            </div>

            {dayEntries.length > 0 && (
              <div style={{ marginBottom:20 }}>
                {dayEntries.map(function(entry){
                  var tag=tags.find(function(t){return t.id===entry.tagId;});
                  var col=tag?getColor(tag.colorId):TAG_COLORS[0];
                  return (
                    <div key={entry.id} className="log-entry" style={Object.assign({},card,{marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",border:"1.5px solid "+col.light})}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:col.bg, flexShrink:0 }} />
                        <div style={{ fontSize:14, fontWeight:500, color:"#1a1a1a" }}>{tag?tag.name:"Unknown"}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ background:col.light, color:col.text, padding:"4px 10px", borderRadius:20, fontSize:13, fontWeight:600 }}>{fmtH(entry.hours)}</div>
                        <button onClick={function(){removeLog(entry.id);}} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", fontSize:18, padding:0, lineHeight:1, transition:"color 0.15s" }}
                          onMouseOver={function(e){e.target.style.color="#FF6B6B";}} onMouseOut={function(e){e.target.style.color="#ccc";}}>
                          \u00d7
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"#aaa", fontWeight:600 }}>Weekly Goals</div>
                  <div style={{ fontSize:12, color:"#bbb", marginTop:2 }}>{wkLabel(thisWS)}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ fontSize:10, color:"#ccc", letterSpacing:1 }}>drag to reorder</div>
                  <button onClick={openAddTag} style={{ padding:"8px 14px", background:"#f5f5f5", border:"none", borderRadius:20, fontSize:12, fontFamily:"inherit", fontWeight:600, color:"#666", cursor:"pointer" }}>+ New Tag</button>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {tags.map(function(tag,idx){
                  var col=getColor(tag.colorId);
                  var wk=wkTots[tag.id]||0;
                  var pct=Math.min((wk/tag.weeklyGoal)*100,100);
                  var done=wk>=tag.weeklyGoal;
                  var streak=getStreak(tag.id,tag.weeklyGoal);
                  var isDragTarget=dragOver===idx&&dragIdx!==idx;
                  return (
                    <div key={tag.id} className="drag-row"
                      draggable
                      onDragStart={function(e){onDragStart(e,idx);}}
                      onDragEnter={function(){onDragEnter(idx);}}
                      onDragOver={function(e){e.preventDefault();}}
                      onDragEnd={onDragEnd}
                      style={{ padding:"12px 8px", borderRadius:10, background:isDragTarget?"#f0f5ff":"transparent", borderTop:isDragTarget?"2px solid #4D96FF":"2px solid transparent" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <div style={{ color:"#ccc", fontSize:14, marginRight:2 }}>\u283f</div>
                          <div style={{ background:col.light, color:col.text, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{tag.name}</div>
                          {streak > 0 && (
                            <div className="streak-badge" style={{ display:"flex", alignItems:"center", gap:3, background:"#FFF8EC", border:"1px solid #FFE4A0", borderRadius:20, padding:"2px 8px" }}>
                              <span style={{ fontSize:11 }}>&#x1F525;</span>
                              <span style={{ fontSize:11, fontWeight:600, color:"#B8860B" }}>{streak}w</span>
                            </div>
                          )}
                          <button onClick={function(){openEditTag(tag);}} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", fontSize:13, padding:0, fontFamily:"inherit", transition:"color 0.15s" }}
                            onMouseOver={function(e){e.target.style.color="#666";}} onMouseOut={function(e){e.target.style.color="#ccc";}}>
                            &#x270e;
                          </button>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:12, color:"#999" }}>{fmtH(wk)} / {fmtH(tag.weeklyGoal)}</span>
                          <span style={{ fontSize:12, fontWeight:600, color:done?"#6BCB77":pct>=70?"#FFD93D":"#ccc" }}>{Math.round(pct)}%</span>
                        </div>
                      </div>
                      <div style={{ height:8, background:"#f0f0f0", borderRadius:99, overflow:"hidden", marginLeft:22 }}>
                        <div style={{ height:"100%", width:pct+"%", background:done?"#6BCB77":col.bg, borderRadius:99, transition:"width 0.5s cubic-bezier(0.34,1.56,0.64,1)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ WEEK VIEW ══ */}
        {view === "week" && (
          <div>
            <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"#aaa", fontWeight:600, marginBottom:16 }}>{wkLabel(weekStart(todayS()))}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              {tags.map(function(tag){
                var col=getColor(tag.colorId);
                var wkT=weekTotals(weekStart(todayS()));
                var wk=wkT[tag.id]||0;
                var pct=Math.min((wk/tag.weeklyGoal)*100,100);
                var done=wk>=tag.weeklyGoal;
                var streak=getStreak(tag.id,tag.weeklyGoal);
                return (
                  <div key={tag.id} style={Object.assign({},card,{border:"2px solid "+(done?"#6BCB77":col.light),position:"relative",overflow:"hidden"})}>
                    <div style={{ position:"absolute", bottom:0, left:0, height:4, width:pct+"%", background:done?"#6BCB77":col.bg, transition:"width 0.6s" }} />
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <div style={{ background:col.light, color:col.text, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>{tag.name}</div>
                      {streak>0&&<div style={{ display:"flex", alignItems:"center", gap:2, fontSize:11 }}><span>&#x1F525;</span><span style={{ fontWeight:600, color:"#B8860B" }}>{streak}w</span></div>}
                    </div>
                    <div style={{ fontSize:26, fontWeight:700, color:done?"#3a9a45":"#1a1a1a", letterSpacing:-0.5 }}>{fmtH(wk)}</div>
                    <div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>of {fmtH(tag.weeklyGoal)} goal</div>
                  </div>
                );
              })}
            </div>
            {tags.map(function(tag){
              var col=getColor(tag.colorId);
              var weekDays=Array.from({length:7},function(_,i){return addD(weekStart(todayS()),i);});
              var dayVals=weekDays.map(function(d){return dayTotals(d)[tag.id]||0;});
              var maxVal=Math.max.apply(null,dayVals.concat([0.1]));
              var wkT=weekTotals(weekStart(todayS()));
              return (
                <div key={tag.id} style={Object.assign({},card,{marginBottom:12})}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <div style={{ background:col.light, color:col.text, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{tag.name}</div>
                    <span style={{ fontSize:12, color:"#999" }}>{fmtH(wkT[tag.id]||0)} this week</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, alignItems:"end", height:72 }}>
                    {weekDays.map(function(d,i){
                      var h=dayVals[i];
                      var barH=(h/maxVal)*72;
                      var isT=d===todayS();
                      return (
                        <div key={d} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, height:"100%", justifyContent:"flex-end" }}>
                          <div style={{ width:"100%", height:Math.max(barH,h>0?4:0)+"px", background:isT?col.bg:col.bg+"88", borderRadius:"6px 6px 0 0", transition:"height 0.5s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:isT?"0 2px 8px "+col.bg+"66":"none" }} />
                          <span style={{ fontSize:9, color:isT?"#1a1a1a":"#bbb", fontWeight:isT?600:400, letterSpacing:1 }}>{shortD(d).toUpperCase()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ TRENDS VIEW ══ */}
        {view === "trends" && (
          <div>
            <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"#aaa", fontWeight:600, marginBottom:14 }}>12-Week Trends</div>
            <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:20 }}>
              {tags.map(function(tag){
                var col=getColor(tag.colorId);
                var active=trendsTag===tag.id;
                return (
                  <button key={tag.id} onClick={function(){setTrendsTag(tag.id);}} style={{ flex:"0 0 auto", padding:"8px 16px", borderRadius:20, border:"2px solid "+(active?col.bg:col.light), background:active?col.bg:col.light, color:active?"#fff":col.text, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit", whiteSpace:"nowrap", transition:"all 0.15s" }}>{tag.name}</button>
                );
              })}
            </div>

            {trendsTag && (function(){
              var tag=tags.find(function(t){return t.id===trendsTag;});
              if (!tag) return null;
              var col=getColor(tag.colorId);
              var data=trendWeeks.map(function(ws){return {ws:ws,val:weekTotals(ws)[tag.id]||0};});
              var maxVal=Math.max.apply(null,data.map(function(d){return d.val;}).concat([tag.weeklyGoal,1]));
              var withData=data.filter(function(d){return d.val>0;});
              var avg=withData.length?withData.reduce(function(a,b){return a+b.val;},0)/withData.length:0;
              var goalHit=data.filter(function(d){return d.val>=tag.weeklyGoal;}).length;
              var recent4=data.slice(-4).reduce(function(a,b){return a+b.val;},0)/4;
              var earlier4=data.slice(0,4).reduce(function(a,b){return a+b.val;},0)/4;
              var improving=recent4>earlier4;
              var streak=getStreak(tag.id,tag.weeklyGoal);
              return (
                <div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                    {[["Avg / Week",fmtH(avg),col.bg],["Goal Weeks",goalHit+"/"+TREND_WEEKS,goalHit>TREND_WEEKS/2?"#6BCB77":"#FFD93D"],["Current Streak",streak>0?streak+"w \uD83D\uDD25":"--",streak>0?"#FF9A3C":"#ccc"],["Trend",improving?"\u2191 Rising":"\u2193 Declining",improving?"#6BCB77":"#FF6B6B"]].map(function(item){
                      var label=item[0],val=item[1],color=item[2];
                      return (
                        <div key={label} style={Object.assign({},card,{border:"1.5px solid "+col.light})}>
                          <div style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:"#aaa", fontWeight:600, marginBottom:6 }}>{label}</div>
                          <div style={{ fontSize:22, fontWeight:700, color:color, letterSpacing:-0.5 }}>{val}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={Object.assign({},card,{marginBottom:12})}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <div style={{ background:col.light, color:col.text, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{tag.name}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:16, height:2, background:"#ddd", borderRadius:1 }} />
                        <span style={{ fontSize:10, color:"#bbb", letterSpacing:1 }}>GOAL {fmtH(tag.weeklyGoal)}/wk</span>
                      </div>
                    </div>
                    <div style={{ position:"relative", height:160 }}>
                      <div style={{ position:"absolute", left:0, right:0, top:(100-(tag.weeklyGoal/maxVal)*100)+"%", borderTop:"2px dashed #e8e8e8", zIndex:1 }} />
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:4, alignItems:"end", height:"100%", position:"relative", zIndex:2 }}>
                        {data.map(function(item){
                          var ws=item.ws,val=item.val;
                          var pct=(val/maxVal)*100;
                          var isCur=ws===weekStart(todayS());
                          var hit=val>=tag.weeklyGoal;
                          return (
                            <div key={ws} style={{ display:"flex", flexDirection:"column", alignItems:"center", height:"100%", justifyContent:"flex-end", gap:3 }}>
                              {val>0&&<div style={{ fontSize:7, color:"#bbb", fontWeight:600 }}>{fmtH(val)}</div>}
                              <div style={{ width:"100%", height:Math.max(pct,val>0?3:0)+"%", background:hit?"#6BCB77":col.bg, borderRadius:"4px 4px 0 0", opacity:isCur?1:0.7, boxShadow:isCur?"0 4px 12px "+col.bg+"55":"none", transition:"height 0.5s cubic-bezier(0.34,1.56,0.64,1)", outline:isCur?"2px solid "+col.bg:"none", outlineOffset:1 }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:4, marginTop:8 }}>
                      {data.map(function(item,i){
                        return <div key={item.ws} style={{ textAlign:"center", fontSize:7, color:"#ccc", fontWeight:600 }}>{i%4===0?fmtD(item.ws):""}</div>;
                      })}
                    </div>
                  </div>

                  <div style={card}>
                    <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"#aaa", fontWeight:600, marginBottom:14 }}>Progress by Block</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                      {[0,1,2].map(function(block){
                        var slice=data.slice(block*4,block*4+4);
                        var avg2=slice.reduce(function(a,b){return a+b.val;},0)/4;
                        var labels=["Wks 1\u20134","Wks 5\u20138","Wks 9\u201312"];
                        var isLatest=block===2;
                        var blockPct=Math.min((avg2/tag.weeklyGoal)*100,100);
                        return (
                          <div key={block} style={{ textAlign:"center", padding:"14px 8px", background:isLatest?col.light:"#fafafa", borderRadius:12, border:"1.5px solid "+(isLatest?col.bg+"44":"#f0f0f0") }}>
                            <div style={{ fontSize:9, color:"#aaa", letterSpacing:2, textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>{labels[block]}</div>
                            <div style={{ fontSize:22, fontWeight:700, color:isLatest?col.text:"#1a1a1a", letterSpacing:-0.5 }}>{fmtH(avg2)}</div>
                            <div style={{ fontSize:10, color:"#bbb", marginBottom:8 }}>/week avg</div>
                            <div style={{ height:4, background:"#e8e8e8", borderRadius:99, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:blockPct+"%", background:isLatest?col.bg:"#ccc", borderRadius:99 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ══ TAG MODAL ══ */}
      {modal && (
        <div className="overlay fade-in" onClick={function(e){if(e.target===e.currentTarget)setModal(null);}}>
          <div className="modal">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:700, color:"#1a1a1a", fontFamily:"'DM Serif Display', serif" }}>{modal==="addTag"?"New Tag":"Edit Tag"}</div>
              <button onClick={function(){setModal(null);}} style={{ background:"none", border:"none", fontSize:22, color:"#bbb", cursor:"pointer", padding:0 }}>\u00d7</button>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:"#aaa", fontWeight:600, marginBottom:6 }}>Tag Name</div>
              <input placeholder="e.g. AI Work, House Projects\u2026" value={tagForm.name} onChange={function(e){setTagForm(Object.assign({},tagForm,{name:e.target.value}));}} style={inp} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:"#aaa", fontWeight:600, marginBottom:6 }}>Weekly Goal (hours)</div>
              <input type="number" min="0.5" step="0.5" placeholder="e.g. 5" value={tagForm.weeklyGoal} onChange={function(e){setTagForm(Object.assign({},tagForm,{weeklyGoal:e.target.value}));}} style={inp} />
            </div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:"#aaa", fontWeight:600, marginBottom:10 }}>Color</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {TAG_COLORS.map(function(c){
                  return (
                    <button key={c.id} onClick={function(){setTagForm(Object.assign({},tagForm,{colorId:c.id}));}} style={{ width:36, height:36, borderRadius:"50%", background:c.bg, border:"3px solid "+(tagForm.colorId===c.id?"#1a1a1a":c.bg), cursor:"pointer", boxShadow:tagForm.colorId===c.id?"0 0 0 2px #fff, 0 0 0 4px #1a1a1a":"none", transition:"all 0.15s" }} />
                  );
                })}
              </div>
            </div>
            <button onClick={saveTag} style={{ width:"100%", padding:"14px", background:"#1a1a1a", color:"#fff", border:"none", borderRadius:12, cursor:"pointer", fontSize:14, fontFamily:"inherit", fontWeight:600, marginBottom:12 }}>
              {modal==="addTag"?"Create Tag":"Save Changes"}
            </button>
            {modal === "editTag" && (
              <button onClick={function(){deleteTag(editingTag.id);}} style={{ width:"100%", padding:"14px", background:"#fff5f5", color:"#FF6B6B", border:"1.5px solid #FFD0D0", borderRadius:12, cursor:"pointer", fontSize:14, fontFamily:"inherit", fontWeight:600 }}>
                Delete Tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
