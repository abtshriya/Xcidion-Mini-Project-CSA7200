import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export const AppLayout = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDemoInjected = () => {
    // Triggers refresh in active page views
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}>
      <Header onDemoInjected={handleDemoInjected} />
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <Outlet context={{ refreshKey }} />
      </main>
    </div>
  );
};

