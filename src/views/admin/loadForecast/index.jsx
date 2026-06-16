import {
  Badge,
  Box,
  Button,
  Code,
  Flex,
  Icon,
  SimpleGrid,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import LineChart from "components/charts/LineChart";
import { API_BASE_URL } from "config/api";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdRefresh, MdShowChart, MdStorage, MdTaskAlt } from "react-icons/md";
import { forecastApi, forecastEndpoints } from "services/forecastApi";

function StatusBadge({ ok }) {
  return (
    <Badge
      borderRadius='7px'
      colorScheme={ok ? "green" : "red"}
      px='10px'
      py='4px'>
      {ok ? "Connected" : "Failed"}
    </Badge>
  );
}

function EndpointCard({ endpoint, result }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const mutedColor = useColorModeValue("secondaryGray.600", "secondaryGray.400");

  return (
    <Card p='20px'>
      <Flex align='flex-start' justify='space-between' gap='16px'>
        <Box>
          <Text color={mutedColor} fontSize='sm' fontWeight='500'>
            {endpoint.path}
          </Text>
          <Text color={textColor} fontSize='lg' fontWeight='700' mt='4px'>
            {endpoint.label}
          </Text>
        </Box>
        {result.loading ? <Spinner size='sm' /> : <StatusBadge ok={result.ok} />}
      </Flex>
      <Box mt='16px'>
        <Text color={mutedColor} fontSize='sm' fontWeight='500'>
          HTTP status
        </Text>
        <Text color={textColor} fontSize='md' fontWeight='700'>
          {result.status || "-"}
          {result.duration ? ` - ${result.duration}ms` : ""}
        </Text>
      </Box>
      {result.error ? (
        <Code colorScheme='red' mt='14px' whiteSpace='pre-wrap' w='100%' p='10px'>
          {result.error}
        </Code>
      ) : null}
    </Card>
  );
}

export default function LoadForecastDashboard() {
  const [results, setResults] = useState({});
  const [forecast, setForecast] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const mutedColor = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const chartTextColor = useColorModeValue("#A3AED0", "#CBD5E0");

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setResults(
      forecastEndpoints.reduce((state, endpoint) => {
        state[endpoint.key] = { loading: true };
        return state;
      }, {})
    );

    const nextResults = {};

    await Promise.all(
      forecastEndpoints.map(async (endpoint) => {
        try {
          const data = await forecastApi.testEndpoint(endpoint.path);
          nextResults[endpoint.key] = {
            ok: true,
            loading: false,
            status: data.status,
            duration: data.duration,
            body: data.body,
          };

          if (endpoint.key === "forecast") {
            setForecast(data.body);
          }
        } catch (error) {
          nextResults[endpoint.key] = {
            ok: false,
            loading: false,
            error:
              error.message ||
              "Cannot reach backend. Check API URL, CORS, or backend process.",
          };
        }
      })
    );

    setResults(nextResults);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const chartData = useMemo(() => {
    const data = forecast?.data || [];
    return [
      {
        name: "Actual Load",
        data: data.map((item) => item.actual_load),
      },
      {
        name: "Forecast Load",
        data: data.map((item) => item.forecast_load),
      },
    ];
  }, [forecast]);

  const chartOptions = useMemo(() => {
    const labels = forecast?.data?.map((item) => item.time) || [];
    return {
      chart: {
        toolbar: { show: false },
      },
      colors: ["#2B6CB0", "#38A169"],
      dataLabels: { enabled: false },
      grid: {
        borderColor: "#E2E8F0",
        strokeDashArray: 4,
      },
      legend: {
        position: "top",
        labels: { colors: chartTextColor },
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      tooltip: {
        y: {
          formatter: (value) => `${value.toLocaleString()} MW`,
        },
      },
      xaxis: {
        categories: labels,
        labels: {
          style: { colors: labels.map(() => chartTextColor), fontSize: "12px" },
        },
      },
      yaxis: {
        labels: {
          formatter: (value) => value.toLocaleString(),
          style: { colors: [chartTextColor], fontSize: "12px" },
        },
      },
    };
  }, [chartTextColor, forecast]);

  const connectedCount = forecastEndpoints.filter(
    (endpoint) => results[endpoint.key]?.ok
  ).length;

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap='16px'
        justify='space-between'
        mb='20px'>
        <Box>
          <Text color={textColor} fontSize='2xl' fontWeight='700'>
            Load Forecast BE Test
          </Text>
          <Text color={mutedColor} fontSize='sm' fontWeight='500' mt='4px'>
            API base URL: <Code>{API_BASE_URL}</Code>
          </Text>
        </Box>
        <Button
          leftIcon={<Icon as={MdRefresh} />}
          colorScheme='blue'
          isLoading={isRefreshing}
          onClick={refresh}>
          Refresh
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap='20px' mb='20px'>
        <Card p='20px'>
          <Flex align='center' gap='14px'>
            <Icon as={MdTaskAlt} color='green.500' h='30px' w='30px' />
            <Box>
              <Text color={mutedColor} fontSize='sm' fontWeight='500'>
                Endpoints connected
              </Text>
              <Text color={textColor} fontSize='2xl' fontWeight='700'>
                {connectedCount}/{forecastEndpoints.length}
              </Text>
            </Box>
          </Flex>
        </Card>
        <Card p='20px'>
          <Flex align='center' gap='14px'>
            <Icon as={MdStorage} color='blue.500' h='30px' w='30px' />
            <Box>
              <Text color={mutedColor} fontSize='sm' fontWeight='500'>
                Region
              </Text>
              <Text color={textColor} fontSize='2xl' fontWeight='700'>
                {forecast?.region || "-"}
              </Text>
            </Box>
          </Flex>
        </Card>
        <Card p='20px'>
          <Flex align='center' gap='14px'>
            <Icon as={MdShowChart} color='purple.500' h='30px' w='30px' />
            <Box>
              <Text color={mutedColor} fontSize='sm' fontWeight='500'>
                Forecast date
              </Text>
              <Text color={textColor} fontSize='2xl' fontWeight='700'>
                {forecast?.date || "-"}
              </Text>
            </Box>
          </Flex>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 3 }} gap='20px' mb='20px'>
        {forecastEndpoints.map((endpoint) => (
          <EndpointCard
            endpoint={endpoint}
            key={endpoint.key}
            result={results[endpoint.key] || { loading: true }}
          />
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap='20px'>
        <Card p='20px'>
          <Text color={textColor} fontSize='lg' fontWeight='700' mb='16px'>
            Forecast Chart
          </Text>
          <Box h='330px'>
            <LineChart chartData={chartData} chartOptions={chartOptions} />
          </Box>
        </Card>

        <Card p='20px' overflowX='auto'>
          <Text color={textColor} fontSize='lg' fontWeight='700' mb='16px'>
            Forecast Data
          </Text>
          <Table variant='simple'>
            <Thead>
              <Tr>
                <Th>Time</Th>
                <Th isNumeric>Actual Load</Th>
                <Th isNumeric>Forecast Load</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(forecast?.data || []).map((item) => (
                <Tr key={item.time}>
                  <Td>{item.time}</Td>
                  <Td isNumeric>{item.actual_load.toLocaleString()} MW</Td>
                  <Td isNumeric>{item.forecast_load.toLocaleString()} MW</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
