// Dashboard.js - final corrected frontend
import React, { useEffect, useState, useRef } from "react";
import "./Dashboard.css";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function Dashboard() {
  // core UI state
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [entries, setEntries] = useState({}); // key: "month-day" -> { text,image,video,audio,mood, rawMedia }
  const [text, setText] = useState("");
  const [dayImage, setDayImage] = useState("");
  const [dayVideo, setDayVideo] = useState("");
  const [dayAudio, setDayAudio] = useState("");
  const [activeMediaTab, setActiveMediaTab] = useState("image");

  const [isEditing, setIsEditing] = useState(true);
  const [showMoodPicker, setShowMoodPicker] = useState(null);
  const [filterMood, setFilterMood] = useState(null);

  // date & helpers
  const todayRef = useRef(new Date());
  const [nowTick, setNowTick] = useState(new Date());
  const today = nowTick;
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  const thisYear = today.getFullYear();

  const BASE = process.env.REACT_APP_API_BASE_URL || "https://three65-82mp.onrender.com";
  const getToken = () => localStorage.getItem("token");

  // Helper: choose first URL for each media type from rawMedia array
  const pickMediaUrls = (rawMedia = []) => {
    let image = "", video = "", audio = "";
    (rawMedia || []).forEach(m => {
      if (!m) return;
      const url = m.url || m.secure_url || "";
      const t = (m.type || "").toString().toLowerCase();
      if (!url) return;
      if ((t.includes("image") || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && !image) image = url;
      else if ((t.includes("video") || url.match(/\.(mp4|mov|avi|webm)$/i)) && !video) video = url;
      else if ((t.includes("audio") || t.includes("raw") || url.match(/\.(mp3|wav|ogg|m4a)$/i)) && !audio) audio = url;
      else if (!image) image = url; // fallback
    });
    return { image, video, audio };
  };

  // Load all entries on mount (Option A)
  useEffect(() => {
    let mounted = true;
    const token = getToken();
    if (!token) {
      // fallback to localStorage if needed
      try {
        const raw = localStorage.getItem("entries");
        if (mounted) setEntries(raw ? JSON.parse(raw) : {});
      } catch (e) {
        console.error("Failed to parse local entries", e);
      }
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${BASE}/days`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Fetch /days failed: ${res.status}`);
        const j = await res.json();
        const mapped = {};
        (j.list || []).forEach(item => {
          const m = (typeof item.month === "number" && item.month !== null) ? item.month : new Date().getMonth();
          const dnum = Number(item.dayNumber) || 0;
          if (!dnum) return;
          const key = `${m}-${dnum}`;
          const raw = item.media || [];
          const { image, video, audio } = pickMediaUrls(raw);
          mapped[key] = {
            text: item.text || "",
            image,
            video,
            audio,
            mood: item.mood || "",
            lastUpdated: item.updatedAt || item.createdAt || new Date().toISOString(),
            rawMedia: raw
          };
        });
        if (!mounted) return;
        setEntries(prev => {
          const merged = { ...(prev || {}), ...mapped };
          try { localStorage.setItem("entries", JSON.stringify(merged)); } catch (e) {}
          return merged;
        });
      } catch (err) {
        console.error("Error loading days:", err);
        // fallback to localStorage
        try {
          const raw = localStorage.getItem("entries");
          if (mounted) setEntries(raw ? JSON.parse(raw) : {});
        } catch (e) {
          console.error("Failed to load local entries", e);
          if (mounted) setEntries({});
        }
      }
    })();

    return () => { mounted = false; };
  }, []); // run once

  // Save entries to localStorage (fallback)
  useEffect(() => {
    try { localStorage.setItem("entries", JSON.stringify(entries)); } catch (e) {}
  }, [entries]);

  // finalize past days (keeps your existing behavior)
  const finalizePastDays = (realNow = new Date()) => {
    const realMonth = realNow.getMonth();
    const realDay = realNow.getDate();
    const updated = { ...entries };
    let changed = false;
    for (let d = 1; d <= 30; d++) {
      const key = `${monthIndex}-${d}`;
      const entry = updated[key];
      const isPast = monthIndex < realMonth || (monthIndex === realMonth && d < realDay);
      if (!isPast) continue;
      const hasContent = !!(entry && ((entry.text && String(entry.text).trim() !== "") || entry.image || entry.video || entry.audio));
      if (!entry) {
        updated[key] = { text: "", image: "", video: "", audio: "", mood: "black", lastUpdated: new Date().toISOString(), rawMedia: [] };
        changed = true;
        continue;
      }
      if (hasContent && (!entry.mood || entry.mood === "")) {
        updated[key] = { ...entry, mood: "yellow", lastUpdated: entry.lastUpdated || new Date().toISOString() };
        changed = true;
        continue;
      }
      if (!hasContent && entry.mood !== "black") {
        updated[key] = { ...entry, mood: "black", lastUpdated: entry.lastUpdated || new Date().toISOString() };
        changed = true;
      }
    }
    if (changed) setEntries(updated);
  };

  useEffect(() => {
    finalizePastDays(new Date());
    const timer = setInterval(() => {
      const now = new Date();
      if (now.getDate() !== todayRef.current.getDate() || now.getMonth() !== todayRef.current.getMonth() || now.getFullYear() !== todayRef.current.getFullYear()) {
        todayRef.current = now;
        setNowTick(new Date(now));
        finalizePastDays(now);
      }
    }, 15_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthIndex]);

  useEffect(() => { finalizePastDays(nowTick); }, [nowTick]);

  // helpers
  const keyFor = (m, d) => `${m}-${d}`;
  const isPast = (m, d) => (m < todayMonth) || (m === todayMonth && d < todayDay);
  const isToday = (m, d) => (m === todayMonth && d === todayDay);
  const isFuture = (m, d) => (m > todayMonth) || (m === todayMonth && d > todayDay);

  // open popup -> load entry state into editor state
  const openPopup = (day) => {
    if (isFuture(monthIndex, day)) return;
    const k = keyFor(monthIndex, day);
    const entry = entries[k] || { text: "", image: "", video: "", audio: "", mood: "", rawMedia: [] };
    setSelectedDay(day);
    setText(entry.text || "");
    setDayImage(entry.image || "");
    setDayVideo(entry.video || "");
    setDayAudio(entry.audio || "");
    setActiveMediaTab("image");
    setIsEditing(isToday(monthIndex, day));
    setShowMoodPicker(null);
  };

  // persist local state (and optionally persist to backend via persistToBackend)
  const persistEntry = (day, newText, newImage, newVideo, newAudio, newMood) => {
    if (!day || !isToday(monthIndex, day)) return;
    const k = keyFor(monthIndex, day);
    const prev = entries[k] || {};
    const entry = {
      text: newText !== undefined ? newText : prev.text || "",
      image: newImage !== undefined ? newImage : prev.image || "",
      video: newVideo !== undefined ? newVideo : prev.video || "",
      audio: newAudio !== undefined ? newAudio : prev.audio || "",
      mood: newMood !== undefined ? newMood : prev.mood || "",
      lastUpdated: new Date().toISOString(),
      rawMedia: prev.rawMedia || []
    };
    setEntries(prevAll => ({ ...prevAll, [k]: entry }));
  };

  // === Persist to backend (text/mood/files). This is final version
  const persistEntryToBackend = async (day, payload = {}, files = []) => {
    const token = getToken();
    if (!token) return;
    try {
      const form = new FormData();
      if (payload.text !== undefined) form.append("text", payload.text);
      if (payload.mood !== undefined) form.append("mood", payload.mood);
      form.append("month", String(monthIndex));
      for (const f of files) form.append("files", f);

      const res = await fetch(`${BASE}/upload/${day}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (!res.ok) {
        const txt = await res.text();
        console.warn("persistEntryToBackend non-ok:", txt);
        return;
      }
      const json = await res.json();
      const de = json.dayEntry;
      if (!de) return;
      // map returned doc to local entry
      const k = `${de.month}-${de.dayNumber}`;
      const raw = de.media || [];
      const { image, video, audio } = pickMediaUrls(raw);
      setEntries(prev => {
        const merged = { ...(prev || {}) };
        merged[k] = {
          text: de.text || (payload.text !== undefined ? payload.text : (merged[k]?.text || "")),
          image: image || (merged[k]?.image || ""),
          video: video || (merged[k]?.video || ""),
          audio: audio || (merged[k]?.audio || ""),
          mood: de.mood || (payload.mood !== undefined ? payload.mood : (merged[k]?.mood || "")),
          lastUpdated: de.updatedAt || new Date().toISOString(),
          rawMedia: raw
        };
        try { localStorage.setItem("entries", JSON.stringify(merged)); } catch (e) {}
        return merged;
      });
    } catch (err) {
      console.error("persistEntryToBackend error:", err);
    }
  };

  // handle text changes - live save
  const handleTextChange = (val) => {
    setText(val);
    if (selectedDay) {
      persistEntry(selectedDay, val, dayImage, dayVideo, dayAudio, undefined);
      persistEntryToBackend(selectedDay, { text: val });
    }
  };

  // upload file (image/video/audio)
  const uploadFile = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDay) return;
    // quick local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (type === "image") setDayImage(dataUrl);
      if (type === "video") setDayVideo(dataUrl);
      if (type === "audio") setDayAudio(dataUrl);
    };
    reader.readAsDataURL(file);

    if (!isToday(monthIndex, selectedDay)) return;

    // upload to backend (backend -> cloudinary)
    await persistEntryToBackend(selectedDay, { text }, [file]);
  };

  // delete active media (calls PATCH to remove from DB and Cloudinary)
  const deleteActiveMedia = async () => {
    if (!selectedDay || !isToday(monthIndex, selectedDay)) return;
    const k = keyFor(monthIndex, selectedDay);
    const prev = entries[k] || {};
    const raw = prev.rawMedia || [];

    let removeUrls = [];
    let removePublicIds = [];

    if (activeMediaTab === "image" && prev.image) {
      raw.forEach(m => { if (m.url === prev.image) { if (m.url) removeUrls.push(m.url); if (m.public_id) removePublicIds.push(m.public_id); } });
      setDayImage("");
      persistEntry(selectedDay, text, "", dayVideo, dayAudio, undefined);
    } else if (activeMediaTab === "video" && prev.video) {
      raw.forEach(m => { if (m.url === prev.video) { if (m.url) removeUrls.push(m.url); if (m.public_id) removePublicIds.push(m.public_id); } });
      setDayVideo("");
      persistEntry(selectedDay, text, dayImage, "", dayAudio, undefined);
    } else if (activeMediaTab === "audio" && prev.audio) {
      raw.forEach(m => { if (m.url === prev.audio) { if (m.url) removeUrls.push(m.url); if (m.public_id) removePublicIds.push(m.public_id); } });
      setDayAudio("");
      persistEntry(selectedDay, text, dayImage, dayVideo, "");
    } else {
      return;
    }

    // update UI immediately
    const newRaw = raw.filter(m => !removeUrls.includes(m.url) && !removePublicIds.includes(m.public_id));
    setEntries(prevAll => ({ ...prevAll, [k]: { ...(prevAll[k] || {}), rawMedia: newRaw, image: (newRaw.length? pickMediaUrls(newRaw).image:""), video: (newRaw.length? pickMediaUrls(newRaw).video:""), audio: (newRaw.length? pickMediaUrls(newRaw).audio:"") } }));

    // call PATCH
    try {
      const token = getToken();
      if (!token) return;
      const body = { month: monthIndex };
      if (removeUrls.length) body.removeUrls = removeUrls;
      if (removePublicIds.length) body.removePublicIds = removePublicIds;
      const res = await fetch(`${BASE}/upload/${selectedDay}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        console.warn("Patch remove failed", await res.text());
        return;
      }
      const json = await res.json();
      const de = json.dayEntry;
      if (de) {
        const k2 = `${de.month}-${de.dayNumber}`;
        const { image, video, audio } = pickMediaUrls(de.media || []);
        setEntries(prev => ({ ...prev, [k2]: { text: de.text || "", image, video, audio, mood: de.mood || "", lastUpdated: de.updatedAt || new Date().toISOString(), rawMedia: de.media || [] } }));
      }
    } catch (err) {
      console.error("Delete media error:", err);
    }
  };

  // set mood
  const setMoodForDay = (day, mood) => {
    if (!isToday(monthIndex, day)) { setShowMoodPicker(null); return; }
    const k = keyFor(monthIndex, day);
    const prev = entries[k] || {};
    const updated = { ...prev, mood, lastUpdated: new Date().toISOString() };
    setEntries(prevAll => ({ ...prevAll, [k]: updated }));
    setShowMoodPicker(null);
    persistEntryToBackend(day, { mood });
  };

  // close popup
  const closePopup = () => {
    setSelectedDay(null);
    setText("");
    setDayImage("");
    setDayVideo("");
    setDayAudio("");
    setActiveMediaTab("image");
    setIsEditing(true);
    setShowMoodPicker(null);
  };

  // mood counts and toggle
  const moodCounts = { green: 0, red: 0, yellow: 0, black: 0 };
  Object.values(entries).forEach(e => { if (e?.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1; });
  const toggleFilter = (mood) => setFilterMood(prev => (prev === mood ? null : mood));

  // Render (UI preserved)
  return (
    <div className="dashboard-container">
      {/* mood palette fixed */}
      <div className="mood-palette-fixed">
        <div className="mood-item" title="Green (happy)" onClick={() => toggleFilter("green")}>
          <div className="mood-dot mood-green" />
          <div className="mood-count">{moodCounts.green}</div>
        </div>
        <div className="mood-item" title="Red (sad)" onClick={() => toggleFilter("red")}>
          <div className="mood-dot mood-red" />
          <div className="mood-count">{moodCounts.red}</div>
        </div>
        <div className="mood-item" title="Yellow (neutral)" onClick={() => toggleFilter("yellow")}>
          <div className="mood-dot mood-yellow" />
          <div className="mood-count">{moodCounts.yellow}</div>
        </div>
        <div className="mood-item" title="Black (empty/locked)" onClick={() => toggleFilter("black")}>
          <div className="mood-dot mood-black" />
          <div className="mood-count">{moodCounts.black}</div>
        </div>
      </div>

      {/* Month header */}
      <div className="month-header">
        <button className="month-btn" onClick={() => setMonthIndex(prev => (prev - 1 + 12) % 12)}>◀</button>
        <div className="month-title">{months[monthIndex]} {thisYear}</div>
        <button className="month-btn" onClick={() => setMonthIndex(prev => (prev + 1) % 12)}>▶</button>
      </div>

      {/* Grid */}
      <div className="grid-container">
        {Array.from({ length: 30 }).map((_, idx) => {
          const day = idx + 1;
          const k = keyFor(monthIndex, day);
          const entry = entries[k];
          const mood = entry?.mood;
          const lockedBlack = isPast(monthIndex, day) && mood === "black";

          if (filterMood && mood !== filterMood) return null;

          const clickable = (entry || isToday(monthIndex, day)) && !isFuture(monthIndex, day);

          return (
            <div
              key={k}
              className={`day-circle ${mood ? `mood-${mood}` : ""} ${lockedBlack ? "locked-empty" : ""}`}
              onClick={() => { if (clickable) openPopup(day); }}
            >
              <div className="circle-number">{day}</div>

              {isToday(monthIndex, day) && (
                <button className="add-mood-btn" onClick={(e) => { e.stopPropagation(); setShowMoodPicker(day); }}>+</button>
              )}

              {showMoodPicker === day && isToday(monthIndex, day) && (
                <div className="mood-popup">
                  {["green", "red", "yellow", "black"].map(col => (
                    <div key={col} className={`mood-choice mood-${col}`} onClick={() => setMoodForDay(day, col)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

     {/* Popup */}
{selectedDay && (
  <div className="popup-overlay">
    <div className="white-sheet mobile-popup">
      {/* Top 20%: Controls */}
      <div className="mobile-top-controls">
        <div className="sheet-header-mobile">
          <div className="day-date">
            Day {selectedDay} — {months[monthIndex]} {thisYear}
          </div>
          <div className="top-actions">
            <span className="autosave-label">{isToday(monthIndex, selectedDay) ? "Auto-saving ON" : "Saved"}</span>
            <button className="btn secondary close-btn" onClick={closePopup}>Close</button>
          </div>
        </div>

        <div className="media-tabs-mobile">
          {["image","video","audio"].map(tab => (
            <button
              key={tab}
              className={`media-tab ${activeMediaTab === tab ? "active" : ""}`}
              onClick={() => setActiveMediaTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
          {isToday(monthIndex, selectedDay) && (dayImage || dayVideo || dayAudio) && (
            <button className="delete-media-btn" onClick={deleteActiveMedia}>✖</button>
          )}
        </div>

        {isToday(monthIndex, selectedDay) && (
          <div className="upload-row-mobile">
            <label className="upload-label">
              <input type="file" accept="image/*" onChange={(e) => uploadFile(e, "image")} />Image
            </label>
            <label className="upload-label">
              <input type="file" accept="video/*" onChange={(e) => uploadFile(e, "video")} />Video
            </label>
            <label className="upload-label">
              <input type="file" accept="audio/*" onChange={(e) => uploadFile(e, "audio")} />Audio
            </label>
          </div>
        )}
      </div>

      {/* Middle 40%: Media */}
      <div className="mobile-media-preview">
        {activeMediaTab === "image" && dayImage && (
          <img src={dayImage} alt="uploaded" className="media-fit" />
        )}
        {activeMediaTab === "video" && dayVideo && (
          <video controls className="media-fit"><source src={dayVideo} /></video>
        )}
        {activeMediaTab === "audio" && dayAudio && (
          <audio controls className="audio-fit"><source src={dayAudio} /></audio>
        )}
        {!dayImage && !dayVideo && !dayAudio && <div className="no-media">No Media</div>}
      </div>

      {/* Bottom 40%: Text */}
      <div className="mobile-text-area">
        {!isToday(monthIndex, selectedDay) ? (
          <div className="sheet-view-text">{text ? <pre>{text}</pre> : <em>No text saved.</em>}</div>
        ) : (
          <textarea
            className="sheet-textarea"
            value={text}
            placeholder="Type your memory..."
            onChange={(e) => handleTextChange(e.target.value)}
          />
        )}
      </div>
    </div>
  </div>
)}

    </div>
  );
}
export default Dashboard;
