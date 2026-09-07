const locations = {
  hiltonHead: { name: "Hilton Head", lat: 32.2163, lon: -80.7526 },
  pittsburgh: { name: "Pittsburgh", lat: 40.4406, lon: -79.9959 }
};

const statusEl = document.getElementById("status");
const todayEl = document.getElementById("today");
const forecastEl = document.getElementById("forecast");
const updatedEl = document.getElementById("updated");
const refreshBtn = document.getElementById("refresh");
const installBtn = document.getElementById("install");

const weatherText = {
  0:"Clear", 1:"Mostly clear", 2:"Partly cloudy", 3:"Overcast",
  45:"Fog", 48:"Rime fog",
  51:"Light drizzle", 53:"Drizzle", 55:"Heavy drizzle",
  61:"Light rain", 63:"Rain", 65:"Heavy rain",
  71:"Light snow", 73:"Snow", 75:"Heavy snow",
  80:"Rain showers", 81:"Rain showers", 82:"Heavy showers",
  85:"Snow showers", 86:"Heavy snow showers",
  95:"Thunderstorm", 96:"Thunderstorm + hail", 99:"Thunderstorm + hail"
};
const weatherIcon = code => ({
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",
  51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",
  71:"🌨️",73:"🌨️",75:"❄️",80:"🌦️",81:"🌧️",82:"🌧️",
  85:"🌨️",86:"❄️",95:"⛈️",96:"⛈️",99:"⛈️"
}[code] || "🌡️");

async function getForecast(place) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: place.lat,
    longitude: place.lon,
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: "7"
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather request failed");
  return response.json();
}

function dayName(date, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" });
}

function formatDiff(a, b) {
  const d = Math.round(a - b);
  if (d === 0) return "Same high";
  return d > 0 ? `Hilton Head ${d}° warmer` : `Pittsburgh ${Math.abs(d)}° warmer`;
}

function cityHTML(name, data, i) {
  const code = data.daily.weather_code[i];
  const rain = data.daily.precipitation_probability_max[i] ?? 0;
  const precip = data.daily.precipitation_sum[i] ?? 0;
  const wind = Math.round(data.daily.wind_speed_10m_max[i] ?? 0);
  return `<div class="city">
    <div class="city-head">
      <span class="city-name">${name}</span>
      <span class="icon">${weatherIcon(code)}</span>
    </div>
    <div class="temps">${Math.round(data.daily.temperature_2m_max[i])}° / ${Math.round(data.daily.temperature_2m_min[i])}°</div>
    <div class="meta">${weatherText[code] || "Weather"}<br>${rain}% rain · ${precip.toFixed(2)}" · ${wind} mph</div>
  </div>`;
}

function render(hh, pgh) {
  const d = hh.daily;
  const p = pgh.daily;

  const hhToday = Math.round(d.temperature_2m_max[0]);
  const pghToday = Math.round(p.temperature_2m_max[0]);

  todayEl.innerHTML = `<div class="hero-grid">
    <div class="hero-city"><div class="name">Hilton Head</div><div class="temp">${hhToday}°</div><div class="condition">${weatherText[d.weather_code[0]]}</div></div>
    <div class="vs">VS</div>
    <div class="hero-city"><div class="name">Pittsburgh</div><div class="temp">${pghToday}°</div><div class="condition">${weatherText[p.weather_code[0]]}</div></div>
  </div>
  <div class="winner">${formatDiff(hhToday, pghToday)}</div>`;
  todayEl.classList.remove("hidden");

  forecastEl.innerHTML = d.time.map((date, i) => `
    <article class="day-card">
      <div class="day-title">${dayName(date, i)}</div>
      <div class="columns">
        ${cityHTML("Hilton Head", hh, i)}
        ${cityHTML("Pittsburgh", pgh, i)}
      </div>
      <div class="diff">${formatDiff(d.temperature_2m_max[i], p.temperature_2m_max[i])}</div>
    </article>
  `).join("");

  updatedEl.textContent = `Updated ${new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}`;
}

async function load() {
  statusEl.textContent = "Loading forecast…";
  refreshBtn.disabled = true;
  try {
    const [hh, pgh] = await Promise.all([
      getForecast(locations.hiltonHead),
      getForecast(locations.pittsburgh)
    ]);
    render(hh, pgh);
    statusEl.classList.add("hidden");
  } catch (error) {
    statusEl.classList.remove("hidden");
    statusEl.textContent = "Could not load the weather. Check your internet connection and try again.";
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", load);

let deferredPrompt;
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove("hidden");
});
installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  installBtn.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

load();
