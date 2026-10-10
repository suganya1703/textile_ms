import React, { useState } from 'react';
import {
  ExternalLink,
  QrCode,
  Lock,
  User,
  Layers,
  ShieldCheck,
  Boxes,
  Zap,
  Building2,
  ArrowRight
} from 'lucide-react';
import { DEMO_ROLES } from '../auth/roles';

export function LoginLandingView({
  onLogin,
  onOpenPublicTracking,
  onOpenRollPassport
}) {
  const [selectedRole, setSelectedRole] = useState(DEMO_ROLES[0]);
  const [email, setEmail] = useState(DEMO_ROLES[0].email);
  const [password, setPassword] = useState('demo2026');

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setEmail(role.email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) {
      onLogin(selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827] flex flex-col justify-between selection:bg-[#714B67] selection:text-white font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-[#714B67] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12" />
              <path d="M6 21h12" />
              <path d="M8 3v18" />
              <path d="M16 3v18" />
              <line x1="8" y1="8" x2="16" y2="8" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="16" x2="16" y2="16" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight text-[#111827] leading-tight">
              Loomdo
            </div>
            <div className="text-xs text-[#6B7280]">
              Everest Textile Mills
            </div>
          </div>
        </div>

        {/* Public Standalone Portals */}
        <div className="flex items-center gap-2.5">
          {onOpenPublicTracking && (
            <button
              onClick={onOpenPublicTracking}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 rounded-[8px] transition-colors border border-[#714B67]/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buyer Tracking
            </button>
          )}
          {onOpenRollPassport && (
            <button
              onClick={onOpenRollPassport}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-[8px] transition-colors border border-emerald-200"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              Roll Passport
            </button>
          )}
        </div>
      </header>

      {/* Main Hero & Role Login Grid */}
      <main className="max-w-6xl w-full mx-auto px-6 py-10 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Brand, Tagline & Overview */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 border border-purple-200 text-[#714B67]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Odoo x NMIT Hackathon 2026 Edition
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111827] leading-tight">
                Loomdo
              </h1>
              <p className="text-xl sm:text-2xl text-[#714B67] font-bold tracking-tight">
                “Every roll, traced from yarn to invoice.”
              </p>
              <p className="text-base text-[#6B7280] leading-relaxed pt-2">
                A unified offline manufacturing platform built for Everest Textile Mills. Replaces paper slips, registers, phone calls, and manual floor walks with verifiable end-to-end roll traceability and automated ASTM 4-point grading.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-start gap-3">
                <div className="p-2 rounded-[8px] bg-purple-50 text-[#714B67] shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#111827]">Roll Genealogy</h4>
                  <p className="text-xs text-[#6B7280] mt-0.5">Yarn batch, machine, operator and dye lot linked per roll.</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-start gap-3">
                <div className="p-2 rounded-[8px] bg-emerald-50 text-emerald-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#111827]">ASTM 4-Point QC</h4>
                  <p className="text-xs text-[#6B7280] mt-0.5">Automated scoring and printable QR Passports.</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-start gap-3">
                <div className="p-2 rounded-[8px] bg-amber-50 text-amber-700 shrink-0">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#111827]">Zero Lot Mixing</h4>
                  <p className="text-xs text-[#6B7280] mt-0.5">Strict dye-lot uniformity enforced before dispatch.</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-start gap-3">
                <div className="p-2 rounded-[8px] bg-purple-50 text-[#714B67] shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#111827]">100% Offline</h4>
                  <p className="text-xs text-[#6B7280] mt-0.5">Local SQLite database with zero cloud latency.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Role-Based Demo Account Card */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-6 sm:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-6">
              <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#111827]">Sign In to Mill Console</h3>
                  <p className="text-xs text-[#6B7280]">Select a demo account with role-filtered permissions:</p>
                </div>
                <div className="w-10 h-10 rounded-[8px] bg-gray-100 flex items-center justify-center text-gray-700">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              {/* 4 Demo Roles Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block">
                  Select Demo Persona:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEMO_ROLES.map((role) => {
                    const isSelected = selectedRole.id === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleSelectRole(role)}
                        className={`p-3 rounded-[8px] text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-50 border-[#714B67] text-[#714B67] ring-1 ring-[#714B67]'
                            : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563] hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs">{role.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isSelected ? 'bg-[#714B67] text-white' : 'bg-gray-200 text-[#4B5563]'
                          }`}>
                            {role.id}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[#111827] mt-0.5">{role.name}</div>
                        <div className="text-[11px] text-[#6B7280] mt-1 leading-snug line-clamp-2">
                          {role.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form & One-Click Sign In */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block mb-1">
                      Account Email
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] pl-9 pr-3 py-2 text-xs font-mono text-[#111827] focus:outline-none focus:border-[#714B67]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block mb-1">
                      Passcode
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] pl-9 pr-3 py-2 text-xs font-mono text-[#111827] focus:outline-none focus:border-[#714B67]"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 rounded-[8px] border border-purple-100 flex items-center justify-between text-xs">
                  <span className="text-[#6B7280]">
                    Signing in as <strong className="text-[#111827]">{selectedRole.title}</strong>
                  </span>
                  <span className="font-semibold text-[#714B67]">
                    {selectedRole.modules.length} Modules Allowed
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-[8px] font-semibold text-sm bg-[#714B67] hover:bg-[#5C3D54] text-white transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Launch Console as {selectedRole.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white px-6 py-4 text-center text-xs text-[#6B7280]">
        Loomdo © 2026 • Built for Odoo x NMIT Hackathon • Client Seed: Everest Textile Mills
      </footer>
    </div>
  );
}
