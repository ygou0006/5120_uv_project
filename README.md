# Sun Safety Awareness Platform

A full-stack web application designed to help users understand UV exposure risks, monitor real-time UV conditions, and take practical sun protection actions.

## Project Overview

The **Sun Safety Awareness Platform** is designed to support safer outdoor decision-making under Australia's high UV conditions. The system combines:

- real-time local UV monitoring
- hourly UV trend visualisation
- UV alert settings
- sunscreen reminder tools
- educational awareness content
- data-driven charts using a relational database

The platform aims to go beyond a simple weather display by helping users both **understand UV risk** and **respond to it**.

---

## Key Features

### 1. Real-Time UV Monitoring
- Detects the user's current location through browser geolocation
- Retrieves live UV data using an external weather API
- Displays the current UV index, UV risk category, and temperature
- Shows the expected time to skin damage if unprotected

### 2. Hourly UV Forecast
- Displays a 24-hour UV outlook using a line chart
- Helps users identify peak UV periods during the day
- Includes both hourly UV and clear-sky UV values

### 3. UV Alerts
- Users can define a UV threshold
- The system warns users when the current UV reaches or exceeds the selected level

### 4. Sunscreen Reminders
- Users can set a sunscreen reminder start time
- Users can choose a reminder interval
- Reminder actions are logged in the database

### 5. Browser Notifications
- Supports browser-based notifications for alerts and reminders
- Includes a **Send Test Notification** button for demonstration and testing

### 6. Awareness and Education
- Includes a **Myth vs Fact** section about UV exposure
- Shows a chart of **Australian Skin Cancer Incidence Trend**
- Shows a chart of **Melbourne Average UV Index at 2PM by Month**

### 7. Adaptive Theme
- The page colour can change based on the current UV level
- Users can turn the adaptive theme on or off

---

## System Architecture

This project uses a **front-end / back-end separated architecture**.

### Frontend
- React
- Vite
- Recharts

### Backend
- Node.js
- Express

### Database
- SQLite

### External APIs
- Open-Meteo Forecast API
- Open-Meteo Reverse Geocoding API

---

## Project Structure

```text
sun-safety-fullstack/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── index.css
│
└── server/
    ├── data/
    │   └── skin_cancer_trend.xlsx
    ├── package.json
    ├── db.js
    ├── init.sql
    ├── initDb.js
    ├── importSkinCancerTrend.js
    └── index.js
