import React, { useState } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { AppLayout } from './components/layout/AppLayout';

// 11 Core Modules
import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { ProductionView } from './views/ProductionView';
import { QualityView } from './views/QualityView';
import { OrdersView } from './views/OrdersView';
import { DispatchView } from './views/DispatchView';
import { WorkforceView } from './views/WorkforceView';
import { CostingView } from './views/CostingView';
import { InsightsView } from './views/InsightsView';
import { FloorMapView } from './views/FloorMapView';
import { SettingsView } from './views/SettingsView';

// Standalone Views
import { PublicTrackingView } from './views/PublicTrackingView';
import { RollPassportView } from './views/RollPassportView';
import { MobileFloorModeView } from './views/MobileFloorModeView';
import { LoginLandingView } from './views/LoginLandingView';

import { DEMO_ROLES, ROLE_MAP } from './auth/roles';
import { api } from './api/client';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('loomdo_authenticated') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const savedRole = localStorage.getItem('loomdo_role');
    return ROLE_MAP[savedRole] || DEMO_ROLES[0];
  });
  const [activeTab, setActiveTab] = useState(() => {
    const savedRole = localStorage.getItem('loomdo_role');
    const role = ROLE_MAP[savedRole] || DEMO_ROLES[0];
    return role.defaultTab || 'dashboard';
  });
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState('ORD-2026-001');
  const [selectedPassportRoll, setSelectedPassportRoll] = useState('ROLL-20261001-0001');
  const { showToast } = useToast();

  const handleLogin = (role) => {
    const targetRole = role || DEMO_ROLES[0];
    setCurrentUser(targetRole);
    setIsAuthenticated(true);
    localStorage.setItem('loomdo_authenticated', 'true');
    localStorage.setItem('loomdo_role', targetRole.id);
    setActiveTab(targetRole.defaultTab || 'dashboard');
    showToast(`Signed in as ${targetRole.title} (${targetRole.name})`, 'success');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('loomdo_authenticated');
    showToast('Signed out to Loomdo login screen', 'info');
  };

  const handleTriggerSimTick = async () => {
    try {
      await api.simulateTick();
      showToast('Simulated machine tick pulsed! Running machines incremented.', 'success');
    } catch (err) {
      showToast('Simulation tick error: ' + err.message, 'error');
    }
  };

  const handleOpenTracking = (orderNumber) => {
    setSelectedTrackingOrder(orderNumber || 'ORD-2026-001');
    setActiveTab('tracking');
  };

  const handleOpenPassport = (rollNumber) => {
    setSelectedPassportRoll(rollNumber || 'ROLL-20261001-0001');
    setActiveTab('passport');
  };

  // Standalone view renders (NO sidebar, per design rules)
  if (!isAuthenticated || activeTab === 'landing') {
    return (
      <LoginLandingView
        onLogin={handleLogin}
        onOpenPublicTracking={() => handleOpenTracking('ORD-2026-001')}
        onOpenRollPassport={() => handleOpenPassport('ROLL-20261001-0001')}
      />
    );
  }

  if (activeTab === 'tracking') {
    return (
      <PublicTrackingView
        initialOrderNumber={selectedTrackingOrder}
        onBack={() => setActiveTab(isAuthenticated ? 'orders' : 'landing')}
      />
    );
  }

  if (activeTab === 'passport') {
    return (
      <RollPassportView
        rollNumber={selectedPassportRoll}
        onBack={() => setActiveTab(isAuthenticated ? 'quality' : 'landing')}
      />
    );
  }

  if (activeTab === 'floor-mode') {
    return (
      <MobileFloorModeView
        onBack={() => setActiveTab('production')}
      />
    );
  }

  // Standard 11-module shell with sidebar
  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onOpenPublicTracking={() => handleOpenTracking('ORD-2026-001')}
      onOpenRollPassport={() => handleOpenPassport('ROLL-20261001-0001')}
      onTriggerTick={handleTriggerSimTick}
      onLogout={handleLogout}
      currentUser={currentUser}
    >
      {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
      {activeTab === 'inventory' && <InventoryView />}
      {activeTab === 'production' && <ProductionView />}
      {activeTab === 'quality' && <QualityView onOpenRollPassport={handleOpenPassport} />}
      {activeTab === 'orders' && <OrdersView onOpenTracking={handleOpenTracking} />}
      {activeTab === 'dispatch' && <DispatchView />}
      {activeTab === 'workforce' && <WorkforceView />}
      {activeTab === 'costing' && <CostingView />}
      {activeTab === 'insights' && <InsightsView />}
      {activeTab === 'floormap' && <FloorMapView onNavigate={setActiveTab} />}
      {activeTab === 'settings' && <SettingsView />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
