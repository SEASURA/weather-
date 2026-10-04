const $ = id => document.getElementById(id);
const set = o => Object.entries(o).forEach(([k, v]) => $(k).textContent = v);
let place = { name: "Bengaluru, Karnataka", lat: 12.9716, lon: 77.5946 }, unit = "celsius", hr = {}, tab = "temperature_2m";
const MODELS = ["best_match", "ncep_gfs_seamless", "jma_seamless", "ecmwf_ifs", "ecmwf_ifs025", "ecmwf_aifs025_single"]; // averaged into one forecast

// ---------- weather codes ----------
const L = {0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Heavy showers",82:"Violent showers",95:"Thunderstorm",99:"Thunderstorm with hail"};
const label = c => L[c] || L[Object.keys(L).filter(k => k <= c).pop()];
const kind = c => c >= 95 ? "storm" : c >= 85 ? "snow" : c >= 80 ? "rain" : c >= 71 ? "snow" : c >= 51 ? "rain" : c >= 45 ? "fog" : c == 3 ? "cloud" : "clear";
const EM = { clear: ["☀️", "🌙"], cloud: ["☁️", "☁️"], fog: ["🌫️", "🌫️"], rain: ["🌧️", "🌧️"], snow: ["❄️", "❄️"], storm: ["⛈️", "⛈️"] };
const emoji = (c, day) => c == 2 ? (day ? "⛅" : "☁️") : EM[kind(c)][day ? 0 : 1];

// ---------- animated sky (canvas) ----------
const cv = $("fx"), g = cv.getContext("2d");
let w, h, fx = { k: "clear", day: 1 }, clouds = [], ps = [], flash = 0, bx = 0;
const stars = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + .5, p: Math.random() * 9 }));
const SKY = { clear: [["#1e7fe0", "#8ed1ff"], ["#050a1e", "#1c2b5a"]], cloud: [["#5d7a99", "#b9c8d8"], ["#10151f", "#2a3446"]], rain: [["#3b4d63", "#7b8da1"], ["#0b0f17", "#212b3a"]], snow: [["#8aa4c0", "#e3edf7"], ["#1a2233", "#3a4863"]], fog: [["#8e9aa6", "#cfd6dc"], ["#1a1f26", "#3a424c"]], storm: [["#232a38", "#4a5568"], ["#05070c", "#1a202c"]] };
const rnd = (a, b) => a + Math.random() * (b - a);

// soft cloud sprites in 3 tints: white, grey, dark
const sprites = ["255,255,255", "205,212,222", "70,80,96"].map(rgb => Array.from({ length: 3 }, () => {
  const c = document.createElement("canvas"), x = c.getContext("2d"); c.width = 400; c.height = 200;
  for (let i = 0; i < 16; i++) {
    const px = rnd(70, 330), py = rnd(80, 125) - (i % 3) * 14, r = rnd(35, 75), gr = x.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, `rgba(${rgb},.85)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  return c;
}));

function scene(c, day) {
  const k = kind(c), n = { clear: c == 2 ? 6 : 2, cloud: 10, rain: 12, storm: 14, snow: 9, fog: 7 }[k];
  fx = { k, day, tint: k == "rain" || k == "storm" ? 2 : k == "clear" && day ? 0 : 1 };
  clouds = Array.from({ length: n }, () => { const s = rnd(.8, 2.2); return { x: rnd(-300, innerWidth), y: k == "fog" ? rnd(h * .45, h * .85) : rnd(-20, h * (k == "rain" || k == "storm" ? .3 : .45)), s, v: rnd(.1, .35) * s, a: k == "fog" ? .3 : rnd(.55, .95), i: Math.random() * 3 | 0 }; });
  const np = k == "storm" ? 450 : k == "rain" ? 280 : k == "snow" ? 170 : 0;
  ps = Array.from({ length: np }, () => ({ x: rnd(0, w), y: rnd(0, h), z: Math.random() }));
}

function frame(t) {
  const [a, b] = SKY[fx.k][fx.day ? 0 : 1], gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h);

  if (!fx.day && fx.k == "clear") stars.forEach(s => { g.fillStyle = `rgba(255,255,255,${.3 + .7 * Math.abs(Math.sin(t / 900 + s.p))})`; g.fillRect(s.x * w, s.y * h * .7, s.r, s.r); });

  if (fx.k == "clear") { // sun / moon with glow
    const x = w * .8, y = h * .17, r = fx.day ? 260 + 12 * Math.sin(t / 1500) : 150, gl = g.createRadialGradient(x, y, 0, x, y, r);
    gl.addColorStop(0, fx.day ? "rgba(255,246,205,1)" : "rgba(235,240,255,.95)"); gl.addColorStop(.12, fx.day ? "rgba(255,222,120,.55)" : "rgba(200,212,255,.3)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gl; g.fillRect(0, 0, w, h);
  }

  clouds.forEach(c => { c.x += c.v; if (c.x > w + 50) c.x = -400 * c.s; g.globalAlpha = c.a; g.drawImage(sprites[fx.tint][c.i], c.x, c.y, 400 * c.s, 200 * c.s); });
  g.globalAlpha = 1;

  if (fx.k == "rain" || fx.k == "storm") { // slanted streaks, faster + brighter when closer
    g.lineWidth = 1.2;
    ps.forEach(p => {
      const len = 12 + p.z * 22, v = 16 + p.z * 18;
      g.strokeStyle = `rgba(200,220,245,${.25 + p.z * .45})`; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + len * .22, p.y + len); g.stroke();
      p.y += v; p.x += v * .22; if (p.y > h) { p.y = -30; p.x = rnd(-100, w); }
    });
  }
  if (fx.k == "snow") ps.forEach(p => {
    g.fillStyle = `rgba(255,255,255,${.5 + p.z * .5})`; g.beginPath(); g.arc(p.x, p.y, 1 + p.z * 3, 0, 7); g.fill();
    p.y += .6 + p.z * 1.6; p.x += Math.sin(t / 1000 + p.z * 20) * .6; if (p.y > h) { p.y = -5; p.x = rnd(0, w); }
  });
  if (fx.k == "storm" && Math.random() < .006) { flash = 1; bx = rnd(w * .2, w * .8); }
  if (flash > .02) {
    g.fillStyle = `rgba(220,230,255,${flash * .45})`; g.fillRect(0, 0, w, h);
    if (flash > .5) { g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); let x = bx, y = 0; g.moveTo(x, y); while (y < h * .55) { x += rnd(-30, 30); y += h * .06; g.lineTo(x, y); } g.stroke(); }
    flash *= .92;
  }
  requestAnimationFrame(frame);
}
const resize = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; };
addEventListener("resize", resize); resize();

// ---------- data ----------
// With several models, Open-Meteo returns keys like temperature_2m_jma_seamless: average them per variable
const mean = a => (a = a.filter(x => x != null)).length ? a.reduce((s, x) => s + x) / a.length : null;
function blend(o) {
  const g = {};
  for (const k in o) { const m = MODELS.find(m => k.endsWith("_" + m)), b = m ? k.slice(0, -m.length - 1) : k; (g[b] ??= []).push(o[k]); }
  return Object.fromEntries(Object.entries(g).map(([k, v]) => {
    const f = Array.isArray(v[0]) ? v[0][0] : v[0];
    return [k, typeof f == "string" || k.includes("code") ? v[0] : Array.isArray(v[0]) ? v[0].map((_, i) => mean(v.map(a => a[i]))) : mean(v)]; // text + weather codes: first model
  }));
}
const compass = d => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8];
const hm = i => new Date(i).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
function count(el, to) { const from = +el.textContent || 0, t0 = performance.now(); (function s(t) { const p = Math.min((t - t0) / 800, 1); el.textContent = Math.round(from + (to - from) * p); if (p < 1) requestAnimationFrame(s); })(t0); }
let tz = "Asia/Kolkata";
const tick = () => { if (tz) $("time").textContent = new Date().toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: tz, timeZoneName: "short" }); };
setInterval(tick, 1000);
setInterval(load, 15 * 60 * 1000); // refresh data every 15 min
const showErr = m => { $("err").textContent = m; $("err").classList.toggle("d-none", !m); };

async function load() {
  try {
    showErr("");
    const q = new URLSearchParams({ latitude: place.lat, longitude: place.lon, timezone: "auto", temperature_unit: unit, forecast_days: 8, models: MODELS, cell_selection: "nearest",
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max",
      hourly: "temperature_2m,precipitation_probability,wind_speed_10m" });
    const r = await (await fetch("https://api.open-meteo.com/v1/forecast?" + q)).json(), c = blend(r.current), d = blend(r.daily), hh = blend(r.hourly), i0 = Math.max(0, hh.time.findIndex(t => t >= c.time.slice(0, 13)));
    hr = Object.fromEntries(Object.keys(hh).map(k => [k, hh[k].slice(i0, i0 + 24)])); // next 24h from now
    tz = r.timezone; tick(); scene(c.weather_code, c.is_day);
    count($("t"), Math.round(c.temperature_2m));
    document.querySelectorAll(".u").forEach(e => e.textContent = unit == "celsius" ? "°C" : "°F");
    set({ city: place.name, emoji: emoji(c.weather_code, c.is_day), label: label(c.weather_code),
      feel: Math.round(c.apparent_temperature), max: Math.round(d.temperature_2m_max[0]), min: Math.round(d.temperature_2m_min[0]),
      hum: c.relative_humidity_2m, wind: c.wind_speed_10m, dir: compass(c.wind_direction_10m), rain: hr.precipitation_probability[0] ?? 0, rise: hm(d.sunrise[0]), set: hm(d.sunset[0]) });
    insight(c, d, hh); chart();
    $("days").innerHTML = d.time.map((day, i) => `<div class="day ${i ? "" : "active"}"><div>${new Date(day).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}</div><div class="fs-2">${emoji(d.weather_code[i], 1)}</div><b>${Math.round(d.temperature_2m_max[i])}°</b> <span class="muted">${Math.round(d.temperature_2m_min[i])}°</span></div>`).join("");
    document.title = `${Math.round(c.temperature_2m)}° ${place.name} · WeatherNow`;
  } catch { showErr("Couldn't load the weather. Check your connection and try again."); }
}

// ---------- insights ----------
const TONE = ["success", "warning", "danger"], lv = (v, m, h) => (v >= h) + (v >= m); // 0 low · 1 med · 2 high

function insight(c, d, h) {
  const tc = unit == "celsius" ? c.apparent_temperature : (c.apparent_temperature - 32) * 5 / 9,
    rain = d.precipitation_probability_max[0] ?? 0, wind = c.wind_speed_10m, uv = d.uv_index_max[0] ?? 0,
    H = lv(tc, 32, 38), R = lv(rain, 40, 70), W = lv(wind, 25, 40), U = lv(uv, 6, 8),
    score = Math.round(Math.max(0, 100 - rain * .4 - Math.max(0, tc - 28) * 3 - Math.max(0, wind - 20) - Math.max(0, uv - 6) * 3)),
    tone = score >= 75 ? 0 : score >= 50 ? 1 : 2,
    [pe, pt, pq] = [[rain >= 60, "🌧️", "COUCH DAY", "The sky has officially cancelled your plans."],
      [tc >= 35, "🔥", "BRO, STAY INSIDE", "Your phone isn't overheating. The planet is."],
      [1, "☀️", "THE MAIN CHARACTER", "Today is basically telling you to go outside."]].find(p => p[0]).slice(1),
    acts = [["🏃", "Exercise", Math.max(H, R), ["Good", "Okay", "Avoid"]],
      ["🚶", "Walking", Math.max(H, R), ["Great", "Good", "Skip"]],
      ["🏍️", "Bike ride", Math.max(R, W), ["Good", "Caution", "Avoid"]],
      ["☂️", "Umbrella", R, ["Not needed", "Take one", "Essential"]],
      ["👕", "Clothing", 0, [tc >= 30 ? "Light clothes" : tc >= 20 ? "T-shirt" : "Jacket"]]],
    n = 32, p = h.precipitation_probability[n]; // tomorrow 8 AM (hourly starts at today 00:00)

  $("ai").innerHTML = `
  <div class="glass p-4 mb-3"><div class="row g-3 align-items-center">
    <div class="col-md-5 text-center"><div class="fs-1">${pe}</div><h4>${pt}</h4><p class="muted mb-0">“${pq}”</p></div>
    <div class="col-md-7"><h4>${["🟢", "🟡", "🔴"][tone]} ${["GOOD", "OKAY", "ROUGH"][tone]} DAY · ${score}/100</h4>
      <div class="progress mb-3" style="height:8px"><div class="progress-bar bg-${TONE[tone]}" style="width:${score}%"></div></div>
      ${Object.entries({ "🌡️ Heat": H, "🌧️ Rain": R, "💨 Wind": W, "☀️ UV": U }).map(([k, l]) => `<span class="badge text-bg-${TONE[l]} me-1">${k} ${["LOW", "MED", "HIGH"][l]}</span>`).join("")}
    </div></div></div>
  <div class="row row-cols-2 row-cols-md-5 g-3 mb-3 text-center">${acts.map(([e, nm, l, t]) =>
    `<div class="col"><div class="glass p-3 h-100"><div class="fs-2">${e}</div><div class="fw-semibold mb-1">${nm}</div><span class="badge text-bg-${TONE[l]}">${t[l]}</span></div></div>`).join("")}</div>
  <div class="glass p-3 mb-3 text-center">🔮 <b>Tomorrow, 8 AM</b> · 🌧️ ${p}% · 🌡️ ${Math.round(h.temperature_2m[n])}° · 💨 ${h.wind_speed_10m[n]} km/h —
    ${p >= 50 ? "Leave 20 minutes earlier." : "Smooth start expected."}</div>`;
}

// ---------- hourly chart (temperature / precipitation / wind) ----------
function chart() {
  const v = (hr[tab] || []).map(x => x ?? 0), n = v.length, bars = tab == "precipitation_probability", suf = tab == "temperature_2m" ? "°" : bars ? "%" : "",
    lo = tab == "temperature_2m" ? Math.min(...v) - 8 : 0, hi = bars ? 100 : Math.max(...v, 1),
    X = i => 30 + i * 660 / (n - 1), Y = x => 130 - (x - lo) / (hi - lo || 1) * 90, P = v.map((x, i) => `${X(i)},${Y(x)}`).join(" L");
  $("chart").innerHTML = `<svg viewBox="0 0 720 160" class="w-100">${bars
    ? v.map((x, i) => `<rect x="${X(i) - 7}" y="${Y(x)}" width="14" height="${130 - Y(x)}" rx="3" fill="#8ab4f8" opacity=".7"/>`).join("")
    : `<path d="M${X(0)},130 L${P} L${X(n - 1)},130Z" fill="rgba(251,192,45,.25)"/><path d="M${P}" fill="none" stroke="#fbc02d" stroke-width="2.5"/>`}
    ${v.map((x, i) => i % 3 ? "" : `<g font-size="13" text-anchor="middle" fill="#fff"><text x="${X(i)}" y="${Y(x) - 8}" font-weight="600">${Math.round(x)}${suf}</text><text x="${X(i)}" y="152" opacity=".7">${new Date(hr.time[i]).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true })}</text></g>`).join("")}</svg>`;
}
$("tabs").onclick = e => { if (e.target.dataset.k) { tab = e.target.dataset.k; document.querySelectorAll("#tabs a").forEach(a => a.classList.toggle("active", a == e.target)); chart(); } };

async function search(name) {
  if (!name.trim()) return;
  try {
    const res = (await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=10&name=${encodeURIComponent(name)}`)).json()).results;
    const r = res?.find(x => x.country_code == "IN") || res?.[0];
    if (!r) return showErr(`No city found for "${name}".`);
    place = { name: r.name + (r.admin1 ? ", " + r.admin1 : ""), lat: r.latitude, lon: r.longitude }; load();
  } catch { showErr("City search failed. Try again."); }
}

// ---------- events ----------
$("cities").innerHTML = ["Bengaluru", "Tumakuru", "Mysuru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Kolkata", "Pune", "Jaipur"].map(c => `<li><a class="dropdown-item" href="#">${c}</a></li>`).join("");
$("cities").onclick = e => { e.preventDefault(); if (e.target.matches("a")) search(e.target.textContent); };
$("form").onsubmit = e => { e.preventDefault(); search($("q").value); };
[["btnC", "celsius"], ["btnF", "fahrenheit"]].forEach(([id, u]) => $(id).onclick = () => { unit = u; $("btnC").classList.toggle("active", u == "celsius"); $("btnF").classList.toggle("active", u == "fahrenheit"); load(); });

scene(0, 1); requestAnimationFrame(frame); load();
