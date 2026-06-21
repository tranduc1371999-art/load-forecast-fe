import {
  Box,
  Flex,
  HStack,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";
import { forecastApi } from "services/forecastApi";

const palette = {
  bg: "linear-gradient(145deg, rgba(12, 17, 30, 0.94), rgba(7, 12, 22, 0.98))",
  border: "rgba(148, 163, 184, 0.14)",
  muted: "#9aa4b2",
  text: "#f8fafc",
};

const datasets = [
  {
    key: "shortTermHourly",
    label: "Short-Term Hourly",
    tone: "#f472b6",
  },
  {
    key: "mediumTermDaily",
    label: "Medium-Term Daily",
    tone: "#35f46f",
  },
  {
    key: "longTermMonthly",
    label: "Long-Term Monthly",
    tone: "#60a5fa",
  },
];

const preferredColumns = [
  "Timestamp",
  "forecast_load",
  "forecast_avg_load",
  "forecast_peak_load",
  "actual_load",
  "actual_avg_load",
  "actual_peak_load",
  "error",
  "error_percent",
];

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "--";
  const number = Number(value);

  if (Number.isFinite(number)) {
    return number.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }

  return String(value);
}

function getColumns(rows) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
  const ordered = preferredColumns.filter((key) => keys.includes(key));
  const rest = keys.filter((key) => !ordered.includes(key));

  return [...ordered, ...rest].slice(0, 7);
}

function DataSummaryCard({ active, item, onClick, result }) {
  return (
    <Box
      bg={palette.bg}
      border={`1px solid ${active ? item.tone : palette.border}`}
      borderRadius="14px"
      boxShadow={active ? `0 0 0 1px ${item.tone}33, 0 18px 44px rgba(0,0,0,0.24)` : "none"}
      cursor="pointer"
      onClick={onClick}
      p="16px"
      transition="border 0.2s ease, box-shadow 0.2s ease"
      _hover={{ borderColor: item.tone }}
    >
      <HStack mb="12px" spacing="7px">
        <Box bg={item.tone} borderRadius="50%" h="7px" w="7px" />
        <Text color={palette.muted} fontSize="11px">
          {item.label}
        </Text>
      </HStack>
      <Text color={palette.text} fontSize="24px" fontWeight="500" lineHeight="1">
        {result?.total ?? result?.data?.length ?? "--"}
      </Text>
      <Text color={palette.muted} fontSize="11px" mt="8px">
        rows
      </Text>
    </Box>
  );
}

function DataPreviewTable({ item, result, error, loading }) {
  const rows = useMemo(() => (Array.isArray(result?.data) ? result.data : []), [result]);
  const columns = useMemo(() => getColumns(rows), [rows]);

  return (
    <Box bg={palette.bg} border={`1px solid ${palette.border}`} borderRadius="14px" overflow="hidden">
      <Flex align="center" borderBottom={`1px solid ${palette.border}`} justify="space-between" p="14px 16px">
        <HStack spacing="7px">
          <Box bg={item.tone} borderRadius="50%" h="7px" w="7px" />
          <Text color={palette.text} fontSize="13px" fontWeight="500">
            {item.label}
          </Text>
        </HStack>
        <Text color={palette.muted} fontSize="10px">
          {loading ? "LOADING" : error ? "UNAVAILABLE" : `${result?.total ?? rows.length} rows`}
        </Text>
      </Flex>

      {error ? (
        <Text color="#e08b8b" fontSize="12px" p="16px">
          {error}
        </Text>
      ) : rows.length ? (
        <Box maxH="388px" overflow="auto">
          <Table size="sm" variant="unstyled">
            <Thead>
              <Tr>
                {columns.map((column) => (
                  <Th
                    borderBottom={`1px solid ${palette.border}`}
                    color={palette.muted}
                    fontSize="10px"
                    fontWeight="500"
                    key={column}
                    px="16px"
                    py="10px"
                    textTransform="none"
                    whiteSpace="nowrap"
                  >
                    {column}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, rowIndex) => (
                <Tr key={`${item.key}-${rowIndex}`}>
                  {columns.map((column) => (
                    <Td
                      borderBottom="1px solid rgba(148, 163, 184, 0.06)"
                      color={palette.text}
                      fontSize="11px"
                      key={column}
                      px="16px"
                      py="9px"
                      whiteSpace="nowrap"
                    >
                      {formatCell(row[column])}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      ) : (
        <Text color={palette.muted} fontSize="12px" p="16px">
          {loading ? "Loading forecast data..." : "No rows to display"}
        </Text>
      )}
    </Box>
  );
}

export default function ForecastDataPage() {
  const [selectedKey, setSelectedKey] = useState(datasets[0].key);
  const [state, setState] = useState({
    errors: {},
    loading: true,
    results: {},
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      const responses = await Promise.allSettled(
        datasets.map(async (item) => {
          const { body } = await forecastApi.getChart(item.key);
          return [item.key, body];
        }),
      );

      if (!active) return;

      const results = {};
      const errors = {};

      responses.forEach((response, index) => {
        const key = datasets[index].key;
        if (response.status === "fulfilled") {
          results[key] = response.value[1];
        } else {
          errors[key] = response.reason?.message || "Can not load data";
        }
      });

      setState({ errors, loading: false, results });
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Box p={{ base: "10px", md: "16px" }}>
      <Flex align="center" justify="space-between" mb="10px">
        <Text color={palette.text} fontSize="18px" fontWeight="500">
          Forecast Data
        </Text>
        {state.loading ? (
          <Text color="#ecd083" fontSize="10px">LOADING</Text>
        ) : null}
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="16px" mb="10px">
        {datasets.map((item) => (
          <DataSummaryCard
            active={selectedKey === item.key}
            item={item}
            key={item.key}
            onClick={() => setSelectedKey(item.key)}
            result={state.results[item.key]}
          />
        ))}
      </SimpleGrid>

      <DataPreviewTable
        error={state.errors[selectedKey]}
        item={datasets.find((item) => item.key === selectedKey) || datasets[0]}
        loading={state.loading}
        result={state.results[selectedKey]}
      />
    </Box>
  );
}
