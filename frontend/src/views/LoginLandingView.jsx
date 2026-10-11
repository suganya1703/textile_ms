import React, { useState } from 'react';
import {
  ExternalLink,
  QrCode,
  Lock,
  User,
  ShieldCheck,
  Boxes,
  Zap,
  Building2,
  ArrowRight,
  CheckCircle2
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
    <div className="min-h-screen bg-[#F5F7FB] text-[#475569] flex flex-col justify-between selection:bg-[#2F3E8F] selection:text-white font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#E5E9F2] px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-[#2BA38C] flex items-center justify-center shadow-xs">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
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
            <div className="font-bold text-lg tracking-tight text-[#0F172A] leading-tight">
              Loomdo
            </div>
            <div className="text-xs text-[#94A3B8] font-medium">
              Everest Textile Mills
            </div>
          </div>
        </div>

        {/* Public Standalone Portals */}
        <div className="flex items-center gap-2.5">
          {onOpenPublicTracking && (
            <button
              onClick={onOpenPublicTracking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2F3E8F] bg-[#E8EBF7] hover:bg-[#D8DEFA] rounded-[10px] transition-colors border border-[#C7D0EF] cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#2F3E8F]" />
              Buyer Tracking
            </button>
          )}
          {onOpenRollPassport && (
            <button
              onClick={onOpenRollPassport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1F7564] bg-[#E3F5F1] hover:bg-[#CFEFE8] rounded-[10px] transition-colors border border-[#A2DFD4] cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-[#2BA38C]" />
              Roll Passport
            </button>
          )}
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-[20px] overflow-hidden border border-[#E5E9F2] shadow-[0_4px_20px_rgba(15,23,42,0.06)] bg-white">
          
          {/* Left Panel: Dark Indigo #1E2A5E with branding, tagline and 3 feature bullets */}
          <div className="lg:col-span-5 bg-[#1E2A5E] text-white p-8 sm:p-10 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/15">
                <span className="w-2 h-2 rounded-full bg-[#2BA38C] animate-pulse" />
                Everest Textile Mills Console
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Loomdo
                </h1>
                <p className="text-lg text-[#2BA38C] font-semibold tracking-tight mt-2">
                  “Every roll, traced from yarn to invoice.”
                </p>
                <p className="text-sm text-white/75 leading-relaxed mt-3">
                  Unified offline mill management system replacing paper registers with digital traceability, automated ASTM 4-point grading, and job orchestration.
                </p>
              </div>

              {/* 3 Core Bullets */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-[10px] bg-white/10 text-[#2BA38C] shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Roll Genealogy & ASTM 4-Point QC</h4>
                    <p className="text-xs text-white/70 mt-0.5">Complete traceability from raw yarn batch to loom, dye lot, and printable QR passports.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-[10px] bg-white/10 text-[#2BA38C] shrink-0 mt-0.5">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Dye Lot Uniformity Enforcement</h4>
                    <p className="text-xs text-white/70 mt-0.5">Automated validation preventing cross-lot shade variation before packing and dispatch.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-[10px] bg-white/10 text-[#2BA38C] shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">100% Offline Local Architecture</h4>
                    <p className="text-xs text-white/70 mt-0.5">High-speed local SQLite database with zero cloud latency and full operational continuity.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 text-xs text-white/60">
              Reliable local manufacturing infrastructure.
            </div>
          </div>

          {/* Right Panel: Sign-In Form & Demo Personas */}
          <div className="lg:col-span-7 p-6 sm:p-10 space-y-6 flex flex-col justify-center bg-white">
            <div className="flex items-center justify-between border-b border-[#E5E9F2] pb-4">
              <div>
                <h3 className="text-xl font-bold text-[#0F172A] tracking-tight">Sign In to Mill Console</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Select a demo persona or use role credentials to proceed:</p>
              </div>
              <div className="w-10 h-10 rounded-[10px] bg-[#E8EBF7] flex items-center justify-center text-[#2F3E8F] shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            {/* Demo Personas Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#475569] block">
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
                      className={`p-3 rounded-[10px] text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E8EBF7] border-[#2F3E8F] text-[#0F172A] ring-2 ring-[#2F3E8F]/20'
                          : 'bg-[#F8FAFC] border-[#E5E9F2] text-[#475569] hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-[#0F172A]">{role.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          isSelected ? 'bg-[#2F3E8F] text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {role.id}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[#475569] mt-1">{role.name}</div>
                      <div className="text-[11px] text-[#94A3B8] mt-1 leading-snug line-clamp-2">
                        {role.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#475569] block mb-1">
                    Account Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 bg-[#F8FAFC] border border-[#E5E9F2] rounded-[10px] pl-9 pr-3 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#2F3E8F] focus:ring-4 focus:ring-[#E3F5F1]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#475569] block mb-1">
                    Passcode
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 bg-[#F8FAFC] border border-[#E5E9F2] rounded-[10px] pl-9 pr-3 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#2F3E8F] focus:ring-4 focus:ring-[#E3F5F1]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#E8EBF7]/60 rounded-[10px] border border-[#C7D0EF] flex items-center justify-between text-xs">
                <span className="text-[#475569]">
                  Active Persona: <strong className="text-[#0F172A]">{selectedRole.title}</strong>
                </span>
                <span className="font-semibold text-[#2F3E8F] bg-[#E8EBF7] px-2 py-0.5 rounded-full">
                  {selectedRole.modules.length} Modules Allowed
                </span>
              </div>

              <button
                type="submit"
                className="w-full h-10 px-4 rounded-[10px] font-semibold text-sm bg-[#2F3E8F] hover:bg-[#26337A] text-white transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#E3F5F1]"
              >
                <span>Launch Console as {selectedRole.title}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E9F2] bg-white px-6 py-4 text-center text-xs text-[#94A3B8]">
        Built for the Odoo x NMIT Bangalore Hackathon 2026
      </footer>
    </div>
  );
}
