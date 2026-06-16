import { API_BASE_URL, API_ENDPOINTS } from "config/api";

async function request(path) {
  const startedAt = performance.now();
  const response = await fetch(`${API_BASE_URL}${path}`);
  const duration = Math.round(performance.now() - startedAt);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
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
    key: "forecast",
    label: "Forecast Chart",
    path: API_ENDPOINTS.forecastChart,
  },
];

export const forecastApi = {
  root: () => request(API_ENDPOINTS.root),
  health: () => request(API_ENDPOINTS.health),
  getChart: () => request(API_ENDPOINTS.forecastChart),
  testEndpoint: (path) => request(path),
};
