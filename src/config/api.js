export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

export const API_ENDPOINTS = {
  root: "/",
  health: "/api/health",
  forecastHourly: "/api/forecast/hourly",
  forecastDaily: "/api/forecast/daily",
  forecastMonthly: "/api/forecast/monthly",
  forecastMetrics: "/api/forecast/metrics",
  realtimeStream: "/api/realtime/stream",
};
