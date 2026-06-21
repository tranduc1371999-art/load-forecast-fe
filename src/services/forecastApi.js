import { API_BASE_URL, API_ENDPOINTS } from "config/api";

async function request(path) {
  const startedAt = performance.now();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });
  const duration = Math.round(performance.now() - startedAt);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null
        ? body.message || body.error
        : body;
    throw new Error(message || `${response.status} ${response.statusText}`);
  }

  return {
    body,
    duration,
    status: response.status,
  };
}

export const forecastEndpoints = [
  { key: "root", label: "Root", path: API_ENDPOINTS.root },
  { key: "health", label: "Health", path: API_ENDPOINTS.health },
  {
    key: "hourly",
    label: "Hourly Forecast",
    path: API_ENDPOINTS.forecastHourly,
  },
  {
    key: "daily",
    label: "Daily Forecast",
    path: API_ENDPOINTS.forecastDaily,
  },
  {
    key: "monthly",
    label: "Monthly Forecast",
    path: API_ENDPOINTS.forecastMonthly,
  },
  {
    key: "metrics",
    label: "Model Metrics",
    path: API_ENDPOINTS.forecastMetrics,
  },
];

export const forecastApi = {
  root: () => request(API_ENDPOINTS.root),
  health: () => request(API_ENDPOINTS.health),
  getChart: (period = "hourly") => {
    const paths = {
      daily: API_ENDPOINTS.forecastDaily,
      hourly: API_ENDPOINTS.forecastHourly,
      monthly: API_ENDPOINTS.forecastMonthly,
    };

    return request(paths[period] || API_ENDPOINTS.forecastHourly);
  },
  getMetrics: () => request(API_ENDPOINTS.forecastMetrics),
  getRealtimeStreamUrl: (params = {}) => {
    const search = new URLSearchParams(params);
    const query = search.toString();

    return `${API_BASE_URL}${API_ENDPOINTS.realtimeStream}${query ? `?${query}` : ""}`;
  },
  testEndpoint: (path) => request(path),
};
