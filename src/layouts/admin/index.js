import {
  Avatar,
  Badge,
  Box,
  Flex,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdDirectionsCar,
  MdBolt,
  MdLogout,
  MdPerson,
  MdTaskAlt,
  MdVerifiedUser,
} from 'react-icons/md';
import routes from 'routes.js';

const palette = {
  shell: '#4e504d',
  panel: '#0d0f0d',
  panelDeep: '#070907',
  border: '#353934',
  text: '#f0f0e8',
  muted: '#8b8e88',
  green: '#8ac4a0',
  red: '#c97777',
};

const navGroups = [
  {
    items: [
      { icon: MdDashboard, label: 'Dashboard', path: '/admin/load-forecast' },
      { icon: MdDirectionsCar, label: 'Tracking', path: '/admin/default' },
      { icon: MdTaskAlt, label: 'Compliance', path: '/admin/data-tables' },
      { icon: MdVerifiedUser, label: 'Assets', path: '/admin/nft-marketplace' },
    ],
  },
];

function SidebarItem({ item, active, expanded }) {
  return (
    <Flex
      align="center"
      as={Link}
      bg={active ? 'rgba(255,255,255,0.08)' : 'transparent'}
      borderLeft={active ? `2px solid ${palette.text}` : '2px solid transparent'}
      color={active ? palette.text : '#9a9d96'}
      gap={expanded ? '10px' : '0'}
      h="40px"
      justify={expanded ? 'flex-start' : 'center'}
      px={expanded ? '16px' : '0'}
      textDecoration="none"
      to={item.path}
      transition="background 0.2s ease"
      _hover={{ bg: 'rgba(255,255,255,0.05)', color: palette.text }}
    >
      <Icon as={item.icon} boxSize="15px" />
      <Text
        display={expanded ? 'block' : 'none'}
        fontSize="12px"
        fontWeight={active ? '700' : '500'}
        whiteSpace="nowrap"
      >
        {item.label}
      </Text>
      {item.badge ? (
        <Badge
          bg="rgba(138,196,160,0.18)"
          borderRadius="8px"
          color={palette.green}
          display={expanded ? 'inline-flex' : 'none'}
          fontSize="7px"
          ml="auto"
          px="5px"
          textTransform="uppercase"
        >
          {item.badge}
        </Badge>
      ) : null}
      {item.count ? (
        <Flex
          align="center"
          bg="rgba(201,119,119,0.32)"
          borderRadius="50%"
          color="#f3b5b5"
          display={expanded ? 'flex' : 'none'}
          fontSize="9px"
          h="18px"
          justify="center"
          ml="auto"
          w="18px"
        >
          {item.count}
        </Flex>
      ) : null}
    </Flex>
  );
}

function AccountPanel({ expanded }) {
  const [showLogout, setShowLogout] = useState(false);

  return (
    <Box
      onMouseEnter={() => setShowLogout(true)}
      onMouseLeave={() => setShowLogout(false)}
      px={expanded ? '12px' : '0'}
      pb="10px"
    >
      <Flex
        align="center"
        gap={expanded ? '10px' : '0'}
        justify={expanded ? 'flex-start' : 'center'}
        minH="40px"
      >
        <Avatar bg="rgba(255,255,255,0.09)" color={palette.text} icon={<Icon as={MdPerson} boxSize="18px" />} size="sm" />
        <Box display={expanded ? 'block' : 'none'} minW="0">
          <Text color={palette.text} fontSize="12px" fontWeight="700" noOfLines={1}>
            Admin
          </Text>
          <Text color={palette.muted} fontSize="10px" noOfLines={1}>
            Operator
          </Text>
        </Box>
      </Flex>
      <Flex
        align="center"
        bg="rgba(201,119,119,0.12)"
        border={`1px solid rgba(201,119,119,0.22)`}
        color="#f0a4a4"
        cursor="pointer"
        display={expanded && showLogout ? 'flex' : 'none'}
        gap="8px"
        h="34px"
        mt="6px"
        px="10px"
        transition="background 0.2s ease"
        _hover={{ bg: 'rgba(201,119,119,0.2)' }}
      >
        <Icon as={MdLogout} boxSize="15px" />
        <Text fontSize="12px" fontWeight="600">
          Logout
        </Text>
      </Flex>
    </Box>
  );
}

function FleetSidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  return (
    <Flex
      bg={`linear-gradient(100deg, ${palette.panelDeep} 0%, #0a0d0b 68%, #141814 100%)`}
      borderRight={`1px solid ${palette.border}`}
      alignSelf="stretch"
      minH="100vh"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      overflow="hidden"
      transition="width 0.22s ease"
      w={expanded ? '224px' : '52px'}
      flexShrink="0"
    >
      <Flex
        direction="column"
        h="100vh"
        left="0"
        position="fixed"
        top="0"
        w={expanded ? '224px' : '52px'}
      >
        <Flex
          align="center"
          gap={expanded ? '7px' : '0'}
          h="58px"
          justify={expanded ? 'flex-start' : 'center'}
          px={expanded ? '12px' : '0'}
        >
          <Icon as={MdBolt} boxSize="30px" color={palette.text} flexShrink="0" />
          <Text
            color={palette.text}
            display={expanded ? 'block' : 'none'}
            fontSize="12px"
            fontWeight="800"
            whiteSpace="nowrap"
          >
            Power Load Monitoring
          </Text>
        </Flex>
        <VStack align="stretch" flex="1" gap="0" minH="0">
          {navGroups.slice(0, 3).map((group) => (
            <Box key={group.title || 'main'} mb="8px">
              {group.title ? (
                <Flex
                  align="center"
                  color={palette.muted}
                  display={expanded ? 'flex' : 'none'}
                  fontSize="11px"
                  justify="space-between"
                  px="20px"
                  py="9px"
                >
                  <Text>{group.title}</Text>
                  <Text>^</Text>
                </Flex>
              ) : null}
              {group.items.map((item) => (
                <SidebarItem
                  active={!item.passive && location.pathname === item.path}
                  expanded={expanded}
                  item={item}
                  key={item.label}
                />
              ))}
            </Box>
          ))}
        </VStack>
        <Box flexShrink="0" mt="auto">
          <AccountPanel expanded={expanded} />
        </Box>
      </Flex>
    </Flex>
  );
}

function getRoutes(routeList) {
  return routeList.map((route, key) => {
    if (route.layout === '/admin') {
      return <Route path={`${route.path}`} element={route.component} key={key} />;
    }
    if (route.collapse) {
      return getRoutes(route.items);
    }
    return null;
  });
}

export default function Dashboard() {
  document.documentElement.dir = 'ltr';

  return (
    <Box bg={palette.shell} minH="100vh">
      <Flex
        bg={palette.panel}
        border="0"
        borderRadius="0"
        boxShadow="inset 1px 0 0 rgba(255,255,255,0.03)"
        direction={{ base: 'column', lg: 'row' }}
        alignItems="stretch"
        minH="100vh"
        overflow="hidden"
        w="100%"
      >
        <FleetSidebar />
        <Box flex="1" minW="0">
          <Box minH="100vh">
            <Routes>
              {getRoutes(routes)}
              <Route path="/" element={<Navigate to="/admin/load-forecast" replace />} />
            </Routes>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
