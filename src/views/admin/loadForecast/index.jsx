import {
  Badge,
  Box,
  Flex,
  Grid,
  GridItem,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";
import { forecastApi } from "services/forecastApi";

const palette = {
  border: "#3a3f39",
  text: "#fbfbf2",
  muted: "#a6aaa1",
  faint: "#6b7068",
  green: "#9fdcb5",
  yellow: "#ecd083",
  red: "#e08b8b",
};

const activeFleet = [
  { label: "On Route", value: 87, color: palette.green },
  { label: "Break", value: 8, color: palette.yellow },
  { label: "Connection Lost", value: 5, color: palette.red },
];

const aggressiveDrivers = [
  { name: "Andrew L. (853-CDE)", yellow: 83, red: 28 },
  { name: "Jason S. (AB12-CDE)", yellow: 62, red: 34 },
  { name: "Eugene M. (753-CBA)", yellow: 68, red: 24 },
  { name: "Davis W. (AV27-CBA)", yellow: 74, red: 22 },
];

const defaultEfficiencyRows = [
  { km: 46, fuel: 52 },
  { km: 64, fuel: 49 },
  { km: 61, fuel: 47 },
  { km: 63, fuel: 62 },
];

const defaultMetrics = {
  driversWithFlags: { value: 97, change: "+ 2.7%" },
  alerts: { value: 184, change: "+ 4.5%" },
  tasksProgress: { value: 194, total: 381 },
};

const defaultModelMetrics = {
  mae: null,
  rmse: null,
  mape: null,
};

const forecastPeriods = [
  { key: "daily", label: "Daily" },
  { key: "monthly", label: "Monthly" },
];

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
  const metrics = payload.metrics || payload.summary || {};
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
  const activeFleetData = payload.activeFleet || payload.active_fleet;
  const aggressiveDriversData = payload.aggressiveDrivers || payload.aggressive_drivers;
  const efficiencyData = payload.driversEfficiency || payload.drivers_efficiency;

  return {
    metrics: {
      driversWithFlags: {
        value: numberOrFallback(
          getValue(metrics, ["driversWithFlags", "drivers_with_flags", "flaggedDrivers"], undefined),
          defaultMetrics.driversWithFlags.value,
        ),
        change: getValue(metrics, ["driversWithFlagsChange", "drivers_with_flags_change"], defaultMetrics.driversWithFlags.change),
      },
      alerts: {
        value: numberOrFallback(getValue(metrics, ["alerts", "alertCount", "alert_count"], undefined), defaultMetrics.alerts.value),
        change: getValue(metrics, ["alertsChange", "alerts_change"], defaultMetrics.alerts.change),
      },
      tasksProgress: {
        value: numberOrFallback(getValue(metrics, ["tasksProgress", "tasks_progress", "completedTasks"], undefined), defaultMetrics.tasksProgress.value),
        total: numberOrFallback(getValue(metrics, ["tasksTotal", "tasks_total", "totalTasks"], undefined), defaultMetrics.tasksProgress.total),
      },
    },
    behaviorSeries: forecast ? { actual, forecast, labels: recordSeries?.labels || [] } : null,
    activeFleet: Array.isArray(activeFleetData)
      ? activeFleetData.map((item, index) => ({
          label: getValue(item, ["label", "name", "status"], activeFleet[index]?.label || `Status ${index + 1}`),
          value: numberOrFallback(getValue(item, ["value", "percent", "percentage"], activeFleet[index]?.value || 0), 0),
          color: getValue(item, ["color"], activeFleet[index]?.color || palette.green),
        }))
      : null,
    aggressiveDrivers: Array.isArray(aggressiveDriversData)
      ? aggressiveDriversData.map((item) => ({
          name: getValue(item, ["name", "driver", "driverName"], "Unknown driver"),
          yellow: numberOrFallback(getValue(item, ["yellow", "orange", "warning"], 0), 0),
          red: numberOrFallback(getValue(item, ["red", "critical"], 0), 0),
        }))
      : null,
    driversEfficiency: Array.isArray(efficiencyData)
      ? efficiencyData.map((item) => ({
          km: numberOrFallback(getValue(item, ["km", "kmPerDay", "km_per_day"], 0), 0),
          fuel: numberOrFallback(getValue(item, ["fuel", "fuelPer100Km", "fuel_per_100_km"], 0), 0),
        }))
      : null,
  };
}

function normalizeModelMetrics(rawBody) {
  const payload = rawBody?.metrics || rawBody?.data?.metrics || rawBody?.data || rawBody || {};

  return {
    mae: getRecordNumber(payload, ["MAE", "mae", "mean_absolute_error"]),
    rmse: getRecordNumber(payload, ["RMSE", "rmse", "root_mean_squared_error"]),
    mape: getRecordNumber(payload, ["MAPE", "mape", "mean_absolute_percentage_error"]),
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
  });
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

function ThinBar({ color, value }) {
  return (
    <Box bg="#2a2e29" h="4px" overflow="hidden" position="relative" w="100%">
      <Box bg={color} h="100%" opacity="1" w={`${value}%`} />
      <Box bg="#0f110f" bottom="0" left="0" opacity="0.22" position="absolute" top="0" w="100%" />
    </Box>
  );
}

function MetricCard({ title, value, suffix, change, children }) {
  return (
    <Box
      bg="linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0))"
      borderRight={{ base: "0", xl: `1px solid ${palette.border}` }}
      boxShadow="inset 0 1px 0 rgba(255,255,255,0.035)"
      minH="188px"
      p="19px 20px"
    >
      <Flex align="start" justify="space-between">
        <Box>
          <Text color={palette.muted} fontSize="11px">
            {title}
          </Text>
          <HStack align="baseline" mt="5px" spacing="7px">
            <Text color={palette.text} fontSize="24px" fontWeight="500" lineHeight="1">
              {value}
            </Text>
            {suffix ? (
              <Text color={palette.text} fontSize="11px">
                {suffix}
              </Text>
            ) : null}
            {change ? (
              <Badge bg="rgba(138,196,160,0.18)" color={change.includes("-") ? palette.red : palette.green} fontSize="9px">
                {change}
              </Badge>
            ) : null}
          </HStack>
        </Box>
        <Text color={palette.muted} fontSize="9px">
          TODAY +
        </Text>
      </Flex>
      <Box h="116px" mt="15px">
        {children}
      </Box>
    </Box>
  );
}

function ModelMetricCard({ title, value, suffix }) {
  const displayValue = value === null || value === undefined ? "--" : formatLoadValue(value);

  return (
    <Box
      bg="linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0))"
      borderRight={{ base: "0", xl: `1px solid ${palette.border}` }}
      boxShadow="inset 0 1px 0 rgba(255,255,255,0.035)"
      minH="112px"
      p="19px 20px"
    >
      <Text color={palette.muted} fontSize="11px">
        {title}
      </Text>
      <HStack align="baseline" mt="12px" spacing="7px">
        <Text color={palette.text} fontSize="30px" fontWeight="500" lineHeight="1">
          {displayValue}
        </Text>
        {suffix ? (
          <Text color={palette.muted} fontSize="11px">
            {suffix}
          </Text>
        ) : null}
      </HStack>
    </Box>
  );
}

function FlagBars() {
  const bars = [
    { label: "68%", color: palette.green, h: "78px", w: "66%" },
    { label: "17%", color: palette.yellow, h: "78px", w: "15%" },
    { label: "15%", color: palette.red, h: "78px", w: "11%" },
  ];

  return (
    <Flex align="end" gap="8px" h="100%">
      {bars.map((bar) => (
        <Box flex={bar.w} key={bar.label}>
          <Text color={palette.text} fontSize="10px" mb="5px">
            {bar.label}
          </Text>
          <Box borderLeft={`1px solid ${palette.faint}`} h={bar.h} position="relative">
            <Box bg="#30352f" bottom="0" h="4px" left="0" opacity="1" position="absolute" right="0" />
            <Box bg={bar.color} bottom="0" h="3px" left="0" opacity="1" position="absolute" right="0" />
          </Box>
        </Box>
      ))}
    </Flex>
  );
}

function SmallLineChart({ redZone = false, up = false }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const main = up
    ? [8, 9, 12, 13, 18, 20, 24, 28, 32, 36, 39, 42, 48, 51, 53, 55, 55, 56, 56, 59, 61, 63, 67, 72, 74, 76, 84, 95]
    : [12, 14, 18, 13, 52, 16, 18, 20, 21, 19, 16, 22, 17, 20, 18, 15, 19, 17, 16, 20, 19, 18, 21, 55, 17, 22, 17, 14];
  const secondary = up
    ? [6, 8, 9, 11, 16, 20, 22, 25, 30, 35, 39, 43, 47, 52, 57, 61, 66, 69, 71, 73, 76, 79, 82, 86, 90, 93, 96, 100]
    : [6, 8, 12, 9, 26, 11, 13, 17, 32, 15, 18, 16, 20, 19, 14, 15, 12, 13, 20, 18, 17, 14, 11, 16, 15, 13, 18, 9];
  const width = 292;
  const height = 104;
  const mainPath = makeLinePath(main, width, height, 24, 8, 100, 0);
  const secondaryPath = makeLinePath(secondary, width, height, 24, 8, 100, 0);
  const hoverMain = hoverIndex === null ? null : getPoint(main, hoverIndex, width, height, 24, 8, 100, 0);
  const hoverSecondary = hoverIndex === null ? null : getPoint(secondary, hoverIndex, width, height, 24, 8, 100, 0);
  const tooltipX = hoverMain ? Math.min(Math.max(hoverMain.x - 35, 6), width - 76) : 0;
  const tooltipY = hoverMain ? Math.max(Math.min(hoverMain.y - 38, height - 38), 4) : 0;
  const redRects = redZone
    ? [
        { x: 76, width: 10 },
        { x: 245, width: 12 },
      ]
    : [{ x: 116, width: 56 }];

  return (
    <Box h="100%" position="relative">
      <ChartMotionStyles />
      <svg className="fleet-chart" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} width="100%">
        <line stroke="#363c35" strokeDasharray="3 5" strokeWidth="1" x1="24" x2="292" y1="21" y2="21" />
        <line stroke="#363c35" strokeDasharray="3 5" strokeWidth="1" x1="24" x2="292" y1="52" y2="52" />
        <line stroke="#363c35" strokeDasharray="3 5" strokeWidth="1" x1="24" x2="292" y1="85" y2="85" />
        {redRects.map((rect) => (
          <rect fill={palette.red} fillOpacity="0.18" height="73" key={rect.x} width={rect.width} x={rect.x} y="15" />
        ))}
        {redZone ? (
          <path d="M 52 85 L 76 30 L 100 86 Z" fill="#8a8f86" fillOpacity="0.36" />
        ) : null}
        <text fill={palette.muted} fontSize="9" x="0" y="23">100%</text>
        <text fill={palette.muted} fontSize="9" x="5" y="54">50%</text>
        <text fill={palette.muted} fontSize="9" x="13" y="88">0</text>
        {!redZone ? (
          <text fill={palette.text} fontSize="9" fontWeight="700" x="184" y="24">51%</text>
        ) : null}
        <path className="fleet-line" d={secondaryPath} fill="none" pathLength="1" stroke="#eee4aa" strokeOpacity="0.9" strokeWidth="1.25" />
        <path className="fleet-line fleet-line-secondary" d={mainPath} fill="none" pathLength="1" stroke={palette.green} strokeOpacity="0.92" strokeWidth="1.35" />
        {!redZone ? (
          <line stroke={palette.red} strokeDasharray="3 3" strokeWidth="1" x1="194" x2="194" y1="15" y2="88" />
        ) : (
          <line stroke="#5f625b" strokeDasharray="2 3" strokeWidth="1" x1="284" x2="284" y1="15" y2="88" />
        )}
        {main.map((_, index) => (
          <rect
            fill="transparent"
            height={height}
            key={index}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseMove={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            width={width / main.length}
            x={(index / main.length) * width}
            y="0"
          />
        ))}
        {hoverMain && hoverSecondary ? (
          <g pointerEvents="none">
            <line stroke="#899087" strokeDasharray="2 3" strokeOpacity="0.95" strokeWidth="1" x1={hoverMain.x} x2={hoverMain.x} y1="12" y2="90" />
            <circle cx={hoverSecondary.x} cy={hoverSecondary.y} fill="#d5d0a3" r="2.4" stroke="#101110" strokeWidth="1" />
            <circle cx={hoverMain.x} cy={hoverMain.y} fill={palette.green} r="2.4" stroke="#101110" strokeWidth="1" />
            <rect fill="#0b0d0b" height="31" opacity="0.96" rx="2" stroke={palette.border} width="70" x={tooltipX} y={tooltipY} />
            <text fill="#eee4aa" fontSize="8" x={tooltipX + 6} y={tooltipY + 12}>{`Line A ${secondary[hoverIndex]}%`}</text>
            <text fill={palette.green} fontSize="8" x={tooltipX + 6} y={tooltipY + 24}>{`Line B ${main[hoverIndex]}%`}</text>
          </g>
        ) : null}
      </svg>
    </Box>
  );
}

function MainBehaviorChart({ data }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const seriesData = useMemo(() => data || buildMainSeries(), [data]);
  const forecastValues = seriesData.forecast || seriesData.red || seriesData.orange;
  const actualValues = seriesData.actual || seriesData.orange;
  const hasActual =
    Array.isArray(actualValues) &&
    actualValues.length === forecastValues.length &&
    actualValues.every((value) => Number.isFinite(Number(value)));
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

function ActiveFleet({ items = activeFleet }) {
  return (
    <Box
      bg="linear-gradient(180deg, rgba(255,255,255,0.022), rgba(255,255,255,0))"
      borderRight={{ base: "0", xl: `1px solid ${palette.border}` }}
      boxShadow="inset 0 1px 0 rgba(255,255,255,0.03)"
      minH="162px"
      p="19px 20px"
    >
      <Text color={palette.text} fontSize="14px" fontWeight="700" mb="18px">
        Active Fleet &gt;
      </Text>
      <Flex gap="6px" mb="18px">
        {items.map((item) => (
          <Box bg={item.color} flex={item.value} h="4px" key={item.label} opacity="0.95" />
        ))}
      </Flex>
      <VStack align="stretch" gap="10px">
        {items.map((item) => (
          <Flex color={palette.muted} fontSize="12px" justify="space-between" key={item.label}>
            <HStack spacing="6px">
              <Box bg={item.color} borderRadius="50%" h="5px" w="5px" />
              <Text>{item.label}</Text>
            </HStack>
            <Text color={palette.text}>{item.value}%</Text>
          </Flex>
        ))}
      </VStack>
    </Box>
  );
}

function AggressiveDrivers({ items = aggressiveDrivers }) {
  return (
    <Box
      bg="linear-gradient(180deg, rgba(255,255,255,0.022), rgba(255,255,255,0))"
      borderRight={{ base: "0", xl: `1px solid ${palette.border}` }}
      boxShadow="inset 0 1px 0 rgba(255,255,255,0.03)"
      minH="162px"
      p="19px 20px"
    >
      <Flex align="center" justify="space-between" mb="15px">
        <Text color={palette.text} fontSize="14px" fontWeight="700">
          Top Aggressive Drivers &gt;
        </Text>
        <Text color={palette.muted} fontSize="9px">
          LAST WEEK +
        </Text>
      </Flex>
      <VStack align="stretch" gap="10px">
        {items.map((driver) => (
          <Grid alignItems="center" gap="11px" gridTemplateColumns="1fr 68px 28px" key={driver.name}>
            <Text color={palette.muted} fontSize="11px" noOfLines={1}>
              {driver.name}
            </Text>
            <ThinBar color={palette.yellow} value={driver.yellow} />
            <ThinBar color={palette.red} value={driver.red} />
          </Grid>
        ))}
      </VStack>
    </Box>
  );
}

function DriversEfficiency({ rows = defaultEfficiencyRows }) {
  return (
    <Box bg="linear-gradient(180deg, rgba(255,255,255,0.022), rgba(255,255,255,0))" boxShadow="inset 0 1px 0 rgba(255,255,255,0.03)" minH="162px" p="19px 20px">
      <Flex align="center" justify="space-between" mb="13px">
        <Text color={palette.text} fontSize="14px" fontWeight="700">
          Drivers' Efficiency
        </Text>
        <Text color={palette.muted} fontSize="9px">
          LAST MONTH +
        </Text>
      </Flex>
      <HStack color={palette.muted} fontSize="10px" justify="center" mb="7px" spacing="18px">
        <HStack spacing="5px">
          <Box bg={palette.yellow} borderRadius="50%" h="5px" w="5px" />
          <Text>km / day</Text>
        </HStack>
        <HStack spacing="5px">
          <Box bg={palette.green} borderRadius="50%" h="5px" w="5px" />
          <Text>fuel /100 km</Text>
        </HStack>
      </HStack>
      <VStack align="stretch" gap="10px">
        {rows.map((row, index) => (
          <Grid gap="6px" gridTemplateColumns="1fr 1fr" key={index}>
            <ThinBar color={palette.yellow} value={row.km} />
            <ThinBar color={palette.green} value={row.fuel} />
          </Grid>
        ))}
      </VStack>
    </Box>
  );
}

function ForecastChartPanel({ data, error, loading, title }) {
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
        <MainBehaviorChart data={data} />
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
  const [chartDataByPeriod, setChartDataByPeriod] = useState({
    daily: null,
    monthly: null,
  });
  const [chartErrors, setChartErrors] = useState({});
  const [realtimeData, setRealtimeData] = useState(null);
  const [realtimeLatest, setRealtimeLatest] = useState(null);
  const [realtimeState, setRealtimeState] = useState({
    error: "",
    loading: true,
  });
  const [apiState, setApiState] = useState({
    error: "",
    loadedAt: null,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const points = [];
    const eventSource = new EventSource(
      forecastApi.getRealtimeStreamUrl({ interval: 1, limit: 96 }),
    );

    setRealtimeState({
      error: "",
      loading: true,
    });

    eventSource.addEventListener("open", () => {
      if (!isMounted) return;

      setRealtimeState({
        error: "",
        loading: true,
      });
    });

    eventSource.addEventListener("load_point", (event) => {
      if (!isMounted) return;

      const point = JSON.parse(event.data);
      points.push(point);
      setRealtimeLatest(point);
      setRealtimeData(normalizeForecastChart({ data: points }).behaviorSeries);
      setRealtimeState({
        error: "",
        loading: false,
      });
    });

    eventSource.addEventListener("done", () => {
      if (!isMounted) return;

      setRealtimeState((current) => ({
        ...current,
        loading: false,
      }));
      eventSource.close();
    });

    eventSource.addEventListener("error", (event) => {
      if (!isMounted) return;

      let message = "Realtime stream unavailable";
      if (event.data) {
        try {
          message = JSON.parse(event.data).message || message;
        } catch (error) {
          message = event.data;
        }
      }

      setRealtimeState({
        error: message,
        loading: false,
      });
    });

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadForecastCharts() {
      setApiState({
        error: "",
        loadedAt: null,
        loading: true,
      });

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

    loadForecastCharts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Box>
      <Box px="0">
        <ForecastChartPanel
          data={realtimeData}
          error={realtimeState.error}
          loading={realtimeState.loading}
          title="Realtime Load Forecast Dashboard"
        />
        {realtimeLatest ? (
          <Flex
            borderBottom={`1px solid ${palette.border}`}
            color={palette.muted}
            fontSize="11px"
            gap="18px"
            px="20px"
            py="10px"
            wrap="wrap"
          >
            <Text color={palette.text}>{formatTimestampLabel(realtimeLatest.timestamp)}</Text>
            <Text>Forecast {formatLoadValue(realtimeLatest.forecast_load)}</Text>
            <Text>Error {formatLoadValue(realtimeLatest.error)}</Text>
            <Text>Error % {formatLoadValue(realtimeLatest.error_percent)}</Text>
          </Flex>
        ) : null}
        {forecastPeriods.map((item) => (
          <ForecastChartPanel
            data={chartDataByPeriod[item.key]}
            error={chartErrors[item.key]}
            key={item.key}
            loading={apiState.loading}
            title={`${item.label} Load Forecast Chart`}
          />
        ))}
      </Box>
    </Box>
  );
}

export function ExperimentalResults() {
  const [hourlyData, setHourlyData] = useState(null);
  const [chartError, setChartError] = useState("");
  const [chartLoading, setChartLoading] = useState(true);
  const [modelMetrics, setModelMetrics] = useState(defaultModelMetrics);

  useEffect(() => {
    let isMounted = true;

    async function loadMetrics() {
      try {
        const { body } = await forecastApi.getMetrics();
        if (!isMounted) return;

        setModelMetrics(normalizeModelMetrics(body));
      } catch (error) {
        if (!isMounted) return;

        setModelMetrics(defaultModelMetrics);
      }
    }

    async function loadActualVsForecast() {
      try {
        setChartLoading(true);
        setChartError("");

        const { body } = await forecastApi.getChart("hourly");
        if (!isMounted) return;

        const data = normalizeForecastChart(body).behaviorSeries;
        setHourlyData(data);
        setChartError(data ? "" : "No valid actual / forecast load data");
      } catch (error) {
        if (!isMounted) return;

        setHourlyData(null);
        setChartError(error.message || "Can not load forecast data");
      } finally {
        if (isMounted) setChartLoading(false);
      }
    }

    loadMetrics();
    loadActualVsForecast();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Box>
      <SimpleGrid borderBottom={`1px solid ${palette.border}`} boxShadow="0 1px 0 rgba(255,255,255,0.025)" columns={{ base: 1, md: 3 }}>
        <ModelMetricCard title="MAE" value={modelMetrics.mae} />
        <ModelMetricCard title="RMSE" value={modelMetrics.rmse} />
        <ModelMetricCard suffix="%" title="MAPE" value={modelMetrics.mape} />
      </SimpleGrid>

      <ForecastChartPanel
        data={hourlyData}
        error={chartError}
        loading={chartLoading}
        title="Actual vs Forecast Load Chart"
      />
    </Box>
  );
}
