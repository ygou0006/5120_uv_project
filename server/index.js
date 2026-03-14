const express = require("express");
const cors = require("cors");
const axios = require("axios");
const db = require("./db");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Sun Safety backend is running." });
});

app.get("/api/reverse-geocode", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lng}&language=en&format=json`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Reverse geocode error:", error.message);
    res.status(500).json({ error: "Failed to reverse geocode location" });
  }
});

app.get("/api/uv", async (req, res) => {
  try {
    const { lat, lng, timezone = "Australia/Melbourne" } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=uv_index,temperature_2m` +
      `&hourly=uv_index,uv_index_clear_sky` +
      `&daily=uv_index_max,uv_index_clear_sky_max,sunrise,sunset` +
      `&timezone=${encodeURIComponent(timezone)}` +
      `&forecast_days=7` +
      `&forecast_hours=24`;

    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("UV API error:", error.message);
    res.status(500).json({ error: "Failed to fetch UV data" });
  }
});

app.get("/api/preferences", (req, res) => {
  db.get(
    `SELECT 
      up.uv_threshold,
      up.threshold_enabled,
      up.dynamic_theme_enabled,
      rs.start_time AS reminder_start,
      rs.interval_hours AS reminder_interval,
      rs.enabled AS reminder_enabled
     FROM user_preferences up
     LEFT JOIN reminder_settings rs ON up.user_id = rs.user_id
     WHERE up.user_id = 1`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || {});
    }
  );
});

app.post("/api/preferences", (req, res) => {
  const {
    uvThreshold,
    thresholdEnabled,
    dynamicThemeEnabled,
    reminderEnabled,
    reminderStart,
    reminderInterval
  } = req.body;

  db.serialize(() => {
    db.run(
      `UPDATE user_preferences
       SET uv_threshold = ?, threshold_enabled = ?, dynamic_theme_enabled = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = 1`,
      [
        uvThreshold ?? 8,
        thresholdEnabled ? 1 : 0,
        dynamicThemeEnabled ? 1 : 0
      ]
    );

    db.run(
      `UPDATE reminder_settings
       SET start_time = ?, interval_hours = ?, enabled = ?
       WHERE user_id = 1`,
      [
        reminderStart ?? "10:00",
        reminderInterval ?? 2,
        reminderEnabled ? 1 : 0
      ],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Preferences saved successfully" });
      }
    );
  });
});

app.post("/api/reminder-log", (req, res) => {
  const { reminderTime, status } = req.body;

  db.run(
    `INSERT INTO reminder_logs (user_id, reminder_time, status)
     VALUES (1, ?, ?)`,
    [reminderTime, status || "sent"],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Reminder log saved", id: this.lastID });
    }
  );
});

app.get("/api/myths", (req, res) => {
  const myths = [
    {
      myth: "Cloudy days are safe from UV radiation.",
      fact: "UV radiation can still damage skin on cloudy days, so protection is still important."
    },
    {
      myth: "Only very hot days are dangerous.",
      fact: "UV risk is related to radiation levels, not just temperature, so cool days can still be harmful."
    },
    {
      myth: "Young adults do not need to worry about skin damage.",
      fact: "Repeated UV exposure in early adulthood can contribute to long-term skin damage and skin cancer risk."
    }
  ];
  res.json(myths);
});

app.get("/api/skin-cancer-trend", (req, res) => {
  db.all(
    "SELECT year, incidence_rate FROM skin_cancer_trend ORDER BY year",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/api/monthly-uv-2pm", (req, res) => {
  db.all(
    "SELECT month, avg_uv_2pm FROM monthly_uv_2pm ORDER BY month",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});