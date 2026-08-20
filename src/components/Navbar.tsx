'use client';

import React from 'react';
import { Group, Title, Button, Container } from '@mantine/core';
import {
  IconHierarchy2,
  IconTrophy,
  IconSparkles,
  IconGraph,
  IconBrandGithub,
} from '@tabler/icons-react';
import { StatusBadge } from './StatusBadge';

export type ActiveTab = 'path' | 'hubs' | 'recommendations' | 'neighborhood';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
      <Container size="xl" className="py-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('path')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <IconHierarchy2 className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Title order={3} className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  SoundGraph
                </Title>
              </div>
              <p className="text-xs text-slate-400">Six Degrees of Music Collaboration</p>
            </div>
          </div>

          <Group gap="xs" className="bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <Button
              size="xs"
              variant={activeTab === 'path' ? 'filled' : 'subtle'}
              color="indigo"
              leftSection={<IconHierarchy2 size={14} />}
              onClick={() => onTabChange('path')}
              className="transition-all"
            >
              Shortest Path
            </Button>
            <Button
              size="xs"
              variant={activeTab === 'hubs' ? 'filled' : 'subtle'}
              color="indigo"
              leftSection={<IconTrophy size={14} />}
              onClick={() => onTabChange('hubs')}
              className="transition-all"
            >
              Industry Hubs
            </Button>
            <Button
              size="xs"
              variant={activeTab === 'recommendations' ? 'filled' : 'subtle'}
              color="indigo"
              leftSection={<IconSparkles size={14} />}
              onClick={() => onTabChange('recommendations')}
              className="transition-all"
            >
              2-Hop Recs
            </Button>
            <Button
              size="xs"
              variant={activeTab === 'neighborhood' ? 'filled' : 'subtle'}
              color="indigo"
              leftSection={<IconGraph size={14} />}
              onClick={() => onTabChange('neighborhood')}
              className="transition-all"
            >
              Visual Graph
            </Button>
          </Group>

          <div className="flex items-center gap-3">
            <StatusBadge />
          </div>
        </div>
      </Container>
    </header>
  );
}
