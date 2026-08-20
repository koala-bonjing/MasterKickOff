'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, Group, Text, Badge, Loader } from '@mantine/core';
import { IconMicrophone } from '@tabler/icons-react';
import { ArtistSummary } from '@/lib/queries';

interface ArtistSelectProps {
  label: string;
  placeholder?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  excludeId?: string | null;
}

export function ArtistSelect({
  label,
  placeholder = 'Type artist name or genre...',
  value,
  onChange,
  excludeId,
}: ArtistSelectProps) {
  const { data: artists = [], isLoading } = useQuery<ArtistSummary[]>({
    queryKey: ['artists-all'],
    queryFn: async () => {
      const res = await fetch('/api/artists?limit=100');
      if (!res.ok) throw new Error('Failed to fetch artists');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const selectData = artists
    .filter((a) => a.id !== excludeId)
    .map((a) => ({
      value: a.id,
      label: a.name,
      genre: a.genre,
    }));

  return (
    <Select
      label={label}
      placeholder={placeholder}
      data={selectData}
      value={value}
      onChange={onChange}
      searchable
      clearable
      nothingFoundMessage={isLoading ? 'Loading artists...' : 'No artists found'}
      rightSection={isLoading ? <Loader size={16} /> : <IconMicrophone size={16} className="text-slate-400" />}
      renderOption={({ option }) => {
        const artist = artists.find((a) => a.id === option.value);
        return (
          <Group gap="sm" justify="space-between" className="w-full py-1">
            <div>
              <Text size="sm" fw={500} className="text-slate-100">
                {option.label}
              </Text>
              {artist?.genre && (
                <Text size="xs" c="dimmed">
                  {artist.genre}
                </Text>
              )}
            </div>
            <Badge size="xs" variant="dot" color="indigo">
              Artist
            </Badge>
          </Group>
        );
      }}
      styles={{
        input: {
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          color: '#f8fafc',
          borderRadius: '0.75rem',
          height: '2.85rem',
        },
        dropdown: {
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          borderRadius: '0.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        },
        option: {
          borderRadius: '0.5rem',
          margin: '2px 0',
        },
      }}
    />
  );
}
