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
import React, { useMemo, useState } from "react";

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

function MainBehaviorChart() {
  const [hoverIndex, setHoverIndex] = useState(null);
  const seriesData = useMemo(() => buildMainSeries(), []);
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
  const orangePath = makeLinePath(seriesData.orange, width, height, 29, 24, 50, 0);
  const redPath = makeLinePath(seriesData.red, width, height, 29, 24, 50, 0);
  const hoverOrange = hoverIndex === null ? null : getPoint(seriesData.orange, hoverIndex, width, height, 29, 24, 50, 0);
  const hoverRed = hoverIndex === null ? null : getPoint(seriesData.red, hoverIndex, width, height, 29, 24, 50, 0);
  const tooltipX = hoverOrange ? Math.min(Math.max(hoverOrange.x + 10, 36), width - 120) : 0;
  const tooltipY = hoverOrange ? Math.max(Math.min(hoverOrange.y - 44, height - 70), 16) : 0;

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
        <text fill={palette.muted} fontSize="10" x="0" y="115">25%</text>
        <text fill={palette.muted} fontSize="10" x="8" y="220">0</text>
        <path className="fleet-line" d={orangePath} fill="none" pathLength="1" stroke="#eee4aa" strokeOpacity="0.95" strokeWidth="1.35" />
        <path className="fleet-line fleet-line-secondary" d={redPath} fill="none" pathLength="1" stroke={palette.red} strokeOpacity="1" strokeWidth="1.35" />
        <text fill={palette.muted} fontSize="10" x="566" y="244">2024</text>
        <text fill={palette.muted} fontSize="10" x="832" y="244">May</text>
        {seriesData.orange.map((_, index) => (
          <rect
            fill="transparent"
            height="218"
            key={index}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseMove={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            width={width / seriesData.orange.length}
            x={(index / seriesData.orange.length) * width}
            y="0"
          />
        ))}
        {hoverOrange && hoverRed ? (
          <g pointerEvents="none">
            <line stroke="#899087" strokeDasharray="2 3" strokeOpacity="0.96" strokeWidth="1" x1={hoverOrange.x} x2={hoverOrange.x} y1="12" y2="218" />
            <circle cx={hoverOrange.x} cy={hoverOrange.y} fill="#d5d0a3" r="3" stroke="#101110" strokeWidth="1.3" />
            <circle cx={hoverRed.x} cy={hoverRed.y} fill={palette.red} r="3" stroke="#101110" strokeWidth="1.3" />
            <rect fill="#0b0d0b" height="52" opacity="0.97" rx="3" stroke={palette.border} width="108" x={tooltipX} y={tooltipY} />
            <text fill={palette.text} fontSize="9" fontWeight="700" x={tooltipX + 8} y={tooltipY + 14}>{`Point ${hoverIndex + 1}`}</text>
            <text fill="#eee4aa" fontSize="9" x={tooltipX + 8} y={tooltipY + 30}>{`Orange Flags ${seriesData.orange[hoverIndex]}%`}</text>
            <text fill={palette.red} fontSize="9" x={tooltipX + 8} y={tooltipY + 43}>{`Red Flags ${seriesData.red[hoverIndex]}%`}</text>
          </g>
        ) : null}
      </svg>
      <HStack bottom="2px" color={palette.muted} fontSize="10px" left="0" position="absolute" spacing="20px">
        <HStack spacing="5px">
          <Box bg="#eee4aa" borderRadius="50%" h="5px" w="5px" />
          <Text>Orange Flags</Text>
        </HStack>
        <HStack spacing="5px">
          <Box bg={palette.red} borderRadius="50%" h="5px" w="5px" />
          <Text>Red Flags</Text>
        </HStack>
      </HStack>
    </Box>
  );
}

function ActiveFleet() {
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
        {activeFleet.map((item) => (
          <Box bg={item.color} flex={item.value} h="4px" key={item.label} opacity="0.95" />
        ))}
      </Flex>
      <VStack align="stretch" gap="10px">
        {activeFleet.map((item) => (
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

function AggressiveDrivers() {
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
        {aggressiveDrivers.map((driver) => (
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

function DriversEfficiency() {
  const rows = [
    { km: 46, fuel: 52 },
    { km: 64, fuel: 49 },
    { km: 61, fuel: 47 },
    { km: 63, fuel: 62 },
  ];

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

export default function LoadForecastDashboard() {
  return (
    <Box>
      <SimpleGrid borderBottom={`1px solid ${palette.border}`} boxShadow="0 1px 0 rgba(255,255,255,0.025)" columns={{ base: 1, md: 3 }}>
        <MetricCard change="+ 2.7%" title="Drivers with Flags" value="97">
          <FlagBars />
        </MetricCard>
        <MetricCard change="+ 4.5%" title="Alerts" value="184">
          <SmallLineChart redZone />
        </MetricCard>
        <MetricCard suffix="/ 381" title="Tasks Progress" value="194">
          <SmallLineChart up />
        </MetricCard>
      </SimpleGrid>

      <Box
        bg="linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0))"
        borderBottom={`1px solid ${palette.border}`}
        boxShadow="inset 0 1px 0 rgba(255,255,255,0.03)"
        p="18px 20px 9px"
      >
        <Flex align="center" justify="space-between" mb="8px">
          <Text color={palette.text} fontSize="14px" fontWeight="700">
            Behavioral Summary Chart
          </Text>
          <HStack color={palette.muted} fontSize="9px" spacing="28px">
            <Text>+ ADD FILTER</Text>
            <Text>LAST YEAR +</Text>
          </HStack>
        </Flex>
        <MainBehaviorChart />
      </Box>

      <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr 1.1fr" }}>
        <GridItem>
          <ActiveFleet />
        </GridItem>
        <GridItem>
          <AggressiveDrivers />
        </GridItem>
        <GridItem>
          <DriversEfficiency />
        </GridItem>
      </Grid>
    </Box>
  );
}
