import React from 'react';
import {
  X,
  LayoutDashboard,
  Package,
  Factory,
  ShieldCheck,
  ClipboardList,
  Truck,
  Users,
  Coins,
  Lightbulb,
  Map,
  Settings
} from 'lucide-react';

export const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'production', label: 'Production', icon: Factory },
  { id: 'quality', label: 'Quality', icon: ShieldCheck },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'dispatch', label: 'Dispatch', icon: Truck },
  { id: 'workforce', label: 'Workforce', icon: Users },
  { id: 'costing', label: 'Costing', icon: Coins },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'floormap', label: 'Floor Map', icon: Map },
  { id: 'settings', label: 'Settings', icon: Settings },
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Fixed Left Sidebar Container: 230px wide, #1E2A5E dark indigo */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-[230px] bg-[#1E2A5E] text-white flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 border-r border-[#172049] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Logo Section */}
        <div className="shrink-0 pt-6 pb-4 px-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Spool / Thread Bobbin Icon */}
              <div className="w-8 h-8 rounded-[10px] bg-[#2BA38C] flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
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
                <div className="font-bold text-[18px] text-white leading-tight tracking-tight">
                  Loomdo
                </div>
                <div className="text-[11px] text-white/70 font-medium truncate">
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
        <div className="flex-1 min-h-0 overflow-y-auto py-3 px-3 space-y-1">
          {visibleModules.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full h-10 flex items-center gap-3 px-3 rounded-[10px] text-[13.5px] transition-all text-left cursor-pointer relative ${
                  isActive
                    ? 'bg-[#2F3E8F] text-white font-semibold shadow-xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3.5px] before:bg-[#2BA38C] before:rounded-r'
                    : 'text-white/85 hover:bg-[#172049] hover:text-white font-medium'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#2BA38C]' : 'text-white/70'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Fixed Bottom User Row */}
        <div className="shrink-0 p-4 border-t border-white/10 bg-[#172049]/60">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs font-bold text-white leading-tight truncate">
                {currentUser?.id || 'owner'}
              </div>
              <div className="text-[11px] text-white/70 truncate">
                {currentUser?.title || 'Owner'}
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer px-2 py-1 rounded hover:bg-white/10"
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
