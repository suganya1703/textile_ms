import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function AppLayout({
  activeTab,
  onSelectTab,
  children,
  onLogout,
  currentUser
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex font-sans">
      {/* Fixed Left Sidebar (~225px) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-[225px]">
        {/* Mobile-only header (hidden on desktop to match reference UI) */}
        <header className="h-12 bg-white border-b border-[#E5E7EB] md:hidden px-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 text-gray-700 hover:text-gray-900 rounded-lg"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-gray-800">
            Everest Textile Mills
          </span>
          <div className="w-5" />
        </header>

        {/* Page Content Body directly on #F3F4F6 background */}
        <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
