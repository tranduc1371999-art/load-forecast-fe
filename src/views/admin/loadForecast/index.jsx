import {
  Box,
  Flex,
  HStack,
  Text,
} from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";
import { forecastApi } from "services/forecastApi";

const palette = {
  border: "#3a3f39",
  text: "#fbfbf2",
  muted: "#a6aaa1",
  green: "#9fdcb5",
  yellow: "#ecd083",
  red: "#e08b8b",
};

const forecastPeriods = [
  { key: "shortTermHourly", label: "Short-Term Hourly" },
  { key: "mediumTermDaily", label: "Medium-Term Daily" },
  { key: "longTermMonthly", label: "Long-Term Monthly" },
];

const FORECAST_REFRESH_DELAY_MS = 30 * 1000;

function getMsUntilNextForecastRefresh(now = new Date()) {
  const next = new Date(now);
  const minutes = next.getMinutes();
  const nextQuarter = Math.floor(minutes / 15) * 15 + 15;

  next.setMinutes(nextQuarter, 0, FORECAST_REFRESH_DELAY_MS);

  return Math.max(next.getTime() - now.getTime(), FORECAST_REFRESH_DELAY_MS);
}

function getValue(source, keys, fallback) {
  if (!source || typeof source !== "object") return fallback;
  const key = keys.find((item) => source[item] !== undefined && source[item] !== null);
  return key ? source[key] : fallback;
}

function numberOrFallback(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeSeriesData(value) {
  if (Array.isArray(value)) {
    return value.map((item) => numberOrFallback(item, 0));
  }

  if (value && Array.isArray(value.data)) {
    return value.data.map((item) => numberOrFallback(item, 0));
  }

  return null;
}

function findSeries(series, names, fallbackIndex) {
  if (!Array.isArray(series)) return null;
  const matched = series.find((item) =>
    names.some((name) => String(item?.name || "").toLowerCase().includes(name)),
  );
  return normalizeSeriesData(matched || series[fallbackIndex]);
}

function getRecordNumber(record, keys) {
  const value = getValue(record, keys, null);
  return value === null ? null : numberOrFallback(value, null);
}

function buildSeriesFromRecords(records) {
  if (!Array.isArray(records) || records.length === 0) return null;

  const pairs = records
    .map((record) => ({
      actual: getRecordNumber(record, [
        "actual_load",
        "actualLoad",
        "Actual Load",
        "actual_avg_load",
        "actualAvgLoad",
        "actual_peak_load",
        "actualPeakLoad",
        "actual",
      ]),
      forecast: getRecordNumber(record, [
        "forecast_load",
        "forecastLoad",
        "Forecast Load",
        "forecast_avg_load",
        "forecastAvgLoad",
        "forecast_peak_load",
        "forecastPeakLoad",
        "forecast",
        "prediction",
      ]),
      timestamp: getValue(record, ["Timestamp", "timestamp", "time", "date"], ""),
    }))
    .filter((point) => point.forecast !== null);

  const actual = pairs.map((point) => point.actual);
  const forecast = pairs.map((point) => point.forecast);
  const labels = pairs.map((point) => point.timestamp);

  if (!forecast.length) return null;

  return {
    actual,
    forecast,
    labels,
  };
}

function normalizeForecastChart(rawBody) {
  const records = Array.isArray(rawBody?.data) ? rawBody.data : Array.isArray(rawBody) ? rawBody : null;
  const payload = rawBody || {};
  const chart = payload.behaviorSummary || payload.behavior || payload.mainChart || payload.chart || payload;
  const series = chart.series || payload.series;
  const recordSeries = buildSeriesFromRecords(records);
  const forecast =
    recordSeries?.forecast ||
    normalizeSeriesData(chart.forecast) ||
    normalizeSeriesData(chart.red) ||
    findSeries(series, ["forecast", "predict", "load"], 1) ||
    findSeries(series, ["forecast", "predict", "load"], 0);
  const actual =
    recordSeries?.actual ||
    normalizeSeriesData(chart.actual) ||
    normalizeSeriesData(chart.orange) ||
    findSeries(series, ["actual"], 0);

  return {
    behaviorSeries: forecast
      ? {
          actual,
          forecast,
          labels: recordSeries?.labels || [],
        }
      : null,
  };
}

function makeLinePath(values, width, height, padX = 0, padY = 0, max = 100, min = 0) {
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;
  return values
    .map((value, index) => {
      const x = padX + (index / Math.max(values.length - 1, 1)) * innerWidth;
      const normalized = (value - min) / (max - min);
      const y = padY + (1 - normalized) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function getPoint(values, index, width, height, padX, padY, max, min) {
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;
  const x = padX + (index / Math.max(values.length - 1, 1)) * innerWidth;
  const normalized = (values[index] - min) / (max - min);
  const y = padY + (1 - normalized) * innerHeight;
  return { x, y };
}

function formatLoadValue(value) {
  if (value === null || value === undefined) return "--";
  const number = Number(value);

  if (!Number.isFinite(number)) return "--";

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

function formatTimestampLabel(value) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function hasCompleteActualSeries(series) {
  return (
    Array.isArray(series?.actual) &&
    Array.isArray(series?.forecast) &&
    series.actual.length === series.forecast.length &&
    series.actual.every((value) => Number.isFinite(Number(value)))
  );
}

function ChartMotionStyles() {
  return (
    <Box
      sx={{
        "@keyframes fleetLineDraw": {
          "0%": { strokeDashoffset: 1, opacity: 0.35 },
          "100%": { strokeDashoffset: 0, opacity: 1 },
        },
        "@keyframes fleetBarRise": {
          "0%": { opacity: 0, transform: "scaleY(0.35)" },
          "100%": { opacity: 1, transform: "scaleY(1)" },
        },
        ".fleet-line": {
          animation: "fleetLineDraw 1.25s ease-out both",
          strokeDasharray: 1,
          strokeDashoffset: 1,
        },
        ".fleet-line-secondary": {
          animationDelay: "0.16s",
        },
        ".fleet-bg-bar": {
          animation: "fleetBarRise 0.75s ease-out both",
          transformBox: "fill-box",
          transformOrigin: "bottom",
        },
        ".fleet-chart text": {
          fontFamily: "'Inter', 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontFeatureSettings: "'cv02', 'cv03', 'cv04', 'cv11'",
          letterSpacing: "0",
        },
      }}
    />
  );
}

function buildMainSeries() {
  const orange = [];
  const red = [];

  for (let index = 0; index < 98; index += 1) {
    const firstSlope = Math.max(0, 38 - index * 0.35);
    const seasonal = Math.sin(index / 5.7) * 3.2 + Math.cos(index / 11) * 2.4;
    const endDrop = index > 82 ? (index - 82) * 0.82 : 0;
    const redLift = index < 23 ? 18 : 17 - (index - 23) * 0.16;

    orange.push(Math.max(8, Math.round(firstSlope + seasonal + 9 - endDrop)));
    red.push(
      Math.max(
        5,
        Math.round(
          redLift + Math.sin(index / 8) * 2.7 + Math.cos(index / 3.3) * 1.2,
        ),
      ),
    );
  }

  return { orange, red };
}

function MainBehaviorChart({ data, showActual = true }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const seriesData = useMemo(() => data || buildMainSeries(), [data]);
  const forecastValues = seriesData.forecast || seriesData.red || seriesData.orange;
  const actualValues = seriesData.actual || seriesData.orange;
  const hasActual =
    showActual &&
    hasCompleteActualSeries({
      actual: actualValues,
      forecast: forecastValues,
    });
  const width = 880;
  const height = 264;
  const bars = useMemo(
    () =>
      Array.from({ length: 92 }, (_, index) => ({
        h: 12 + ((index * 17) % 34),
        x: 31 + index * 8.8,
      })),
    [],
  );
  const verticalGuides = useMemo(
    () => Array.from({ length: 13 }, (_, index) => 62 + index * 71),
    [],
  );
  const chartRange = useMemo(() => {
    const values = hasActual ? [...actualValues, ...forecastValues] : [...forecastValues];
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = Math.max((maxValue - minValue) * 0.18, maxValue * 0.01, 1);

    return {
      max: Math.ceil(maxValue + padding),
      min: Math.max(0, Math.floor(minValue - padding)),
    };
  }, [actualValues, forecastValues, hasActual]);
  const midValue = Math.round((chartRange.min + chartRange.max) / 2);
  const firstLabel = formatTimestampLabel(seriesData.labels?.[0]) || "Start";
  const lastLabel = formatTimestampLabel(seriesData.labels?.[seriesData.labels.length - 1]) || "End";
  const actualPath = hasActual ? makeLinePath(actualValues, width, height, 29, 24, chartRange.max, chartRange.min) : "";
  const forecastPath = makeLinePath(forecastValues, width, height, 29, 24, chartRange.max, chartRange.min);
  const hoverActual = hasActual && hoverIndex !== null ? getPoint(actualValues, hoverIndex, width, height, 29, 24, chartRange.max, chartRange.min) : null;
  const hoverForecast = hoverIndex === null ? null : getPoint(forecastValues, hoverIndex, width, height, 29, 24, chartRange.max, chartRange.min);
  const tooltipX = hoverForecast ? Math.min(Math.max(hoverForecast.x + 10, 36), width - 158) : 0;
  const tooltipY = hoverForecast ? Math.max(Math.min(hoverForecast.y - 44, height - 70), 16) : 0;

  return (
    <Box h={{ base: "300px", lg: "258px" }} position="relative">
      <ChartMotionStyles />
      <svg className="fleet-chart" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} width="100%">
        <rect fill="transparent" height={height} width={width} />
        {Array.from({ length: 150 }, (_, index) => (
          <line
            key={`stripe-${index}`}
            stroke="#252a25"
            strokeOpacity={index % 5 === 0 ? "1" : "0.58"}
            strokeWidth="1"
            x1={29 + index * 5.8}
            x2={29 + index * 5.8}
            y1="13"
            y2="218"
          />
        ))}
        {verticalGuides.map((x) => (
          <line key={x} stroke="#4b514a" strokeDasharray="2 3" strokeOpacity="0.95" strokeWidth="1" x1={x} x2={x} y1="12" y2="218" />
        ))}
        <line stroke="#464c45" strokeDasharray="4 4" strokeWidth="1" x1="29" x2="858" y1="112" y2="112" />
        <line stroke="#383e37" strokeDasharray="4 4" strokeWidth="1" x1="29" x2="858" y1="217" y2="217" />
        {bars.map((bar, index) => (
          <rect
            className="fleet-bg-bar"
            fill="#323831"
            fillOpacity="0.75"
            height={bar.h}
            key={index}
            style={{ animationDelay: `${index * 0.006}s` }}
            width="3"
            x={bar.x}
            y={218 - bar.h}
          />
        ))}
        <text fill={palette.muted} fontSize="10" x="0" y="18">{formatLoadValue(chartRange.max)}</text>
        <text fill={palette.muted} fontSize="10" x="0" y="115">{formatLoadValue(midValue)}</text>
        <text fill={palette.muted} fontSize="10" x="0" y="220">{formatLoadValue(chartRange.min)}</text>
        {hasActual ? (
          <path className="fleet-line" d={actualPath} fill="none" pathLength="1" stroke="#eee4aa" strokeOpacity="0.95" strokeWidth="1.35" />
        ) : null}
        <path className="fleet-line fleet-line-secondary" d={forecastPath} fill="none" pathLength="1" stroke={palette.red} strokeOpacity="1" strokeWidth="1.55" />
        <text fill={palette.muted} fontSize="10" x="29" y="244">{firstLabel}</text>
        <text fill={palette.muted} fontSize="10" textAnchor="end" x="858" y="244">{lastLabel}</text>
        {forecastValues.map((_, index) => (
          <rect
            fill="transparent"
            height="218"
            key={index}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseMove={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            width={width / forecastValues.length}
            x={(index / forecastValues.length) * width}
            y="0"
          />
        ))}
        {hoverForecast ? (
          <g pointerEvents="none">
            <line stroke="#899087" strokeDasharray="2 3" strokeOpacity="0.96" strokeWidth="1" x1={hoverForecast.x} x2={hoverForecast.x} y1="12" y2="218" />
            {hoverActual ? (
              <circle cx={hoverActual.x} cy={hoverActual.y} fill="#d5d0a3" r="3" stroke="#101110" strokeWidth="1.3" />
            ) : null}
            <circle cx={hoverForecast.x} cy={hoverForecast.y} fill={palette.red} r="3" stroke="#101110" strokeWidth="1.3" />
            <rect fill="#0b0d0b" height={hasActual ? "56" : "42"} opacity="0.97" rx="3" stroke={palette.border} width="146" x={tooltipX} y={tooltipY} />
            <text fill={palette.text} fontSize="9" fontWeight="700" x={tooltipX + 8} y={tooltipY + 14}>
              {formatTimestampLabel(seriesData.labels?.[hoverIndex]) || `Point ${hoverIndex + 1}`}
            </text>
            {hasActual ? (
              <text fill="#eee4aa" fontSize="9" x={tooltipX + 8} y={tooltipY + 31}>{`Actual ${formatLoadValue(actualValues[hoverIndex])}`}</text>
            ) : null}
            <text fill={palette.red} fontSize="9" x={tooltipX + 8} y={hasActual ? tooltipY + 44 : tooltipY + 31}>{`Forecast ${formatLoadValue(forecastValues[hoverIndex])}`}</text>
          </g>
        ) : null}
      </svg>
      <HStack bottom="2px" color={palette.muted} fontSize="10px" left="0" position="absolute" spacing="20px">
        {hasActual ? (
          <HStack spacing="5px">
            <Box bg="#eee4aa" borderRadius="50%" h="5px" w="5px" />
            <Text>Actual Load</Text>
          </HStack>
        ) : null}
        <HStack spacing="5px">
          <Box bg={palette.red} borderRadius="50%" h="5px" w="5px" />
          <Text>Forecast Load</Text>
        </HStack>
      </HStack>
    </Box>
  );
}

function ForecastChartPanel({ data, error, loading, showActual = true, title }) {
  return (
    <Box
      bg="linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0))"
      borderBottom={`1px solid ${palette.border}`}
      boxShadow="inset 0 1px 0 rgba(255,255,255,0.03)"
      p="18px 20px 9px"
    >
      <Flex align="center" justify="space-between" mb="8px">
        <Text color={palette.text} fontSize="14px" fontWeight="700">
          {title}
        </Text>
        {loading ? (
          <Text color={palette.yellow} fontSize="9px">
            LOADING DATA
          </Text>
        ) : error ? (
          <Text color={palette.red} fontSize="9px">
            DATA UNAVAILABLE
          </Text>
        ) : (
          <Text color={palette.green} fontSize="9px">
            LIVE DATA
          </Text>
        )}
      </Flex>
      {error ? (
        <Text color={palette.muted} fontSize="11px" mb="4px">
          BE unavailable: {error}
        </Text>
      ) : null}
      {data ? (
        <MainBehaviorChart data={data} showActual={showActual} />
      ) : (
        <Flex align="center" h={{ base: "300px", lg: "258px" }} justify="center">
          <Text color={palette.muted} fontSize="12px">
            {loading ? "Loading forecast data..." : "No forecast data to display"}
          </Text>
        </Flex>
      )}
    </Box>
  );
}

export default function LoadForecastDashboard() {
  const [chartDataByPeriod, setChartDataByPeriod] = useState({});
  const [chartErrors, setChartErrors] = useState({});
  const [apiState, setApiState] = useState({
    error: "",
    loadedAt: null,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadForecastCharts(showLoading = false) {
      if (showLoading) {
        setApiState({
          error: "",
          loadedAt: null,
          loading: true,
        });
      }

      const results = await Promise.allSettled(
        forecastPeriods.map(async (item) => {
          const { body } = await forecastApi.getChart(item.key);
          return [item.key, normalizeForecastChart(body).behaviorSeries];
        }),
      );

      if (!isMounted) return;

      const nextData = {};
      const nextErrors = {};

      results.forEach((result, index) => {
        const key = forecastPeriods[index].key;

        if (result.status === "fulfilled") {
          const [, data] = result.value;
          nextData[key] = data;
          if (!data) nextErrors[key] = "No valid forecast load data";
        } else {
          nextData[key] = null;
          nextErrors[key] = result.reason?.message || "Can not load forecast data";
        }
      });

      setChartDataByPeriod(nextData);
      setChartErrors(nextErrors);
      setApiState({
        error: Object.keys(nextErrors).length ? "Some charts failed to load" : "",
        loadedAt: new Date(),
        loading: false,
      });
    }

    loadForecastCharts(true);
    let refreshTimer;

    function scheduleNextRefresh() {
      refreshTimer = setTimeout(async () => {
        await loadForecastCharts(false);
        if (isMounted) scheduleNextRefresh();
      }, getMsUntilNextForecastRefresh());
    }

    scheduleNextRefresh();

    return () => {
      isMounted = false;
      clearTimeout(refreshTimer);
    };
  }, []);

  return (
    <Box>
      <Box px="0">
        {forecastPeriods.map((item) => (
          <ForecastChartPanel
            data={chartDataByPeriod[item.key]}
            error={chartErrors[item.key]}
            key={item.key}
            loading={apiState.loading}
            showActual={false}
            title={`${item.label} Load Forecast Chart`}
          />
        ))}
      </Box>
    </Box>
  );
}
