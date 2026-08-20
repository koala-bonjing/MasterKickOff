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
  Button,
} from '@mantine/core';
import {
  IconUsers,
  IconAlertTriangle,
  IconMusic,
} from '@tabler/icons-react';
import { ArtistSelect } from './ArtistSelect';
import { RecommendationResult } from '@/lib/queries';

interface RecommendationsViewProps {
  onSelectArtist: (artistId: string) => void;
  onExplorePath: (fromId: string, toId: string) => void;
}

export function RecommendationsView({
  onSelectArtist,
  onExplorePath,
}: RecommendationsViewProps) {
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>('kendrick-lamar');

  const {
    data: recsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ success: boolean; data: RecommendationResult[] }>({
    queryKey: ['recommendations', selectedArtistId],
    queryFn: async () => {
      if (!selectedArtistId) return { success: true, data: [] };
      const res = await fetch(`/api/recommendations?artistId=${encodeURIComponent(selectedArtistId)}&limit=12`);
      if (!res.ok) throw new Error('Failed to generate recommendations');
      return res.json();
    },
    enabled: Boolean(selectedArtistId),
    staleTime: 60000,
  });

  const recs = recsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <Title order={2} className="text-2xl sm:text-3xl font-extrabold text-white">
          Recommendations
        </Title>
        <Text className="text-slate-400 text-sm mt-1">
          Artists connected through mutual collaborators who haven't shared a track yet.
        </Text>

        <div className="max-w-md mt-4">
          <ArtistSelect
            label="Select an artist"
            value={selectedArtistId}
            onChange={setSelectedArtistId}
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Paper key={i} className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <Skeleton height={20} width="60%" />
              <Skeleton height={14} width="40%" />
              <Skeleton height={60} />
            </Paper>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {isError && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title="Recommendation query error"
          color="red"
          variant="filled"
          className="rounded-xl"
        >
          <Text size="sm">{(error as any)?.message || 'Failed to fetch recommendations.'}</Text>
          <Button size="xs" variant="white" color="red" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Recommendations Grid */}
      {selectedArtistId && !isLoading && recs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recs.map((rec, idx) => (
            <Paper
              key={rec.id}
              className="p-5 bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge size="sm" variant="light" color="purple">
                    {rec.mutualCollabs} Mutual Connection{rec.mutualCollabs === 1 ? '' : 's'}
                  </Badge>
                  <Badge size="xs" variant="outline" color="indigo">
                    {rec.genre}
                  </Badge>
                </div>

                <Title order={4} className="text-lg font-bold text-white mb-1">
                  {rec.name}
                </Title>

                {rec.bio && (
                  <Text size="xs" className="text-slate-400 line-clamp-2 mb-3">
                    {rec.bio}
                  </Text>
                )}

                {/* Mutual Collaborators Box */}
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl my-3">
                  <Text size="xs" c="dimmed" fw={600} className="mb-1.5 flex items-center gap-1 text-purple-300">
                    <IconUsers size={12} />
                    Connected Via Mutual Collaborators:
                  </Text>
                  <div className="flex flex-wrap gap-1">
                    {rec.sampleMutuals.map((mutual) => (
                      <Badge key={mutual} size="xs" variant="dot" color="teal">
                        {mutual}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
                <Button
                  size="xs"
                  variant="light"
                  color="purple"
                  className="flex-1 rounded-lg"
                  onClick={() => onSelectArtist(rec.id)}
                >
                  View Profile
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="indigo"
                  className="rounded-lg"
                  onClick={() => onExplorePath(selectedArtistId, rec.id)}
                  title="Discover collaboration path"
                >
                  See 2-Hop Path ➔
                </Button>
              </div>
            </Paper>
          ))}
        </div>
      )}

      {selectedArtistId && !isLoading && recs.length === 0 && (
        <Paper className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-3">
          <IconMusic className="w-12 h-12 text-slate-600 mx-auto" />
          <Title order={3} className="text-xl font-bold text-slate-300">
            No 2-Hop Recommendations Found
          </Title>
          <Text size="sm" className="text-slate-400 max-w-md mx-auto">
            This artist has either collaborated with everyone in their immediate orbit or has no 2nd-degree network in the current dataset. Try another artist!
          </Text>
        </Paper>
      )}
    </div>
  );
}
