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
      <footer className="py-5 border-t border-slate-800/50 bg-slate-950/40 text-center text-xs text-slate-500">
        <Container size="xl">
          <p>
            Built with <span className="text-indigo-400">CognoDB Cloud</span> · openCypher · Next.js 14
          </p>
        </Container>
      </footer>
    </div>
  );
}
