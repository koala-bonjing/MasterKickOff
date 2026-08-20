'use client';

import React, { useState } from 'react';
import { Container } from '@mantine/core';
import { Navbar, ActiveTab } from '@/components/Navbar';
import { PathExplorer } from '@/components/PathExplorer';
import { HubsView } from '@/components/HubsView';
import { RecommendationsView } from '@/components/RecommendationsView';
import { NeighborhoodView } from '@/components/NeighborhoodView';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('path');
  const [selectedArtistForNeighborhood, setSelectedArtistForNeighborhood] = useState<string | null>('dave-grohl');

  const handleSelectArtistForNeighborhood = (artistId: string) => {
    setSelectedArtistForNeighborhood(artistId);
    setActiveTab('neighborhood');
  };

  const handleExplorePathFromArtist = (fromArtistId: string) => {
    setActiveTab('path');
  };

  return (
    <div className="min-h-screen flex flex-col bg-graph-bg text-slate-100">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 py-8 px-4">
        <Container size="xl">
          {activeTab === 'path' && (
            <PathExplorer onSelectArtist={handleSelectArtistForNeighborhood} />
          )}

          {activeTab === 'hubs' && (
            <HubsView
              onSelectArtist={handleSelectArtistForNeighborhood}
              onExplorePath={handleExplorePathFromArtist}
            />
          )}

          {activeTab === 'recommendations' && (
            <RecommendationsView
              onSelectArtist={handleSelectArtistForNeighborhood}
              onExplorePath={(fromId, toId) => {
                setActiveTab('path');
              }}
            />
          )}

          {activeTab === 'neighborhood' && (
            <NeighborhoodView
              initialArtistId={selectedArtistForNeighborhood}
              onExplorePath={(fromId, toId) => {
                setActiveTab('path');
              }}
            />
          )}
        </Container>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md text-center text-xs text-slate-500">
        <Container size="xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>SoundGraph &copy; 2026 &mdash; Wexa AI Take-Home Graph Platform</p>
            <p className="text-slate-400">
              Powered by <span className="text-indigo-400 font-semibold">CognoDB Cloud</span> &bull; openCypher &bull; Next.js 14
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
