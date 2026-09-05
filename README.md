# Stratus

A calm, minimal weather dashboard. Current conditions, the next 24 hours as one clear temperature curve, and a 7-day forecast — no clutter, no accounts, no noise.

**Live app:** <!-- TODO: add your deployed app URL here, e.g. https://your-app.freebuff.app -->
**Repository:** https://github.com/dxt-stack/simple-weather-app

## Features

- **Current conditions** — temperature, feels-like, humidity, wind (speed + direction), precipitation chance, UV index with rating, visibility, pressure, dew point, cloud cover, sunrise/sunset
- **Next 24 hours** — single temperature curve with high/low markers and plain-language hints ("Rain likely around 3 pm", "Warming — up 4° over 6 h")
- **7-day forecast** — weekday, condition icon, precipitation %, low/high with range bars scaled across the week
- **Places** — search any city (Open-Meteo geocoding), use-device-location, up to 8 saved places with one-tap switching
- **Units** — °C/°F toggle, persisted across visits
- **Freshness** — auto-refresh every 15 minutes, plus manual refresh

## Tech Stack

Vite · TypeScript · React 19 · React Router v7 · Tailwind v4 · shadcn/ui · Lucide Icons · Convex + Convex Auth · Framer Motion

## Data

All weather data comes from [Open-Meteo](https://open-meteo.com) — free for non-commercial use, no API key required.

## Run locally

```bash
bun install
bun run dev
```

The project needs `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` environment variables set (already configured in the Freebuff environment). Auth uses Convex Auth with email OTP and anonymous sign-in, both already configured.

## Project structure

```
src/
  pages/        Landing, Dashboard, Auth, NotFound
  components/   DashboardPanel, PlaceSearch, WeatherIcon, RequireAuth, ui/ (shadcn)
  lib/          weather.ts (Open-Meteo data layer), utils.ts
  hooks/        use-auth.ts, use-mobile.ts
  convex/       schema, auth, users
```
