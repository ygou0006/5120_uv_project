const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

let preferences = {
  uvThreshold: 8,
  thresholdEnabled: false,
  dynamicThemeEnabled: true,
  reminderEnabled: false,
  reminderStart: "10:00",
  reminderInterval: 2
};

const mythFacts = [
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

app.get("/", (req, res) => {
  res.json({ message: "Sun Safety backend is running." });
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

app.get("/api/preferences", (req, res) => {
  res.json(preferences);
});

app.post("/api/preferences", (req, res) => {
  preferences = {
    ...preferences,
    ...req.body
  };

  res.json({
    message: "Preferences saved successfully",
    preferences
  });
});

app.get("/api/myths", (req, res) => {
  res.json(mythFacts);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});