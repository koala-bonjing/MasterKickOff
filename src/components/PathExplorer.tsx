'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Paper,
  Title,
  Text,
  Button,
  Badge,
  Skeleton,
  Alert,
} from '@mantine/core';
import {
  IconArrowRight,
  IconDisc,
  IconUsers,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';
import { ArtistSelect } from './ArtistSelect';
import { ShortestPathResult, PathHop } from '@/lib/queries';

const SAMPLE_PAIRS = [
  { start: 'dave-grohl', target: 'eminem', label: 'Dave Grohl → Eminem' },
  { start: 'miles-davis', target: 'bruno-mars', label: 'Miles Davis → Bruno Mars' },
  { start: 'daft-punk', target: 'eminem', label: 'Daft Punk → Eminem' },
  { start: 'paul-mccartney', target: 'kendrick-lamar', label: 'McCartney → Kendrick' },
  { start: 'jack-white', target: 'beyonce', label: 'Jack White → Beyoncé' },
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

  // Build a flat chain from hops: [Artist, Via, Artist, Via, Artist, ...]
  const buildChain = (hops: PathHop[]) => {
    if (!hops.length) return [];
    type ChainNode = 
      | { kind: 'artist'; id: string; name: string }
      | { kind: 'bridge'; type: string; name: string; details?: string };

    const chain: ChainNode[] = [];
    chain.push({ kind: 'artist', id: hops[0].fromArtist.id, name: hops[0].fromArtist.name });
    for (const hop of hops) {
      chain.push({ kind: 'bridge', type: hop.via.type, name: hop.via.titleOrName, details: hop.via.details });
      chain.push({ kind: 'artist', id: hop.toArtist.id, name: hop.toArtist.name });
    }
    return chain;
  };

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <Paper className="p-6 sm:p-8 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="max-w-3xl mb-6">
          <Title order={2} className="text-2xl sm:text-3xl font-extrabold text-white">
            Six Degrees of Collaboration
          </Title>
          <Text className="text-slate-400 text-sm mt-1">
            Find the shortest chain of songs and bands connecting any two musicians.
          </Text>
        </div>

        {/* Input Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center mb-6">
          <div className="md:col-span-5">
            <ArtistSelect
              label="From"
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
              title="Swap"
            >
              ⇄
            </Button>
          </div>

          <div className="md:col-span-5">
            <ArtistSelect
              label="To"
              value={targetId}
              onChange={setTargetId}
              excludeId={startId}
            />
          </div>
        </div>

        {/* Quick Samples */}
        <div className="flex flex-wrap gap-2">
          <Text size="xs" className="text-slate-500 self-center mr-1">Try:</Text>
          {SAMPLE_PAIRS.map((pair) => (
            <button
              key={pair.label}
              className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/40 rounded-lg transition-colors"
              onClick={() => {
                setStartId(pair.start);
                setTargetId(pair.target);
              }}
            >
              {pair.label}
            </button>
          ))}
        </div>
      </Paper>

      {/* Loading */}
      {isLoading && (
        <Paper className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <Skeleton height={24} width="30%" radius="md" />
          <Skeleton height={80} radius="xl" />
        </Paper>
      )}

      {/* Error */}
      {isError && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title="Query failed"
          color="red"
          variant="filled"
          className="rounded-xl"
        >
          <Text size="sm">{(error as any)?.message || 'Failed to retrieve path.'}</Text>
          <Button size="xs" variant="white" color="red" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Path Result — Linear Chain */}
      {result && result.found && (() => {
        const chain = buildChain(result.hops);
        return (
          <div className="space-y-5 animate-fadeIn">
            {/* Summary */}
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <Badge size="md" color="indigo" variant="light" className="font-mono">
                {result.degreesOfSeparation} degree{result.degreesOfSeparation === 1 ? '' : 's'}
              </Badge>
              <span>·</span>
              <span>{result.totalHops} edge{result.totalHops === 1 ? '' : 's'} traversed</span>
            </div>

            {/* The Chain */}
            <Paper className="p-6 sm:p-8 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {chain.map((node, i) => {
                  if (node.kind === 'artist') {
                    const isEndpoint = i === 0 || i === chain.length - 1;
                    return (
                      <button
                        key={`${node.id}-${i}`}
                        onClick={() => onSelectArtist?.(node.id)}
                        className={`
                          group relative px-4 py-2.5 rounded-xl transition-all duration-200
                          ${isEndpoint
                            ? 'bg-indigo-600/20 border-2 border-indigo-500/50 text-white hover:bg-indigo-600/30 hover:border-indigo-400'
                            : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:bg-slate-700/80 hover:border-slate-600'
                          }
                        `}
                      >
                        <span className="font-semibold text-sm">{node.name}</span>
                      </button>
                    );
                  } else {
                    // Bridge node (track or band)
                    return (
                      <div key={`bridge-${i}`} className="flex items-center gap-2">
                        <IconArrowRight size={14} className="text-slate-600 shrink-0" />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/40 border border-indigo-900/30 rounded-lg">
                          {node.type === 'Track' ? (
                            <IconDisc size={12} className="text-indigo-400 shrink-0" />
                          ) : (
                            <IconUsers size={12} className="text-blue-400 shrink-0" />
                          )}
                          <span className="text-xs text-indigo-300 font-medium whitespace-nowrap">
                            {node.name}
                          </span>
                        </div>
                        <IconArrowRight size={14} className="text-slate-600 shrink-0" />
                      </div>
                    );
                  }
                })}
              </div>
            </Paper>

            {/* Technical Note — toned down */}
            <details className="group">
              <summary className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                <IconInfoCircle size={14} />
                <span>How this query works</span>
              </summary>
              <div className="mt-2 p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl text-xs text-slate-400 leading-relaxed">
                The Cypher query{' '}
                <code className="text-indigo-300 font-mono bg-slate-900 px-1 py-0.5 rounded text-[11px]">
                  shortestPath((a)-[:PERFORMED_ON|MEMBER_OF*..12]-(b))
                </code>{' '}
                runs a breadth-first traversal along physical relationship pointers. In a relational database, 
                this would require recursive CTEs and exponential joins across multiple tables.
              </div>
            </details>
          </div>
        );
      })()}

      {/* No path found */}
      {result && !result.found && (
        <Paper className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-2">
          <Text size="sm" className="text-slate-400">
            No collaboration path found between these artists within 12 hops.
          </Text>
          <Text size="xs" className="text-slate-500">Try a different pair.</Text>
        </Paper>
      )}
    </div>
  );
}
