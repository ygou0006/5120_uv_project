import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const FALLBACK_CITY = {
  name: "Melbourne, Victoria",
  latitude: -37.8136,
  longitude: 144.9631,
  timezone: "Australia/Melbourne",
  source: "fallback"
};

export default function App() {
  const [page, setPage] = useState("home");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [error, setError] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [myths, setMyths] = useState([]);
  const [skinCancerTrend, setSkinCancerTrend] = useState([]);
  const [monthlyUv2pm, setMonthlyUv2pm] = useState([]);

  const [locationData, setLocationData] = useState({
    latitude: FALLBACK_CITY.latitude,
    longitude: FALLBACK_CITY.longitude,
    timezone: FALLBACK_CITY.timezone,
    name: FALLBACK_CITY.name,
    source: FALLBACK_CITY.source
  });

  const [uvThreshold, setUvThreshold] = useState(8);
  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [dynamicThemeEnabled, setDynamicThemeEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderStart, setReminderStart] = useState("10:00");
  const [reminderInterval, setReminderInterval] = useState(2);
  const [nextReminder, setNextReminder] = useState("");
  const [bannerMessage, setBannerMessage] = useState("");
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] =
    useState(false);
  const [lastTriggeredBucket, setLastTriggeredBucket] = useState(null);

  const reminderTimerRef = useRef(null);

  const navItems = [
    { key: "home", label: "Home" },
    { key: "awareness", label: "Awareness" },
    { key: "protection", label: "Protection Tools" }
  ];

  function buildLocationName(result, latitude, longitude) {
    if (!result) {
      return `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
    }

    const primary =
      result.city ||
      result.town ||
      result.village ||
      result.suburb ||
      result.municipality ||
      result.locality ||
      result.name;

    const secondary =
      result.admin1 ||
      result.state ||
      result.region ||
      result.country;

    if (primary && secondary) {
      return `${primary}, ${secondary}`;
    }

    if (primary) {
      return primary;
    }

    if (secondary) {
      return secondary;
    }

    return `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
  }

  async function reverseGeocode(latitude, longitude) {
    try {
      const response = await fetch(
        `${API_BASE}/api/reverse-geocode?lat=${latitude}&lng=${longitude}`
      );

      if (!response.ok) {
        throw new Error("Unable to identify location");
      }

      const data = await response.json();

      return {
        name: data.displayName
          ? data.displayName
          : buildLocationName(data.raw, latitude, longitude),
        timezone: data.timezone || FALLBACK_CITY.timezone
      };
    } catch (error) {
      console.error("Reverse geocode failed:", error);

      return {
        name: `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`,
        timezone: FALLBACK_CITY.timezone
      };
    }
  }

  async function loadPreferences() {
    try {
      const response = await fetch(`${API_BASE}/api/preferences`);
      const data = await response.json();

      setUvThreshold(data.uv_threshold ?? 8);
      setThresholdEnabled(Boolean(data.threshold_enabled));
      setDynamicThemeEnabled(Boolean(data.dynamic_theme_enabled));
      setReminderEnabled(Boolean(data.reminder_enabled));
      setReminderStart(data.reminder_start ?? "10:00");
      setReminderInterval(data.reminder_interval ?? 2);
    } catch (err) {
      console.error("Failed to load preferences:", err);
    }
  }

  async function savePreferences(overrides = {}) {
    const payload = {
      uvThreshold,
      thresholdEnabled,
      dynamicThemeEnabled,
      reminderEnabled,
      reminderStart,
      reminderInterval,
      ...overrides
    };

    try {
      await fetch(`${API_BASE}/api/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Failed to save preferences:", err);
    }
  }

  useEffect(() => {
    async function loadStaticData() {
      try {
        const [mythsRes, trendRes, monthlyRes] = await Promise.all([
          fetch(`${API_BASE}/api/myths`),
          fetch(`${API_BASE}/api/skin-cancer-trend`),
          fetch(`${API_BASE}/api/monthly-uv-2pm`)
        ]);

        const mythsData = await mythsRes.json();
        const trendData = await trendRes.json();
        const monthlyData = await monthlyRes.json();

        setMyths(mythsData);
        setSkinCancerTrend(trendData);
        setMonthlyUv2pm(monthlyData);
      } catch (err) {
        console.error("Failed to load awareness data:", err);
      }
    }

    loadPreferences();
    loadStaticData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function getUserLocation() {
      try {
        setLoadingLocation(true);

        if (!("geolocation" in navigator)) {
          setBannerMessage(
            "Location services are not available in this browser. Melbourne is being used as the default location."
          );
          setLoadingLocation(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (cancelled) return;

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const place = await reverseGeocode(latitude, longitude);

            if (cancelled) return;

            setLocationData({
              latitude,
              longitude,
              timezone: place.timezone || FALLBACK_CITY.timezone,
              name: place.name,
              source: "gps"
            });

            setBannerMessage(
              "Location updated successfully."
            );
            setLoadingLocation(false);
          },
          () => {
            if (cancelled) return;

            setLocationData({
              latitude: FALLBACK_CITY.latitude,
              longitude: FALLBACK_CITY.longitude,
              timezone: FALLBACK_CITY.timezone,
              name: FALLBACK_CITY.name,
              source: "fallback"
            });

            setBannerMessage(
              "We could not access your location, so Melbourne is being used as the default location."
            );
            setLoadingLocation(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } catch (err) {
        console.error("Location detection failed:", err);
        if (!cancelled) {
          setLoadingLocation(false);
          setBannerMessage(
            "We could not detect your location, so Melbourne is being used as the default location."
          );
        }
      }
    }

    getUserLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  async function detectLocationAgain() {
    setLoadingLocation(true);
    setBannerMessage("");

    if (!("geolocation" in navigator)) {
      setLoadingLocation(false);
      setBannerMessage(
        "Location services are not available in this browser."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const place = await reverseGeocode(latitude, longitude);

        setLocationData({
          latitude,
          longitude,
          timezone: place.timezone || FALLBACK_CITY.timezone,
          name: place.name,
          source: "gps"
        });

        setBannerMessage("Location updated successfully.");
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Refresh location failed:", error);
        setLoadingLocation(false);
        setBannerMessage(
          "We could not refresh your location. The current location setting is still being used."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  useEffect(() => {
    async function fetchUvData() {
      try {
        setLoadingWeather(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/api/uv?lat=${locationData.latitude}&lng=${locationData.longitude}&timezone=${encodeURIComponent(locationData.timezone)}`
        );

        if (!response.ok) {
          throw new Error("Unable to load live UV data.");
        }

        const data = await response.json();
        setWeatherData(data);
      } catch (err) {
        setError(err.message || "Something went wrong while loading UV data.");
      } finally {
        setLoadingWeather(false);
      }
    }

    fetchUvData();
  }, [locationData.latitude, locationData.longitude, locationData.timezone]);

  const currentUv = weatherData?.current?.uv_index ?? 0;
  const currentTemp = weatherData?.current?.temperature_2m;
  const sunrise = weatherData?.daily?.sunrise?.[0];
  const sunset = weatherData?.daily?.sunset?.[0];
  const hourlyTimes = weatherData?.hourly?.time ?? [];
  const hourlyUv = weatherData?.hourly?.uv_index ?? [];
  const hourlyClearUv = weatherData?.hourly?.uv_index_clear_sky ?? [];

  const hourlyChartData = useMemo(
    () =>
      hourlyTimes.map((time, index) => ({
        label: formatTime(time),
        uv: Number((hourlyUv[index] ?? 0).toFixed(1)),
        clearSkyUv: Number((hourlyClearUv[index] ?? 0).toFixed(1))
      })),
    [hourlyTimes, hourlyUv, hourlyClearUv]
  );

  const maxHourlyValue = useMemo(() => {
    if (!hourlyUv.length && !hourlyClearUv.length) return 12;
    return Math.max(...hourlyUv, ...hourlyClearUv, 12);
  }, [hourlyUv, hourlyClearUv]);

  const peakHourInfo = useMemo(() => {
    if (!hourlyUv.length || !hourlyTimes.length) return null;
    let bestIndex = 0;
    for (let i = 1; i < hourlyUv.length; i += 1) {
      if ((hourlyUv[i] ?? 0) > (hourlyUv[bestIndex] ?? 0)) bestIndex = i;
    }
    return {
      time: hourlyTimes[bestIndex],
      uv: hourlyUv[bestIndex]
    };
  }, [hourlyUv, hourlyTimes]);

  function getRiskLabel(uv) {
    if (uv >= 11) return "Extreme";
    if (uv >= 8) return "Very High";
    if (uv >= 6) return "High";
    if (uv >= 3) return "Moderate";
    return "Low";
  }

  function getRiskClass(uv) {
    if (uv >= 11) return "risk-extreme";
    if (uv >= 8) return "risk-very-high";
    if (uv >= 6) return "risk-high";
    if (uv >= 3) return "risk-moderate";
    return "risk-low";
  }

  function getProtectionMessage(uv) {
    if (uv >= 11) {
      return "UV levels are extremely high. Seek shade, minimise direct sun exposure, and use SPF 50+ protection.";
    }
    if (uv >= 8) {
      return "UV levels are very high. Use SPF 50+, wear a hat and sunglasses, and limit time in direct sun.";
    }
    if (uv >= 6) {
      return "Sun protection is recommended, especially around midday and early afternoon.";
    }
    if (uv >= 3) {
      return "Consider sun protection if you will be outdoors for an extended period.";
    }
    return "UV levels are relatively low, although protection may still be useful during longer outdoor activities.";
  }

  function estimateSkinDamageTime(uv) {
    if (uv >= 11) return "approximately 10 minutes";
    if (uv >= 8) return "approximately 15 minutes";
    if (uv >= 6) return "approximately 20 to 25 minutes";
    if (uv >= 3) return "approximately 30 to 45 minutes";
    return "more than 45 minutes";
  }

  function formatTime(dateString) {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function createReminderTimeLabel(hoursToAdd) {
    const today = new Date();
    const [hours, minutes] = reminderStart.split(":").map(Number);
    const next = new Date(today);
    next.setHours(hours, minutes, 0, 0);

    if (next <= today) {
      next.setDate(next.getDate() + 1);
    }

    next.setHours(next.getHours() + hoursToAdd);

    return next.toLocaleString("en-AU", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  async function requestBrowserNotifications() {
    if (!("Notification" in window)) {
      setBannerMessage("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      setBrowserNotificationsEnabled(true);
      setBannerMessage("Notifications have been enabled successfully.");
    } else {
      setBrowserNotificationsEnabled(false);
      setBannerMessage("Notification permission was not granted.");
    }
  }

  function sendNotification(title, body) {
    if (
      browserNotificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(title, { body });
    }
  }

  useEffect(() => {
    if (!thresholdEnabled) return;

    const hourBucket = new Date().getHours();

    if (currentUv >= uvThreshold && lastTriggeredBucket !== hourBucket) {
      const message = `UV alert: the current UV level is ${Number(
        currentUv
      ).toFixed(1)} in ${locationData.name}. Please take sun protection measures now.`;
      setBannerMessage(message);
      sendNotification("UV Alert", message);
      setLastTriggeredBucket(hourBucket);
    }

    if (currentUv < uvThreshold) {
      setLastTriggeredBucket(null);
    }
  }, [
    currentUv,
    uvThreshold,
    thresholdEnabled,
    locationData.name,
    lastTriggeredBucket,
    browserNotificationsEnabled
  ]);

  useEffect(() => {
    if (reminderTimerRef.current) {
      clearInterval(reminderTimerRef.current);
    }

    if (!reminderEnabled) {
      setNextReminder("");
      return;
    }

    setNextReminder(createReminderTimeLabel(0));

    reminderTimerRef.current = setInterval(async () => {
      const message = `It is time to reapply sunscreen to stay protected in ${locationData.name}.`;
      setBannerMessage(message);
      sendNotification("Sunscreen Reminder", message);
      setNextReminder(createReminderTimeLabel(reminderInterval));

      try {
        await fetch(`${API_BASE}/api/reminder-log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reminderTime: new Date().toISOString(),
            status: "sent"
          })
        });
      } catch (err) {
        console.error("Failed to save reminder log:", err);
      }
    }, reminderInterval * 60 * 60 * 1000);

    return () => {
      if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);
    };
  }, [
    reminderEnabled,
    reminderInterval,
    reminderStart,
    locationData.name,
    browserNotificationsEnabled
  ]);

  async function handleShare() {
    const shareText = `Current UV in ${locationData.name} is ${Number(
      currentUv
    ).toFixed(1)} (${getRiskLabel(currentUv)}). Stay sun safe.`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sun Safety Awareness Platform",
          text: shareText,
          url: shareUrl
        });
        return;
      } catch {}
    }

    await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    setBannerMessage("Share information copied to your clipboard.");
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setBannerMessage("Page link copied to your clipboard.");
  }

  const risk = getRiskLabel(currentUv);
  const timeToDamage = estimateSkinDamageTime(currentUv);
  const protectionMessage = getProtectionMessage(currentUv);
  const riskClass = getRiskClass(currentUv);
  const loading = loadingLocation || loadingWeather;

  const pageThemeClass = dynamicThemeEnabled
    ? currentUv >= 11
      ? "theme-extreme-bg"
      : currentUv >= 8
      ? "theme-very-high-bg"
      : currentUv >= 6
      ? "theme-high-bg"
      : currentUv >= 3
      ? "theme-moderate-bg"
      : "theme-low-bg"
    : "theme-default-bg";

  return (
    <div className={`app-shell ${pageThemeClass}`}>
      <div className="container">
        <nav className="navbar">
          <div>
            <p className="eyebrow">SUN SAFETY</p>
            <h1 className="site-title">Sun Safety Awareness Platform</h1>
            <p className="subtle">
              Helping you stay safe under the Australian sun.
            </p>
          </div>

          <div className="nav-buttons">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                className={page === item.key ? "nav-btn active" : "nav-btn"}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {bannerMessage && <div className="banner">{bannerMessage}</div>}

        {loading && (
          <div className="panel">
            <p>Loading your location and the latest UV information...</p>
          </div>
        )}

        {!loading && error && (
          <div className="panel error-panel">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && page === "home" && (
          <div className="page-section">
            <section className="hero-grid">
              <div className="panel">
                <div className="hero-top-row">
                  <div>
                    <p className="eyebrow">TODAY'S OVERVIEW</p>
                    <h2 className="hero-title">
                      Stay informed and protect your skin under Australia's high UV levels.
                    </h2>
                  </div>

                  <div className="location-card">
                    <p className="location-title">Your location</p>
                    <p className="location-name">{locationData.name}</p>
                    <p className="location-meta">
                      {locationData.source === "gps"
                        ? "Using your device location to provide local UV information"
                        : "Using Melbourne as the default location"}
                    </p>
                    <button onClick={detectLocationAgain} className="dark-button">
                      Update Location
                    </button>
                  </div>
                </div>

                <p className="body-text">
                  Check current UV conditions, understand when the risk is highest,
                  and take practical steps to reduce the chance of sun damage during the day.
                </p>

                <div className="badge-row">
                  <span className="badge badge-orange">Live UV updates</span>
                  <span className="badge badge-blue">Hourly UV outlook</span>
                  <span className="badge badge-green">Sun safety guidance</span>
                </div>
              </div>

              <div className={`panel uv-panel ${riskClass}`}>
                <p className="uv-subheading">Current UV summary</p>
                <div className="uv-display">
                  <span className="uv-number">{Number(currentUv).toFixed(1)}</span>
                  <span className="risk-pill">{risk}</span>
                </div>
                <p className="uv-text">
                  Unprotected skin may begin experiencing UV-related damage in {timeToDamage}.
                </p>
                <div className="uv-card">
                  <p className="uv-subheading">Recommended action</p>
                  <p className="uv-text">{protectionMessage}</p>
                </div>
              </div>
            </section>

            <section className="stats-grid four-cols">
              {[
                { title: "Location", text: locationData.name },
                { title: "Risk Category", text: risk },
                {
                  title: "Temperature",
                  text: currentTemp != null ? `${Number(currentTemp).toFixed(1)}°C` : "—"
                },
                {
                  title: "Peak Hour Today",
                  text: peakHourInfo
                    ? `${formatTime(peakHourInfo.time)} (${Number(peakHourInfo.uv).toFixed(1)})`
                    : "—"
                }
              ].map((item) => (
                <div key={item.title} className="panel small-panel">
                  <h3 className="small-title">{item.title}</h3>
                  <p className="stat-value">{item.text}</p>
                </div>
              ))}
            </section>

            <section className="panel">
              <div className="section-top-row">
                <div>
                  <h3 className="card-title">Next 24 hours UV outlook</h3>
                  <p className="small-copy">
                    See how UV levels are expected to change throughout the day.
                  </p>
                </div>
                <div className="sun-meta">
                  Sunrise {formatTime(sunrise)} · Sunset {formatTime(sunset)}
                </div>
              </div>

              <div className="chart-large">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      interval={1}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      domain={[0, Math.max(12, Math.ceil(maxHourlyValue))]}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="uv"
                      name="Hourly UV"
                      stroke="#f97316"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="clearSkyUv"
                      name="Clear-sky UV"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        )}

        {!loading && !error && page === "awareness" && (
          <div className="page-section">
            <section className="panel">
              <p className="eyebrow">LEARN MORE</p>
              <h2 className="section-title">
                Understand UV exposure and why sun protection matters
              </h2>
              <p className="body-text">
                Explore long-term health trends, seasonal UV patterns, and common myths
                so you can make safer decisions outdoors.
              </p>
            </section>

            <section className="two-col-grid">
              <div className="panel">
                <h3 className="card-title">Australian Skin Cancer Incidence Trend</h3>
                <p className="small-copy">
                  This chart shows how skin cancer incidence has changed over time in Australia.
                </p>
                <div className="chart-large">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={skinCancerTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="incidence_rate"
                        name="Incidence rate per 100,000"
                        stroke="#e11d48"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel">
                <h3 className="card-title">Melbourne Average UV Index at 2PM by Month</h3>
                <p className="small-copy">
                  This chart highlights how average UV levels change across the year in Melbourne.
                </p>
                <div className="chart-large">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyUv2pm}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avg_uv_2pm"
                        name="Average UV Index at 2PM"
                        stroke="#2563eb"
                        strokeWidth={3}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="panel">
              <h3 className="card-title">Myth vs Fact</h3>
              <div className="note-list">
                {myths.map((item) => (
                  <div key={item.myth} className="note-card">
                    <p className="myth-label">Myth</p>
                    <p className="note-text">{item.myth}</p>
                    <p className="fact-label">Fact</p>
                    <p className="note-text">{item.fact}</p>
                  </div>
                ))}
              </div>

              <div className="share-row">
                <button onClick={handleShare} className="primary-button">
                  Share
                </button>
                <button onClick={handleCopyLink} className="secondary-button">
                  Copy Link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Current UV in ${locationData.name} is ${Number(
                      currentUv
                    ).toFixed(1)}. ${window.location.href}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="whatsapp-button"
                >
                  WhatsApp
                </a>
              </div>
            </section>
          </div>
        )}

        {!loading && !error && page === "protection" && (
          <div className="page-section">
            <section className="panel">
              <div className="protection-top-row">
                <div>
                  <p className="eyebrow">PERSONAL TOOLS</p>
                  <h2 className="section-title">
                    Personalise your sun protection settings
                  </h2>
                </div>

                <div className="settings-card">
                  <div className="settings-row">
                    <div>
                      <p className="settings-title">Adaptive colour theme</p>
                      <p className="settings-copy">
                        Let the page colour reflect the current UV risk level.
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        const next = !dynamicThemeEnabled;
                        setDynamicThemeEnabled(next);
                        await savePreferences({ dynamicThemeEnabled: next });
                      }}
                      className={dynamicThemeEnabled ? "toggle-button on" : "toggle-button"}
                    >
                      {dynamicThemeEnabled ? "On" : "Off"}
                    </button>
                  </div>

                  <p className="settings-meta">
                    Current mode: {dynamicThemeEnabled ? `${risk} risk-based theme` : "Default theme"}
                  </p>
                </div>
              </div>

              <p className="body-text">
                Stay protected with personalised sun safety tools.
                Set UV alerts, receive sunscreen reminders, and get guidance based on the current UV level.
              </p>
            </section>

            <section className="stats-grid three-cols">
              <div className="panel small-panel">
                <h3 className="card-title">UV Alert</h3>
                <p className="small-copy">
                  Choose a UV level that will trigger a warning for you.
                </p>

                <label className="field-label">Alert me when UV reaches</label>
                <select
                  value={uvThreshold}
                  onChange={async (e) => {
                    const next = Number(e.target.value);
                    setUvThreshold(next);
                    await savePreferences({ uvThreshold: next });
                  }}
                  className="field-input"
                >
                  <option value={3}>3 - Moderate</option>
                  <option value={6}>6 - High</option>
                  <option value={8}>8 - Very High</option>
                  <option value={11}>11 - Extreme</option>
                </select>

                <button
                  onClick={async () => {
                    const next = !thresholdEnabled;
                    setThresholdEnabled(next);
                    await savePreferences({ thresholdEnabled: next });
                  }}
                  className={thresholdEnabled ? "dark-button full-width" : "primary-button full-width"}
                >
                  {thresholdEnabled ? "Turn Off Alert" : "Turn On Alert"}
                </button>

                <p className="field-meta">
                  Current UV: {Number(currentUv).toFixed(1)} | Alert level: {uvThreshold}
                </p>
              </div>

              <div className="panel small-panel">
                <h3 className="card-title">Sunscreen Reminder</h3>
                <p className="small-copy">
                  Schedule reminders to reapply sunscreen during the day.
                </p>

                <label className="field-label">Start time</label>
                <input
                  type="time"
                  value={reminderStart}
                  onChange={async (e) => {
                    const next = e.target.value;
                    setReminderStart(next);
                    await savePreferences({ reminderStart: next });
                  }}
                  className="field-input"
                />

                <label className="field-label">Reminder interval</label>
                <select
                  value={reminderInterval}
                  onChange={async (e) => {
                    const next = Number(e.target.value);
                    setReminderInterval(next);
                    await savePreferences({ reminderInterval: next });
                  }}
                  className="field-input"
                >
                  <option value={1}>Every 1 hour</option>
                  <option value={2}>Every 2 hours</option>
                  <option value={3}>Every 3 hours</option>
                </select>

                <button
                  onClick={async () => {
                    const next = !reminderEnabled;
                    setReminderEnabled(next);
                    await savePreferences({ reminderEnabled: next });
                  }}
                  className={reminderEnabled ? "dark-button full-width" : "info-button full-width"}
                >
                  {reminderEnabled ? "Turn Off Reminder" : "Turn On Reminder"}
                </button>

                <p className="field-meta">
                  {nextReminder ? `Next reminder: ${nextReminder}` : "No reminder scheduled."}
                </p>
              </div>

              <div className="panel small-panel">
                <h3 className="card-title">Notifications</h3>
                <p className="small-copy">
                  Allow browser notifications so alerts and reminders can appear on your device.
                </p>

                <button
                  onClick={requestBrowserNotifications}
                  className="success-button full-width"
                >
                  {browserNotificationsEnabled
                    ? "Notifications Enabled"
                    : "Enable Notifications"}
                </button>

                <div className="tip-box neutral-tip">
                  Current advice: {protectionMessage}
                </div>

                <div className="tip-box orange-tip">
                  Unprotected skin may begin experiencing damage in {timeToDamage}.
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}