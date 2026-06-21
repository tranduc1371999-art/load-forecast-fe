import {
  Box,
  Flex,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";
import { forecastApi } from "services/forecastApi";

const palette = {
  bg: "linear-gradient(145deg, rgba(12, 17, 30, 0.94), rgba(7, 12, 22, 0.98))",
  border: "rgba(148, 163, 184, 0.14)",
  muted: "#9aa4b2",
  text: "#f8fafc",
};

const metricMeta = [
  { key: "mae", label: "MAE", suffix: "kW", tone: "#35f46f" },
  { key: "rmse", label: "RMSE", suffix: "kW", tone: "#f472b6" },
  { key: "mape", label: "MAPE", suffix: "%", tone: "#60a5fa" },
];

function formatNumber(value, suffix = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";

  return `${number.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}${suffix ? ` ${suffix}` : ""}`;
}

function formatDateTime(value) {
  if (!value) return "--";
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

function MetricCard({ item, value }) {
  return (
    <Box
      bg={palette.bg}
      border={`1px solid ${palette.border}`}
      borderRadius="14px"
      boxShadow="inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 44px rgba(0,0,0,0.24)"
      p="18px"
    >
      <Flex align="center" gap="8px" mb="16px">
        <Box bg={item.tone} borderRadius="50%" h="7px" w="7px" />
        <Text color={palette.muted} fontSize="11px" fontWeight="400">
          {item.label}
        </Text>
      </Flex>
      <Text color={palette.text} fontSize="28px" fontWeight="500" lineHeight="1">
        {formatNumber(value, item.suffix)}
      </Text>
    </Box>
  );
}

function InfoRow({ label, value }) {
  return (
    <Flex
      align={{ base: "flex-start", md: "center" }}
      borderBottom="1px solid rgba(148, 163, 184, 0.08)"
      direction={{ base: "column", md: "row" }}
      gap={{ base: "4px", md: "16px" }}
      justify="space-between"
      py="12px"
    >
      <Text color={palette.muted} fontSize="11px">
        {label}
      </Text>
      <Text color={palette.text} fontSize="12px" fontWeight="400" textAlign={{ base: "left", md: "right" }}>
        {value || "--"}
      </Text>
    </Flex>
  );
}

function DetailCard({ rows, title }) {
  return (
    <Box bg={palette.bg} border={`1px solid ${palette.border}`} borderRadius="14px" p="18px">
      <Text color={palette.text} fontSize="14px" fontWeight="500" mb="8px">
        {title}
      </Text>
      {rows.map(([label, value]) => (
        <InfoRow key={label} label={label} value={value} />
      ))}
    </Box>
  );
}

export default function MetricsDashboard() {
  const [state, setState] = useState({
    data: null,
    error: "",
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      try {
        const { body } = await forecastApi.getMetrics();
        if (!active) return;

        setState({
          data: body || null,
          error: "",
          loading: false,
        });
      } catch (error) {
        if (!active) return;
        setState({
          data: null,
          error: error.message || "Can not load model metrics",
          loading: false,
        });
      }
    }

    loadMetrics();

    return () => {
      active = false;
    };
  }, []);

  const metrics = state.data?.metrics || {};
  const modelRows = useMemo(
    () => [
      ["model_name", state.data?.model_name],
      ["mode", state.data?.mode],
      ["target", state.data?.target],
      ["generated_at", formatDateTime(state.data?.generated_at)],
    ],
    [state.data],
  );
  const dataRows = useMemo(
    () => [
      ["data_start", formatDateTime(state.data?.data_start)],
      ["data_end", formatDateTime(state.data?.data_end)],
      ["validation_start", formatDateTime(state.data?.validation_start)],
    ],
    [state.data],
  );
  const forecastRows = useMemo(
    () => [
      ["forecast_start", formatDateTime(state.data?.forecast_start)],
      ["short_term_end", formatDateTime(state.data?.short_term_end)],
      ["medium_term_end", formatDateTime(state.data?.medium_term_end)],
      ["long_term_months", state.data?.long_term_months ? `${state.data.long_term_months} months` : "--"],
    ],
    [state.data],
  );

  return (
    <Box p={{ base: "10px", md: "16px" }}>
      <Flex align="center" justify="space-between" mb="16px">
        <Box>
          <Text color={palette.text} fontSize="18px" fontWeight="500">
            Model Metrics
          </Text>
          <Text color={palette.muted} fontSize="12px" mt="4px">
            {state.data?.model_name || "Forecast model"}
          </Text>
        </Box>
        {state.loading ? (
          <Text color="#ecd083" fontSize="10px">LOADING</Text>
        ) : state.error ? (
          <Text color="#e08b8b" fontSize="10px">DATA UNAVAILABLE</Text>
        ) : null}
      </Flex>

      {state.error ? (
        <Box bg={palette.bg} border={`1px solid ${palette.border}`} borderRadius="14px" mb="16px" p="16px">
          <Text color="#e08b8b" fontSize="12px">
            {state.error}
          </Text>
        </Box>
      ) : null}

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="16px" mb="16px">
        {metricMeta.map((item) => (
          <MetricCard item={item} key={item.key} value={metrics[item.key]} />
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 3 }} gap="16px">
        <DetailCard rows={modelRows} title="Model" />
        <DetailCard rows={dataRows} title="Dataset / Validation" />
        <DetailCard rows={forecastRows} title="Forecast Windows" />
      </SimpleGrid>
    </Box>
  );
}
