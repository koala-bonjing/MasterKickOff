'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Tooltip, Loader } from '@mantine/core';
import { IconCircleFilled, IconAlertCircle } from '@tabler/icons-react';

interface HealthData {
  status: string;
  serverAgent: string;
  protocol: string;
  address: string;
  latencyMs: number;
  totalArtists: number;
}

export function StatusBadge() {
  const { data, isLoading, isError, refetch } = useQuery<{ success: boolean; data: HealthData }>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error('Database unreachable');
      }
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Badge size="md" variant="outline" color="gray" leftSection={<Loader size={10} color="gray" />}>
        Connecting...
      </Badge>
    );
  }

  if (isError || !data?.data) {
    return (
      <Tooltip label="CognoDB Cloud is currently unreachable. Click to retry." withArrow>
        <Badge
          size="md"
          variant="filled"
          color="red"
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => refetch()}
          leftSection={<IconAlertCircle size={12} />}
        >
          DB Offline
        </Badge>
      </Tooltip>
    );
  }

  const health = data.data;

  return (
    <Tooltip
      label={
        <div className="text-xs space-y-1 p-1">
          <p className="font-semibold text-emerald-400">CognoDB Cloud (Active)</p>
          <p>Protocol: {health.protocol}</p>
          <p>Server: {health.serverAgent}</p>
          <p>Latency: {health.latencyMs}ms</p>
          <p>Live Artists: {health.totalArtists}</p>
        </div>
      }
      withArrow
    >
      <Badge
        size="md"
        variant="light"
        color="teal"
        className="cursor-help font-mono"
        leftSection={<IconCircleFilled size={8} className="text-emerald-400 animate-pulse" />}
      >
        Bolt Connected ({health.latencyMs}ms)
      </Badge>
    </Tooltip>
  );
}
