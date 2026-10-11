import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  ChevronRight,
  RefreshCw,
  Plus,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Modal,
  FormField,
  Input,
  Select,
  Table,
  Badge,
  PageHeader,
  formatStatus,
  formatNumber,
  useToast
} from '../components/common';
import { api } from '../api/client';

export function QualityView() {
  const [rolls, setRolls] = useState([]);
  const [tab, setTab] = useState('Pending'); // Pending, Passed, Rework, Rejected, All
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Defect Logging Modal
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [defectForm, setDefectForm] = useState({
    type: 'uneven_weave',
    size_in: 4.0
  });
  const [submittingDefect, setSubmittingDefect] = useState(false);

  // Pedigree / Trace Modal
  const [pedigreeData, setPedigreeData] = useState(null);
  const [isPedigreeModalOpen, setIsPedigreeModalOpen] = useState(false);
  const [loadingPedigree, setLoadingPedigree] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const rollsRes = await api.getRolls();
      setRolls(rollsRes || []);
    } catch (err) {
      showToast('Failed to load quality data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDefectModal = (roll) => {
    setSelectedRoll(roll);
    setDefectForm({ type: 'uneven_weave', size_in: 4.0 });
    setIsDefectModalOpen(true);
  };

  const handleLogDefectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoll) return;

    try {
      setSubmittingDefect(true);
      const res = await api.logDefect(selectedRoll.id, {
        type: defectForm.type,
        size_in: Number(defectForm.size_in)
      });
      showToast(
        `Defect logged! Awarded ${res.points_awarded} pts. Grade: ${res.grade?.toUpperCase()} (${res.points_per_100_sq_yd} pts/100 sq yd)`,
        res.grade === 'reject' ? 'warning' : 'success'
      );
      setIsDefectModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingDefect(false);
    }
  };

  const handleOpenTraceModal = async (roll) => {
    try {
      setLoadingPedigree(true);
      setIsPedigreeModalOpen(true);
      const res = await api.getRollPedigree(roll.id);
      setPedigreeData(res);
    } catch (err) {
      showToast('Failed to load pedigree: ' + err.message, 'error');
      setIsPedigreeModalOpen(false);
    } finally {
      setLoadingPedigree(false);
    }
  };

  // Filter rolls by tab and search
  const filteredRolls = useMemo(() => {
    return rolls.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const rollCode = String(r.roll_number || '').toLowerCase();
        const ordCode = String(r.order_number || r.order_id || '').toLowerCase();
        const lotCode = String(r.dye_lot || '').toLowerCase();
        if (!rollCode.includes(query) && !ordCode.includes(query) && !lotCode.includes(query)) {
          return false;
        }
      }

      // Tab filter
      const status = (r.qc_status || '').toLowerCase();
      if (tab === 'Pending') return status === 'pending';
      if (tab === 'Passed') return status === 'pass' || status === 'passed';
      if (tab === 'Rework') return status === 'rework';
      if (tab === 'Rejected') return status === 'reject' || status === 'rejected';
      return true;
    });
  }, [rolls, tab, searchQuery]);

  // Table columns: #, ORDER, DYE LOT, LENGTH, STATUS, GRADE, PTS, ACTIONS
  const rollColumns = [
    {
      header: 'ROLL CODE',
      accessor: 'roll_number',
      render: (r) => (
        <span className="font-mono font-bold text-xs text-[#2F3E8F]">
          {r.roll_number || `ROLL-${r.id}`}
        </span>
      )
    },
    {
      header: 'ORDER',
      accessor: 'order_number',
      render: (r) => (
        <span className="font-mono font-semibold text-xs text-[#0F172A]">
          #{r.order_id || r.order_number?.replace('ORD-2026-00', '') || '3'}
        </span>
      )
    },
    {
      header: 'DYE LOT',
      accessor: 'dye_lot',
      render: (r) => (
        <span className="font-mono text-xs text-[#475569]">
          {r.dye_lot || 'DL-003'}
        </span>
      )
    },
    {
      header: 'LENGTH',
      accessor: 'length_m',
      align: 'right',
      render: (r) => (
        <span className="font-sans tabular-nums font-semibold text-xs text-[#0F172A]">
          {formatNumber(r.length_m || 250)} m
        </span>
      )
    },
    {
      header: 'STATUS',
      accessor: 'qc_status',
      align: 'center',
      render: (r) => (
        <Badge variant={r.qc_status || 'pending'}>
          {formatStatus(r.qc_status || 'pending')}
        </Badge>
      )
    },
    {
      header: 'GRADE',
      accessor: 'grade',
      render: (r) => (
        <span className="text-xs font-semibold text-[#0F172A]">
          {r.grade ? `Grade ${r.grade.toUpperCase()}` : '—'}
        </span>
      )
    },
    {
      header: 'DEFECT PTS',
      accessor: 'defect_points_per_100_sq_yd',
      align: 'right',
      render: (r) => (
        <span className="font-sans tabular-nums text-xs font-bold text-[#0F172A]">
          {r.defect_points_per_100_sq_yd ? Math.round(r.defect_points_per_100_sq_yd) : 0} pts
        </span>
      )
    },
    {
      header: 'ACTIONS',
      accessor: 'id',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2.5">
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleOpenDefectModal(r)}
            className="text-xs"
          >
            Inspect
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenTraceModal(r)}
            className="text-xs"
          >
            Trace
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <PageHeader
        title="Quality Control"
        subtitle="ASTM 4-Point fabric inspection, real-time penalty scoring, and genealogical pedigree tracing."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={loadData}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Control Panel Row: Breadcrumb, Search, Filter Chips, Inspect Action */}
      <div className="bg-white rounded-[16px] border border-[#E5E9F2] shadow-[0_2px_8px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] font-medium">
            <span>Quality</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="text-[#0F172A] font-semibold">ASTM 4-Point Inspection</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="relative min-w-[220px] sm:min-w-[280px]">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roll code, order, dye lot..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-[#F8FAFC] border border-[#E5E9F2] rounded-[10px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2F3E8F] focus:ring-4 focus:ring-[#E3F5F1] transition-all"
              />
            </div>

            {/* Quick Inspect Top-Pending Button */}
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => {
                const firstPending = rolls.find(r => (r.qc_status || '').toLowerCase() === 'pending') || rolls[0];
                if (firstPending) handleOpenDefectModal(firstPending);
              }}
              className="shrink-0"
            >
              + Log Inspection
            </Button>
          </div>
        </div>

        {/* Filter Chips & ASTM Reference Rule */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#F1F5F9]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['Pending', 'Passed', 'Rework', 'Rejected', 'All'].map((item) => {
              const isActive = tab === item;
              return (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#2F3E8F] text-white font-semibold shadow-xs'
                      : 'bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] hover:bg-[#E8EBF7]/50 border border-[#E5E9F2] font-medium'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* ASTM 4-Point Rule Reference Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#94A3B8] text-[11px]">ASTM 4-pt rules:</span>
            <span className="px-2 py-0.5 rounded-[6px] bg-[#E3F5F1] text-[#1F7564] text-[11px] font-semibold border border-[#A2DFD4]">
              Grade A: &lt;16 pts
            </span>
            <span className="px-2 py-0.5 rounded-[6px] bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold border border-[#FDE68A]">
              Grade B: 16–39 pts
            </span>
            <span className="px-2 py-0.5 rounded-[6px] bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-semibold border border-[#FECACA]">
              Reject: ≥40 pts
            </span>
          </div>
        </div>
      </div>

      {/* Rolls Table Card */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={rollColumns}
            data={filteredRolls}
            keyField="id"
            emptyMessage={`No rolls found under '${tab}' status.`}
          />
        </CardContent>
      </Card>

      {/* Defect Inspection Modal */}
      <Modal
        isOpen={isDefectModalOpen}
        onClose={() => setIsDefectModalOpen(false)}
        title={`Perch Inspection: ${selectedRoll?.roll_number}`}
        subtitle={`Length: ${selectedRoll?.length_m}m • Order #${selectedRoll?.order_number}`}
      >
        <form onSubmit={handleLogDefectSubmit} className="space-y-4">
          <FormField label="Defect Type" required>
            <Select
              value={defectForm.type}
              onChange={(e) => setDefectForm({ ...defectForm, type: e.target.value })}
            >
              <option value="uneven_weave">Uneven Weave (Streak/Slub)</option>
              <option value="hole">Hole / Puncture</option>
              <option value="stain">Oil Stain / Grease</option>
              <option value="colour_variation">Colour Shade Variation</option>
              <option value="broken_end">Broken Warp End</option>
              <option value="knot">Excess Knot / Snarl</option>
            </Select>
          </FormField>

          <FormField label="Defect Length / Size (inches)" required>
            <Input
              type="number"
              step="0.5"
              placeholder="4.0"
              value={defectForm.size_in}
              onChange={(e) => setDefectForm({ ...defectForm, size_in: e.target.value })}
            />
            <p className="text-xs text-[#94A3B8] mt-1">
              ASTM Rule: ≤3" = 1pt | 3-6" = 2pts | 6-9" = 3pts | &gt;9" = 4pts
            </p>
          </FormField>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9F2]">
            <Button variant="secondary" type="button" onClick={() => setIsDefectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submittingDefect}>
              Log Defect & Recalculate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Roll Trace Journey Modal */}
      <Modal
        isOpen={isPedigreeModalOpen}
        onClose={() => setIsPedigreeModalOpen(false)}
        title={`Roll Journey Trace: ${pedigreeData?.roll_number || ''}`}
        subtitle="Genealogy from yarn intake to perch inspection"
      >
        {loadingPedigree ? (
          <div className="py-8 text-center text-xs text-[#94A3B8]">
            Fetching traceability history...
          </div>
        ) : pedigreeData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F8FAFC] rounded-[10px] border border-[#E5E9F2] text-xs">
              <div>
                <span className="text-[#94A3B8] block">Order:</span>
                <span className="font-mono font-bold text-[#0F172A]">#{pedigreeData.order_number}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">Fabric & Shade:</span>
                <span className="font-semibold text-[#0F172A]">{pedigreeData.fabric_type} ({pedigreeData.colour})</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">Yarn Batch:</span>
                <span className="font-mono text-[#2F3E8F] font-semibold">{pedigreeData.yarn_batch?.batch_code || 'YB-202610-01'}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">Loom Machine:</span>
                <span className="font-semibold text-[#0F172A]">{pedigreeData.machine_name || 'Airjet Loom A1'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-[0.05em] mb-2">
                Defects Logged ({pedigreeData.defects?.length || 0})
              </h4>
              {pedigreeData.defects?.length === 0 ? (
                <div className="p-3 bg-[#E3F5F1] rounded-[10px] text-xs text-[#1F7564] border border-[#A2DFD4] font-semibold">
                  ✓ Zero defects recorded. Clean pass.
                </div>
              ) : (
                <div className="space-y-2">
                  {pedigreeData.defects?.map((d, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E9F2]">
                      <span className="capitalize font-medium text-[#0F172A]">{d.type?.replace(/_/g, ' ')} ({d.size_in}")</span>
                      <span className="font-sans font-bold text-[#DC2626]">{d.points_awarded} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
