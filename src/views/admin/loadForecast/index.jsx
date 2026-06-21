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
  {
    key: "shortTermHourly",
    label: "Short-Term Hourly",
    theme: { area: "#ec3bd8", drop: "#b14cff", end: "#3b82f6", line: "#f472b6", mid: "#8b5cf6" },
  },
  {
    key: "mediumTermDaily",
    label: "Medium-Term Daily",
    theme: { area: "#22c55e", drop: "#22c55e", end: "#14b8a6", line: "#35f46f", mid: "#16a34a" },
  },
  {
    key: "longTermMonthly",
    label: "Long-Term Monthly",
    theme: { area: "#ec3bd8", drop: "#b14cff", end: "#3b82f6", line: "#f472b6", mid: "#8b5cf6" },
  },
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

function makeAreaPath(linePath, width, height, padX = 0, padY = 0) {
  if (!linePath) return "";

  return `${linePath} L ${width - padX} ${height - padY} L ${padX} ${height - padY} Z`;
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

  return `${number.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} kW`;
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
        ".fleet-line": {
          animation: "fleetLineDraw 1.25s ease-out both",
          strokeDasharray: 1,
          strokeDashoffset: 1,
        },
        ".fleet-line-secondary": {
          animationDelay: "0.16s",
        },
        ".fleet-chart text": {
          fontFamily: "'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontFeatureSettings: "'cv02', 'cv03', 'cv04', 'cv11'",
          fontWeight: "400",
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

function MainBehaviorChart({ data, showActual = true, theme }) {
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
  const padX = 48;
  const rightX = 858;
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
  const actualPath = hasActual ? makeLinePath(actualValues, width, height, padX, 24, chartRange.max, chartRange.min) : "";
  const forecastPath = makeLinePath(forecastValues, width, height, padX, 24, chartRange.max, chartRange.min);
  const forecastAreaPath = makeAreaPath(forecastPath, width, height, padX, 24);
  const hoverActual = hasActual && hoverIndex !== null ? getPoint(actualValues, hoverIndex, width, height, padX, 24, chartRange.max, chartRange.min) : null;
  const hoverForecast = hoverIndex === null ? null : getPoint(forecastValues, hoverIndex, width, height, padX, 24, chartRange.max, chartRange.min);
  const gradientKey = theme.line.replace("#", "");
  const strokeGradientId = `forecastStroke-${gradientKey}`;
  const areaGradientId = `forecastArea-${gradientKey}`;
  const dropGuides = useMemo(() => {
    const maxGuides = 14;
    const step = Math.max(1, Math.floor(forecastValues.length / maxGuides));

    return forecastValues
      .map((_, index) => index)
      .filter((index) => index % step === 0)
      .slice(0, maxGuides)
      .map((index) => getPoint(forecastValues, index, width, height, padX, 24, chartRange.max, chartRange.min));
  }, [chartRange.max, chartRange.min, forecastValues, height, width]);
  const tooltipWidth = 146;
  const tooltipX = hoverForecast ? Math.min(Math.max(hoverForecast.x + 10, 36), width - tooltipWidth - 12) : 0;
  const tooltipY = hoverForecast ? Math.max(Math.min(hoverForecast.y - 44, height - 70), 16) : 0;
  const tooltipLeft = `${(tooltipX / width) * 100}%`;
  const tooltipTop = `${(tooltipY / height) * 100}%`;
  const handleChartHover = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / rect.width) * width;
    const boundedX = Math.min(Math.max(localX, padX), rightX);
    const ratio = (boundedX - padX) / (rightX - padX);
    const nextIndex = Math.round(ratio * Math.max(forecastValues.length - 1, 0));

    setHoverIndex(Math.min(Math.max(nextIndex, 0), forecastValues.length - 1));
  };

  return (
    <Box h={{ base: "228px", lg: "214px" }} position="relative">
      <ChartMotionStyles />
      <svg className="fleet-chart" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} width="100%">
        <defs>
          <linearGradient id={strokeGradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={theme.line} />
            <stop offset="48%" stopColor={theme.mid} />
            <stop offset="100%" stopColor={theme.end} />
          </linearGradient>
          <linearGradient id={areaGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={theme.area} stopOpacity="0.2" />
            <stop offset="55%" stopColor={theme.mid} stopOpacity="0.08" />
            <stop offset="100%" stopColor={theme.end} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect fill="transparent" height={height} width={width} />
        {[66, 112, 158, 204].map((y) => (
          <line key={y} stroke="#ffffff" strokeDasharray="4 8" strokeOpacity="0.07" strokeWidth="1" x1={padX} x2={rightX} y1={y} y2={y} />
        ))}
        <path d={forecastAreaPath} fill={`url(#${areaGradientId})`} />
        {dropGuides.map((point, index) => (
          <line
            key={`drop-${index}`}
            stroke={theme.drop}
            strokeDasharray="2 4"
            strokeOpacity="0.24"
            strokeWidth="1"
            x1={point.x}
            x2={point.x}
            y1={point.y + 4}
            y2="214"
          />
        ))}
        {hasActual ? (
          <path className="fleet-line" d={actualPath} fill="none" pathLength="1" stroke="#eee4aa" strokeOpacity="0.95" strokeWidth="1.05" />
        ) : null}
        <path className="fleet-line fleet-line-secondary" d={forecastPath} fill="none" pathLength="1" stroke={`url(#${strokeGradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="1" strokeWidth="1.35" />
        <rect
          cursor="crosshair"
          fill="transparent"
          height="226"
          onMouseEnter={handleChartHover}
          onMouseMove={handleChartHover}
          onMouseLeave={() => setHoverIndex(null)}
          width={rightX - padX + 12}
          x={padX - 6}
          y="4"
        />
        {hoverForecast ? (
          <g pointerEvents="none">
            <line stroke={theme.line} strokeDasharray="2 4" strokeOpacity="0.65" strokeWidth="1" x1={hoverForecast.x} x2={hoverForecast.x} y1="25" y2="214" />
            {hoverActual ? (
              <circle cx={hoverActual.x} cy={hoverActual.y} fill="#d5d0a3" r="3" stroke="#101110" strokeWidth="1.3" />
            ) : null}
            <circle cx={hoverForecast.x} cy={hoverForecast.y} fill={theme.line} r="2.6" stroke="#0b1020" strokeWidth="1" />
          </g>
        ) : null}
      </svg>
      {hoverForecast ? (
        <Box
          bg="#070b15"
          border="1px solid rgba(255,255,255,0.16)"
          borderRadius="7px"
          color="#a6acb8"
          fontFamily="'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fontSize="9px"
          fontWeight="400"
          left={tooltipLeft}
          lineHeight="1.2"
          minH={hasActual ? "58px" : "44px"}
          opacity="0.98"
          p="8px 10px"
          pointerEvents="none"
          position="absolute"
          top={tooltipTop}
          w={`${tooltipWidth}px`}
          zIndex="2"
        >
          <Text color={palette.text} fontWeight="500" mb="6px">
            {formatTimestampLabel(seriesData.labels?.[hoverIndex]) || `Point ${hoverIndex + 1}`}
          </Text>
          {hasActual ? (
            <Text color="#eee4aa" mb="5px">{`Actual ${formatLoadValue(actualValues[hoverIndex])}`}</Text>
          ) : null}
          <Text color={theme.line}>{`Forecast ${formatLoadValue(forecastValues[hoverIndex])}`}</Text>
        </Box>
      ) : null}
      <Box
        bottom="20px"
        color="#a6acb8"
        fontFamily="'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="9px"
        fontWeight="400"
        left="0"
        lineHeight="1"
        pointerEvents="none"
        position="absolute"
        right="0"
        top="0"
      >
        <Text left="0" position="absolute" textAlign="right" top="22px" w="42px">
          {formatLoadValue(chartRange.max)}
        </Text>
        <Text left="0" position="absolute" textAlign="right" top="50%" transform="translateY(-50%)" w="42px">
          {formatLoadValue(midValue)}
        </Text>
        <Text left="0" position="absolute" textAlign="right" top="calc(100% - 32px)" w="42px">
          {formatLoadValue(chartRange.min)}
        </Text>
        <Text bottom="0" left="48px" position="absolute">
          {firstLabel}
        </Text>
        <Text bottom="0" position="absolute" right="22px">
          {lastLabel}
        </Text>
      </Box>
      <HStack
        bottom="0"
        color="#a6acb8"
        fontFamily="'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="9px"
        fontWeight="400"
        left="50%"
        lineHeight="1"
        position="absolute"
        spacing="18px"
        transform="translateX(-50%)"
      >
        {hasActual ? (
          <HStack spacing="5px">
            <Box bg="#eee4aa" borderRadius="50%" h="5px" w="5px" />
            <Text>Actual Load</Text>
          </HStack>
        ) : null}
        <HStack spacing="4px">
          <Box bg={theme.line} borderRadius="50%" h="4px" w="4px" />
          <Text>Forecast Load</Text>
        </HStack>
      </HStack>
    </Box>
  );
}

function ForecastChartPanel({ data, error, loading, showActual = true, theme, title }) {
  return (
    <Box
      bg="linear-gradient(145deg, rgba(12, 17, 30, 0.92), rgba(7, 12, 22, 0.96))"
      border="1px solid rgba(148, 163, 184, 0.14)"
      borderRadius="14px"
      boxShadow="inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 44px rgba(0,0,0,0.28)"
      overflow="hidden"
      p={{ base: "14px 14px 12px", md: "16px 18px 12px" }}
      position="relative"
      _before={{
        bg: "radial-gradient(circle at 70% 14%, rgba(59,130,246,0.18), transparent 34%)",
        content: '""',
        inset: "0",
        pointerEvents: "none",
        position: "absolute",
      }}
    >
      <Flex align="center" justify="space-between" mb="8px" position="relative" zIndex="1">
        <Text color={palette.text} fontSize="12px" fontWeight="500" letterSpacing="0">
          {title}
        </Text>
        {loading ? (
          <Text color={palette.yellow} fontSize="7.5px" fontWeight="500" letterSpacing="0">
            LOADING DATA
          </Text>
        ) : error ? (
          <Text color={palette.red} fontSize="7.5px" fontWeight="500" letterSpacing="0">
            DATA UNAVAILABLE
          </Text>
        ) : (
          <Text color="#5ee0a0" fontSize="7.5px" fontWeight="500" letterSpacing="0">
            LIVE DATA
          </Text>
        )}
      </Flex>
      {error ? (
        <Text color={palette.muted} fontSize="10px" mb="4px" position="relative" zIndex="1">
          BE unavailable: {error}
        </Text>
      ) : null}
      {data ? (
        <Box position="relative" zIndex="1">
          <MainBehaviorChart data={data} showActual={showActual} theme={theme} />
        </Box>
      ) : (
        <Flex align="center" h={{ base: "228px", lg: "214px" }} justify="center" position="relative" zIndex="1">
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
    <Box p={{ base: "10px", md: "16px" }}>
      <Box
        display="grid"
        gap="16px"
        gridTemplateColumns="1fr"
      >
        {forecastPeriods.map((item) => (
          <ForecastChartPanel
            data={chartDataByPeriod[item.key]}
            error={chartErrors[item.key]}
            key={item.key}
            loading={apiState.loading}
            showActual={false}
            theme={item.theme}
            title={`${item.label} Load Forecast Chart`}
          />
        ))}
      </Box>
    </Box>
  );
}
