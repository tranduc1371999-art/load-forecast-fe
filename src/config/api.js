export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

export const API_ENDPOINTS = {
  root: "/",
  health: "/api/health",
  forecastShortTerm15Min: "/api/forecast/short-term/15min",
  forecastShortTermHourly: "/api/forecast/short-term/hourly",
  forecastMediumTermDaily: "/api/forecast/medium-term/daily",
  forecastMediumTermMonthly: "/api/forecast/medium-term/monthly",
  forecastLongTermMonthly: "/api/forecast/long-term/monthly",
  forecastLongTermScenarios: "/api/forecast/long-term/scenarios",
  forecastMetrics: "/api/forecast/metrics",
  realtimeStream: "/api/realtime/stream",
};
