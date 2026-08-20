'use client';

import React, { useState } from 'react';
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
  Divider,
} from '@mantine/core';
import {
  IconGraph,
  IconUsers,
  IconDisc,
  IconArrowRight,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';
import { ArtistSelect } from './ArtistSelect';
import { GraphCanvas } from './GraphCanvas';
import { ArtistNeighborhood, SubgraphNode } from '@/lib/queries';

interface NeighborhoodViewProps {
  initialArtistId?: string | null;
  onExplorePath: (fromId: string, toId: string) => void;
}

export function NeighborhoodView({
  initialArtistId = 'paul-mccartney',
  onExplorePath,
}: NeighborhoodViewProps) {
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(initialArtistId || 'paul-mccartney');

  const {
    data: hoodData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ success: boolean; data: ArtistNeighborhood }>({
    queryKey: ['neighborhood', selectedArtistId],
    queryFn: async () => {
      if (!selectedArtistId) return null;
      const res = await fetch(`/api/artists/${encodeURIComponent(selectedArtistId)}`);
      if (!res.ok) throw new Error('Failed to fetch artist neighborhood');
      return res.json();
    },
    enabled: Boolean(selectedArtistId),
    staleTime: 60000,
  });

  const hood = hoodData?.data;

  const handleNodeClick = (node: SubgraphNode) => {
    if (node.type === 'artist' && node.id !== selectedArtistId) {
      setSelectedArtistId(node.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Paper className="p-6 sm:p-8 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <Badge
          size="lg"
          variant="gradient"
          gradient={{ from: 'cyan', to: 'indigo' }}
          leftSection={<IconGraph size={14} />}
          className="mb-2"
        >
          Direct & 2-Hop Local Subgraph
        </Badge>
        <Title order={2} className="text-2xl sm:text-3xl font-extrabold text-white">
          Visual Neighborhood Explorer
        </Title>
        <Text className="text-slate-400 text-sm mt-1 max-w-2xl">
          Inspect any musician's direct collaboration cluster in a force-directed interactive node graph.
        </Text>

        <div className="max-w-md mt-6">
          <ArtistSelect
            label="Select Center Artist to Inspect:"
            value={selectedArtistId}
            onChange={setSelectedArtistId}
          />
        </div>
      </Paper>

      {/* Loading Skeleton */}
      {isLoading && (
        <Paper className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <Skeleton height={400} radius="xl" />
        </Paper>
      )}

      {/* Error Alert */}
      {isError && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title="Neighborhood query error"
          color="red"
          variant="filled"
          className="rounded-xl"
        >
          <Text size="sm">{(error as any)?.message || 'Unable to load local subgraph.'}</Text>
          <Button size="xs" variant="white" color="red" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}

      {hood && (
        <div className="space-y-6">
          {/* Force Directed Interactive Canvas */}
          <GraphCanvas
            nodes={hood.nodes}
            links={hood.links}
            onNodeClick={handleNodeClick}
            height={520}
          />

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Summary */}
            <Paper className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl md:col-span-1 space-y-4 shadow-xl">
              <div>
                <Badge size="sm" variant="light" color="indigo" className="mb-2">
                  {hood.artist.genre}
                </Badge>
                <Title order={3} className="text-xl font-bold text-white">
                  {hood.artist.name}
                </Title>
              </div>

              {hood.artist.bio && (
                <Text size="sm" className="text-slate-400">
                  {hood.artist.bio}
                </Text>
              )}

              <Divider className="border-slate-800" />

              <div className="space-y-2">
                <Text size="xs" c="dimmed" fw={600} className="uppercase">
                  Network Statistics:
                </Text>
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Direct Collaborators:</span>
                  <span className="font-bold text-white">{hood.directCollaborators.length}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Bands / Groups:</span>
                  <span className="font-bold text-white">{hood.bands.length}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Associated Tracks:</span>
                  <span className="font-bold text-white">{hood.tracks.length}</span>
                </div>
              </div>
            </Paper>

            {/* Direct Collaborators List */}
            <Paper className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl md:col-span-2 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <Title order={4} className="text-lg font-bold text-white">
                  Direct Collaborators ({hood.directCollaborators.length})
                </Title>
                <Text size="xs" c="dimmed">
                  Click any musician to find the path connecting them
                </Text>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {hood.directCollaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between hover:border-indigo-500/40 transition-colors"
                  >
                    <div>
                      <Text size="sm" fw={600} className="text-slate-100">
                        {collab.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {collab.genre}
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="indigo"
                      onClick={() => onExplorePath(hood.artist.id, collab.id)}
                    >
                      Path ➔
                    </Button>
                  </div>
                ))}
              </div>
            </Paper>
          </div>
        </div>
      )}
    </div>
  );
}
