'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Paper,
  Title,
  Text,
  Badge,
  Skeleton,
  Alert,
  Group,
  Button,
  Avatar,
  Table,
} from '@mantine/core';
import {
  IconTrophy,
  IconUsers,
  IconDisc,
  IconArrowRight,
  IconAlertTriangle,
  IconSparkles,
} from '@tabler/icons-react';
import { HubArtistResult } from '@/lib/queries';

interface HubsViewProps {
  onSelectArtist: (artistId: string) => void;
  onExplorePath: (artistId: string) => void;
}

export function HubsView({ onSelectArtist, onExplorePath }: HubsViewProps) {
  const { data: hubsData, isLoading, isError, error, refetch } = useQuery<{
    success: boolean;
    data: HubArtistResult[];
  }>({
    queryKey: ['hubs'],
    queryFn: async () => {
      const res = await fetch('/api/hubs?limit=20');
      if (!res.ok) throw new Error('Failed to fetch most connected artists');
      return res.json();
    },
    staleTime: 60000,
  });

  const hubs = hubsData?.data || [];

  const getRankBadge = (rank: number) => {
    if (rank === 0) return <Badge size="lg" color="yellow" variant="filled" className="font-bold shadow-lg shadow-yellow-500/20">🥇 #1 Hub</Badge>;
    if (rank === 1) return <Badge size="lg" color="gray" variant="filled" className="font-bold">🥈 #2 Hub</Badge>;
    if (rank === 2) return <Badge size="lg" color="orange" variant="filled" className="font-bold">🥉 #3 Hub</Badge>;
    return <Badge size="md" color="slate" variant="outline" className="text-slate-400">#{rank + 1}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Paper className="p-6 sm:p-8 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <Badge
          size="lg"
          variant="gradient"
          gradient={{ from: 'amber', to: 'orange' }}
          leftSection={<IconTrophy size={14} />}
          className="mb-2"
        >
          Degree Centrality Aggregation
        </Badge>
        <Title order={2} className="text-2xl sm:text-3xl font-extrabold text-white">
          Industry Super-Hubs
        </Title>
        <Text className="text-slate-400 text-sm mt-1 max-w-2xl">
          The most connected musicians in the graph network, ranked by total distinct direct collaborators across songs, bands, and featured credits.
        </Text>
      </Paper>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Paper key={i} className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <Skeleton height={20} width="60%" />
              <Skeleton height={14} width="40%" />
              <Skeleton height={40} />
            </Paper>
          ))}
        </div>
      )}

      {isError && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title="Error loading network hubs"
          color="red"
          variant="filled"
          className="rounded-xl"
        >
          <Text size="sm">{(error as any)?.message || 'Unable to compute degree centrality from database.'}</Text>
          <Button size="xs" variant="white" color="red" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}

      {hubs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hubs.map((artist, index) => (
            <Paper
              key={artist.id}
              className={`p-5 bg-slate-900/90 border rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                index < 3 ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getRankBadge(index)}
                  <Badge size="xs" variant="light" color="indigo">
                    {artist.genre}
                  </Badge>
                </div>

                <Title order={4} className="text-lg font-bold text-white mb-1">
                  {artist.name}
                </Title>

                {artist.bio && (
                  <Text size="xs" className="text-slate-400 line-clamp-2 mb-4">
                    {artist.bio}
                  </Text>
                )}

                <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <IconUsers className="w-4 h-4 text-indigo-400" />
                    <div>
                      <Text size="xs" c="dimmed">Collaborators</Text>
                      <Text fw={700} size="sm" className="text-white">{artist.collaboratorCount}</Text>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconDisc className="w-4 h-4 text-emerald-400" />
                    <div>
                      <Text size="xs" c="dimmed">Credits/Tracks</Text>
                      <Text fw={700} size="sm" className="text-white">{artist.trackCount}</Text>
                    </div>
                  </div>
                </div>

                {artist.bands.length > 0 && (
                  <div className="mb-4">
                    <Text size="xs" c="dimmed" className="mb-1">Bands:</Text>
                    <div className="flex flex-wrap gap-1">
                      {artist.bands.map((b) => (
                        <Badge key={b} size="xs" variant="outline" color="blue">
                          {b}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
                <Button
                  size="xs"
                  variant="light"
                  color="indigo"
                  className="flex-1 rounded-lg"
                  onClick={() => onSelectArtist(artist.id)}
                >
                  Visual Subgraph
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  className="rounded-lg"
                  onClick={() => onExplorePath(artist.id)}
                  title="Use as starting point in Six Degrees"
                >
                  Find Path ➔
                </Button>
              </div>
            </Paper>
          ))}
        </div>
      )}
    </div>
  );
}
