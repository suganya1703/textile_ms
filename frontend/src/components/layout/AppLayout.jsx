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
    <div className="min-h-screen bg-[#F5F7FB] flex font-sans text-[#475569]">
      {/* Fixed Left Sidebar (230px) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-[230px]">
        {/* Mobile-only header with hamburger button */}
        <header className="h-14 bg-white border-b border-[#E5E9F2] md:hidden px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 text-[#0F172A] hover:bg-[#E8EBF7] rounded-[10px] transition-colors"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#0F172A]">
              Everest Textile Mills
            </span>
            {currentUser?.title && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E8EBF7] text-[#2F3E8F]">
                {currentUser.title}
              </span>
            )}
          </div>
          <div className="w-6" />
        </header>

        {/* Page Content Body on #F5F7FB background */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
