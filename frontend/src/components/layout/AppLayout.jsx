import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDemoInjected = () => {
    // Triggers refresh in active page views
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header onDemoInjected={handleDemoInjected} />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet context={{ refreshKey }} />
        </main>
      </div>
    </div>
  );
};
