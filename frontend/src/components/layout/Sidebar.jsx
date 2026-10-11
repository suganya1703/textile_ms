import React from 'react';
import { X } from 'lucide-react';

export const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'inventory', label: 'Inventory', icon: '🧶' },
  { id: 'production', label: 'Production', icon: '🏭' },
  { id: 'quality', label: 'Quality', icon: '🔍' },
  { id: 'orders', label: 'Orders', icon: '📋' },
  { id: 'dispatch', label: 'Dispatch', icon: '🚚' },
  { id: 'workforce', label: 'Workforce', icon: '👷' },
  { id: 'costing', label: 'Costing', icon: '💰' },
  { id: 'insights', label: 'Insights', icon: '💡' },
  { id: 'floormap', label: 'Floor Map', icon: '🗺️' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  currentUser,
  onLogout
}) {
  const allowedModuleIds = currentUser?.modules || ALL_MODULES.map((m) => m.id);
  const visibleModules = ALL_MODULES.filter((m) => allowedModuleIds.includes(m.id));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Fixed Left Sidebar Container: ~225px wide, #1E285C deep indigo, white text */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-[225px] bg-[#1E285C] text-white flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Logo Section: Spool + Loomdo + Everest Textile Mills */}
        <div className="shrink-0 pt-6 pb-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Spool / Thread Bobbin Icon with Accent Teal */}
              <div className="w-7 h-7 rounded-lg bg-[#2BA38C] flex items-center justify-center shrink-0 shadow-xs">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h12" />
                  <path d="M6 21h12" />
                  <path d="M8 3v18" />
                  <path d="M16 3v18" />
                  <line x1="8" y1="8" x2="16" y2="8" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                  <line x1="8" y1="16" x2="16" y2="16" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[17px] text-white leading-tight tracking-tight">
                  Loomdo
                </div>
                <div className="text-[11px] text-white/70 font-normal truncate">
                  Everest Textile Mills
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden text-white/70 hover:text-white p-1 rounded-md"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Menu */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2 px-2.5 space-y-0.5">
          {visibleModules.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full h-[40px] flex items-center gap-2.5 px-3 rounded-xl text-[14px] transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-white/20 text-white font-medium shadow-xs'
                    : 'text-white/80 hover:bg-white/10 hover:text-white font-normal'
                }`}
              >
                <span className="text-[15px] leading-none shrink-0" role="img" aria-label={item.label}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Fixed Bottom Row: user (bold), role (small), "Sign out" on right */}
        <div className="shrink-0 p-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white leading-tight">
                {currentUser?.id || 'owner'}
              </div>
              <div className="text-[11px] text-white/70">
                {currentUser?.title || 'Owner'}
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
