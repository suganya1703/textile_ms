import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  QrCode,
  Camera
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  PageHeader,
  formatStatus,
  formatNumber,
  useToast
} from '../components/common';
import { api } from '../api/client';
import { RollScannerModal } from '../components/common/RollScannerModal';

export function FloorMapView({ onNavigate, onOpenRollPassport }) {
  const [floorData, setFloorData] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [quickRollCode, setQuickRollCode] = useState('');
  const { showToast } = useToast();

  const loadFloor = async () => {
    try {
      const res = await api.getFloorLayout();
      setFloorData(res);
      if (!selectedMachine && res?.machines && res.machines.length > 0) {
        setSelectedMachine(res.machines[0]);
      }
    } catch (err) {
      showToast('Failed to load floor layout: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloor();
    const interval = setInterval(loadFloor, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !floorData) {
    return (
      <div className="py-20 text-center text-[#6B7280]">
        <div className="w-8 h-8 border-4 border-[#2F3E8F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Mill Floor Map...
      </div>
    );
  }

  const { machines = [] } = floorData;

  // Consistency: Running machines have an active job; Idle machines show "No active job"
  const processedMachines = machines.map((m) => {
    let effectiveStatus = m.status;
    if (m.status === 'breakdown') {
      effectiveStatus = 'breakdown';
    } else if (m.current_job) {
      effectiveStatus = 'running';
    } else {
      effectiveStatus = 'idle';
    }
    return {
      ...m,
      effectiveStatus
    };
  });

  const spinningMachines = processedMachines.filter((m) => m.stage?.toLowerCase() === 'spinning');
  const weavingMachines = processedMachines.filter((m) => m.stage?.toLowerCase() === 'weaving');
  const dyeingMachines = processedMachines.filter((m) => m.stage?.toLowerCase().includes('dye') || m.stage?.toLowerCase() === 'dyeing');

  const getMachineBlockBg = (m, isSelected) => {
    let bg = '';
    if (m.effectiveStatus === 'running') {
      bg = 'bg-emerald-600 hover:bg-emerald-700';
    } else if (m.effectiveStatus === 'breakdown') {
      bg = 'bg-rose-600 hover:bg-rose-700';
    } else {
      bg = 'bg-amber-500 hover:bg-amber-600';
    }

    const ring = isSelected ? 'ring-2 ring-[#2F3E8F] ring-offset-2' : '';
    return `${bg} ${ring} p-3 rounded-[8px] text-left transition-all cursor-pointer shadow-xs`;
  };

  const renderMachineBlock = (m) => {
    const isSelected = selectedMachine?.id === m.id;
    const hasJob = m.effectiveStatus === 'running' && Boolean(m.current_job);
    const orderLine = hasJob
      ? `#${m.current_job.order_number} • ${Math.round(m.current_job.produced_m || 0)}m`
      : 'No active job';

    return (
      <button
        key={m.id}
        type="button"
        onClick={() => setSelectedMachine(m)}
        className={getMachineBlockBg(m, isSelected)}
      >
        <div className="font-bold text-white text-xs leading-tight">
          {m.name}
        </div>
        <div className="text-[11px] text-white/90 truncate mt-1">
          {orderLine}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
            Floor Map
          </h1>
          <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
            2D mill floor plan with live telemetry and machine status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#2F3E8F] hover:bg-[#232F70] rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            Scan QR
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live • 5 s
          </div>
        </div>
      </div>

      {/* Quick Roll Code / QR Scanner Bar */}
      <div className="p-3.5 bg-white rounded-[12px] border border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#2F3E8F] flex items-center justify-center shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#111827]">Scan QR / Enter Roll Code</span>
            <p className="text-[11px] text-[#6B7280]">Inspect ASTM 4-point grading and full roll pedigree</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (quickRollCode.trim()) {
              if (onOpenRollPassport) onOpenRollPassport(quickRollCode.trim());
              else if (onNavigate) onNavigate('passport');
            }
          }}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <input
            type="text"
            value={quickRollCode}
            onChange={(e) => setQuickRollCode(e.target.value)}
            placeholder="e.g. ROLL-20261001-0001"
            className="flex-1 sm:w-60 font-mono text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3 py-1.5 text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
          />
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-2.5 py-1.5 text-xs font-semibold text-[#2F3E8F] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-[8px] transition-colors cursor-pointer shrink-0"
          >
            Camera
          </button>
          <button
            type="submit"
            disabled={!quickRollCode.trim()}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#2F3E8F] hover:bg-[#232F70] disabled:opacity-50 rounded-[8px] transition-colors cursor-pointer shrink-0"
          >
            Open
          </button>
        </form>
      </div>

      {/* Legend: green Running, amber Idle, red Breakdown, 'Click a machine to inspect' */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-[12px] border border-[#E5E7EB]">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600" />
            <span className="font-medium text-[#111827]">Running</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500" />
            <span className="font-medium text-[#111827]">Idle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-600" />
            <span className="font-medium text-[#111827]">Breakdown</span>
          </div>
        </div>
        <div className="text-xs text-[#6B7280] italic">
          Click a machine to inspect
        </div>
      </div>

      {/* Main Floor Grid: Large "Mill Floor" Card with 3 Columns (Left) + Detail Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Large white card "Mill Floor" */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader
              title="Mill Floor"
              subtitle="Processing stages with live operational blocks"
            />
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Column 1: SPINNING */}
                <div className="space-y-3 bg-[#F9FAFB] p-3.5 rounded-[8px] border border-[#E5E7EB]">
                  <div className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-2">
                    SPINNING ({spinningMachines.length})
                  </div>
                  <div className="space-y-2">
                    {spinningMachines.map(renderMachineBlock)}
                  </div>
                </div>

                {/* Column 2: WEAVING */}
                <div className="space-y-3 bg-[#F9FAFB] p-3.5 rounded-[8px] border border-[#E5E7EB]">
                  <div className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-2">
                    WEAVING ({weavingMachines.length})
                  </div>
                  <div className="space-y-2">
                    {weavingMachines.map(renderMachineBlock)}
                  </div>
                </div>

                {/* Column 3: DYEING */}
                <div className="space-y-3 bg-[#F9FAFB] p-3.5 rounded-[8px] border border-[#E5E7EB]">
                  <div className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-2">
                    DYEING ({dyeingMachines.length})
                  </div>
                  <div className="space-y-2">
                    {dyeingMachines.map(renderMachineBlock)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right-Side Detail Card */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader
              title={selectedMachine ? selectedMachine.name : 'Select a machine'}
              subtitle={selectedMachine ? `Stage: ${selectedMachine.stage?.toUpperCase()}` : 'Click any block on the mill floor to inspect'}
              action={
                selectedMachine && (
                  <Badge variant={selectedMachine.effectiveStatus}>
                    {formatStatus(selectedMachine.effectiveStatus)}
                  </Badge>
                )
              }
            />
            <CardContent className="space-y-4 pt-1">
              {selectedMachine ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Status:</span>
                      <span className="font-semibold text-[#111827] capitalize">{selectedMachine.effectiveStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Machine Stage:</span>
                      <span className="font-semibold text-[#111827] capitalize">{selectedMachine.stage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Rated Speed:</span>
                      <span className="font-mono text-[#111827]">{selectedMachine.speed_rpm || 650} RPM</span>
                    </div>
                  </div>

                  {selectedMachine.effectiveStatus === 'running' && selectedMachine.current_job ? (
                    <div className="p-3 bg-indigo-50/50 rounded-[8px] border border-indigo-100 space-y-2">
                      <div className="font-semibold text-[#2F3E8F] text-sm">
                        Active Job #{selectedMachine.current_job.job_id}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Order:</span>
                        <span className="font-mono font-bold text-[#111827]">#{selectedMachine.current_job.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Produced:</span>
                        <span className="font-mono font-semibold text-[#111827]">
                          {formatNumber(selectedMachine.current_job.produced_m)} metres
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280]">Progress:</span>
                        <span className="font-mono font-bold text-[#2F3E8F]">
                          {Math.round(selectedMachine.current_job.progress_pct || 0)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-[8px] border border-gray-200 text-[#6B7280] italic">
                      No active job currently assigned. Machine is on standby.
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#6B7280]">
                  Select a machine on the mill floor to inspect its live status and telemetry feed.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Roll Scanner Modal */}
      <RollScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectRoll={(code) => {
          if (onOpenRollPassport) onOpenRollPassport(code);
          else if (onNavigate) onNavigate('passport');
        }}
      />
    </div>
  );
}
