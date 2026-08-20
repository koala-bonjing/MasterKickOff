'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Badge,
  Skeleton,
  Alert,
  Card,
  Divider,
} from '@mantine/core';
import {
  IconHierarchy2,
  IconArrowRight,
  IconDisc,
  IconUsers,
  IconSparkles,
  IconInfoCircle,
  IconAlertTriangle,
  IconRefresh,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { ArtistSelect } from './ArtistSelect';
import { ShortestPathResult, PathHop } from '@/lib/queries';

const SAMPLE_PAIRS = [
  { start: 'dave-grohl', target: 'eminem', label: 'Dave Grohl ➔ Eminem', note: 'Rock ➔ Rap (via McCartney & Rihanna)' },
  { start: 'miles-davis', target: 'bruno-mars', label: 'Miles Davis ➔ Bruno Mars', note: 'Jazz ➔ Pop (via Prince, Beyoncé, Gaga)' },
  { start: 'daft-punk', target: 'eminem', label: 'Daft Punk ➔ Eminem', note: 'French House ➔ Hip-Hop (via Pharrell & Dre)' },
  { start: 'paul-mccartney', target: 'kendrick-lamar', label: 'Paul McCartney ➔ Kendrick', note: 'The Beatles ➔ Pulitzer Rap' },
  { start: 'jack-white', target: 'beyonce', label: 'Jack White ➔ Beyoncé', note: 'Garage Rock ➔ R&B (Lemonade collab)' },
];

export function PathExplorer({
  onSelectArtist,
}: {
  onSelectArtist?: (artistId: string) => void;
}) {
  const [startId, setStartId] = useState<string | null>('dave-grohl');
  const [targetId, setTargetId] = useState<string | null>('eminem');

  const {
    data: pathData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ success: boolean; data: ShortestPathResult; meta?: any }>({
    queryKey: ['shortest-path', startId, targetId],
    queryFn: async () => {
      if (!startId || !targetId) return null;
      const res = await fetch(`/api/path?start=${encodeURIComponent(startId)}&target=${encodeURIComponent(targetId)}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson?.error?.message || 'Failed to calculate shortest path');
      }
      return res.json();
    },
    enabled: Boolean(startId && targetId),
    staleTime: 60000,
  });

  const result = pathData?.data;

  const handleSwap = () => {
    const temp = startId;
    setStartId(targetId);
    setTargetId(temp);
  };

  return (
    <div className="space-y-8">
      {/* Search Header Card */}
      <Paper className="p-6 sm:p-8 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="max-w-3xl mb-6">
          <Badge
            size="lg"
            variant="gradient"
            gradient={{ from: 'indigo', to: 'violet' }}
            leftSection={<IconHierarchy2 size={14} />}
            className="mb-2"
          >
            Variable-Length Graph Traversal
          </Badge>
          <Title order={2} className="text-2xl sm:text-3xl font-extrabold text-white">
            Six Degrees of Collaboration
          </Title>
          <Text className="text-slate-400 text-sm mt-1">
            Discover the exact chain of songs and bands bridging any two musicians across genres and decades.
          </Text>
        </div>

        {/* Input Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center mb-6">
          <div className="md:col-span-5">
            <ArtistSelect
              label="Starting Musician"
              value={startId}
              onChange={setStartId}
              excludeId={targetId}
            />
          </div>

          <div className="md:col-span-1 flex justify-center pt-5">
            <Button
              size="sm"
              variant="light"
              color="indigo"
              onClick={handleSwap}
              disabled={!startId || !targetId}
              className="rounded-full w-10 h-10 p-0 hover:rotate-180 transition-transform duration-300"
              title="Swap Start & Target"
            >
              ⇄
            </Button>
          </div>

          <div className="md:col-span-5">
            <ArtistSelect
              label="Target Musician"
              value={targetId}
              onChange={setTargetId}
              excludeId={startId}
            />
          </div>
        </div>

        {/* Quick Sample Chips */}
        <div>
          <Text size="xs" fw={600} className="text-slate-400 uppercase tracking-wider mb-2.5">
            💡 Interesting Collaboration Chains:
          </Text>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PAIRS.map((pair) => (
              <Button
                key={pair.label}
                size="xs"
                variant="subtle"
                color="indigo"
                className="bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50 rounded-lg text-xs"
                onClick={() => {
                  setStartId(pair.start);
                  setTargetId(pair.target);
                }}
              >
                {pair.label}
              </Button>
            ))}
          </div>
        </div>
      </Paper>

      {/* Results View */}
      {isLoading && (
        <Paper className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <Skeleton height={30} width="40%" radius="md" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Skeleton height={140} radius="xl" />
            <Skeleton height={140} radius="xl" />
            <Skeleton height={140} radius="xl" />
          </div>
        </Paper>
      )}

      {isError && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title="Query Execution Error"
          color="red"
          variant="filled"
          className="rounded-xl"
        >
          <Text size="sm">{(error as any)?.message || 'Failed to retrieve collaboration path from CognoDB Cloud.'}</Text>
          <Button size="xs" variant="white" color="red" className="mt-3" onClick={() => refetch()}>
            Retry Query
          </Button>
        </Alert>
      )}

      {result && result.found && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Banner */}
          <Paper className="p-6 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <IconSparkles className="w-5 h-5 text-indigo-400" />
                <Title order={3} className="text-xl font-bold text-white">
                  Path Discovered!
                </Title>
              </div>
              <Text size="sm" className="text-slate-300">
                Connected in{' '}
                <span className="font-bold text-indigo-300">
                  {result.degreesOfSeparation} degree{result.degreesOfSeparation === 1 ? '' : 's'} of separation
                </span>{' '}
                ({result.totalHops} graph edge traversals).
              </Text>
            </div>

            <Group gap="xs">
              <Badge size="lg" color="indigo" variant="light">
                {result.hops.length} Shared Bridge{result.hops.length === 1 ? '' : 's'}
              </Badge>
            </Group>
          </Paper>

          {/* Stepper Chain of Collaboration Cards */}
          <div className="relative space-y-4">
            {result.hops.map((hop: PathHop, index: number) => (
              <div key={index} className="flex flex-col md:flex-row items-stretch gap-3 group">
                {/* Step Number Badge */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/50 flex items-center justify-center font-bold text-xs text-indigo-300 shadow-md">
                    {index + 1}
                  </div>
                </div>

                {/* Collaboration Block */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-11 gap-3 p-4 bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all shadow-lg">
                  {/* Left Artist */}
                  <div
                    className="md:col-span-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 cursor-pointer hover:bg-slate-800/60 transition-colors"
                    onClick={() => onSelectArtist?.(hop.fromArtist.id)}
                  >
                    <div className="flex items-center justify-between">
                      <Text size="xs" c="dimmed" fw={600} className="uppercase">
                        Musician
                      </Text>
                      <Badge size="xs" variant="dot" color="indigo">
                        Degree {index}
                      </Badge>
                    </div>
                    <Text fw={700} className="text-white text-base mt-1 group-hover:text-indigo-300 transition-colors">
                      {hop.fromArtist.name}
                    </Text>
                  </div>

                  {/* Bridge (Track or Band) */}
                  <div className="md:col-span-3 flex flex-col justify-center items-center text-center p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl">
                    <div className="flex items-center gap-1.5 text-indigo-400 mb-0.5">
                      {hop.via.type === 'Track' ? <IconDisc size={16} /> : <IconUsers size={16} />}
                      <Text size="xs" fw={700} className="uppercase tracking-wide">
                        Shared {hop.via.type}
                      </Text>
                    </div>
                    <Text fw={700} size="sm" className="text-indigo-200 line-clamp-1">
                      "{hop.via.titleOrName}"
                    </Text>
                    {hop.via.details && (
                      <Text size="xs" c="dimmed">
                        {hop.via.details}
                      </Text>
                    )}
                  </div>

                  {/* Right Artist */}
                  <div
                    className="md:col-span-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 cursor-pointer hover:bg-slate-800/60 transition-colors"
                    onClick={() => onSelectArtist?.(hop.toArtist.id)}
                  >
                    <div className="flex items-center justify-between">
                      <Text size="xs" c="dimmed" fw={600} className="uppercase">
                        Musician
                      </Text>
                      <Badge size="xs" variant="dot" color="teal">
                        Degree {index + 1}
                      </Badge>
                    </div>
                    <Text fw={700} className="text-white text-base mt-1 group-hover:text-indigo-300 transition-colors">
                      {hop.toArtist.name}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Technical Insight Box */}
          <Paper className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <IconInfoCircle size={16} />
              <span>How CognoDB / openCypher Solved This:</span>
            </div>
            <p>
              Executing <code className="text-indigo-300 font-mono bg-slate-900 px-1 py-0.5 rounded">shortestPath((a)-[:PERFORMED_ON|MEMBER_OF*..12]-(b))</code> uses breadth-first graph traversal along physical relationship pointers. In a relational database, finding paths of unknown length requires recursive SQL CTEs and exponential Cartesian joins across 4 tables.
            </p>
          </Paper>
        </div>
      )}

      {result && !result.found && (
        <Paper className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-3">
          <IconHierarchy2 className="w-12 h-12 text-slate-600 mx-auto" />
          <Title order={3} className="text-xl font-bold text-slate-300">
            No Collaboration Path Found
          </Title>
          <Text size="sm" className="text-slate-400 max-w-md mx-auto">
            These two artists do not share an interconnected chain of tracks or bands within 12 hops in the current dataset. Try selecting a different pair!
          </Text>
        </Paper>
      )}
    </div>
  );
}
