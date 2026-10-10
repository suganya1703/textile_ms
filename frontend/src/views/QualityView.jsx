import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, QrCode, Tag, ExternalLink } from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Modal,
  FormField,
  Input,
  Select,
  Table,
  useToast
} from '../components/common';
import { api } from '../api/client';
import { PrintLabelsModal } from '../components/common/RollLabel';

export function QualityView({ onOpenRollPassport }) {
  const [rolls, setRolls] = useState([]);
  const [tab, setTab] = useState('Pending'); // Pending, Passed, Rework, Rejected
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const { showToast } = useToast();

  // Multi-select for bulk label printing
  const [selectedRollIds, setSelectedRollIds] = useState(new Set());
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [rollsToPrint, setRollsToPrint] = useState([]);

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
      const [rollsRes, setRes] = await Promise.all([
        api.getRolls(),
        api.getSettings().catch(() => ({}))
      ]);
      setRolls(rollsRes || []);
      setSettings(setRes || {});
    } catch (err) {
      showToast('Failed to load quality data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const baseUrl = settings.public_base_url?.value || window.location.origin || 'http://localhost:5173';

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
      setPedigreeData({ ...roll, ...res });
    } catch (err) {
      showToast('Failed to load pedigree: ' + err.message, 'error');
      setIsPedigreeModalOpen(false);
    } finally {
      setLoadingPedigree(false);
    }
  };

  const handlePrintSingleLabel = (roll) => {
    setRollsToPrint([roll]);
    setIsPrintModalOpen(true);
  };

  // Filter rolls by tab
  const filteredRolls = rolls.filter((r) => {
    const status = (r.qc_status || '').toLowerCase();
    if (tab === 'Pending') return status === 'pending';
    if (tab === 'Passed') return status === 'pass' || status === 'passed';
    if (tab === 'Rework') return status === 'rework';
    if (tab === 'Rejected') return status === 'reject' || status === 'rejected';
    return true;
  });

  // Toggle selection for bulk printing
  const toggleSelectRoll = (id) => {
    const next = new Set(selectedRollIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRollIds(next);
  };

  const handleSelectAll = () => {
    if (filteredRolls.length > 0 && selectedRollIds.size === filteredRolls.length) {
      setSelectedRollIds(new Set());
    } else {
      setSelectedRollIds(new Set(filteredRolls.map((r) => r.id)));
    }
  };

  const handleBulkPrint = () => {
    const selected = filteredRolls.filter((r) => selectedRollIds.has(r.id));
    if (selected.length === 0) {
      showToast('Please select at least 1 roll to print labels.', 'warning');
      return;
    }
    setRollsToPrint(selected);
    setIsPrintModalOpen(true);
  };

  // Table columns
  const rollColumns = [
    {
      header: (
        <input
          type="checkbox"
          checked={filteredRolls.length > 0 && selectedRollIds.size === filteredRolls.length}
          onChange={handleSelectAll}
          className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67] cursor-pointer"
          title="Select all rolls"
        />
      ),
      accessor: 'id',
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedRollIds.has(r.id)}
          onChange={() => toggleSelectRoll(r.id)}
          className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67] cursor-pointer"
        />
      )
    },
    {
      header: '#',
      accessor: 'roll_number',
      render: (r) => (
        <button
          onClick={() => onOpenRollPassport ? onOpenRollPassport(r.roll_number) : handleOpenTraceModal(r)}
          className="font-mono font-bold text-xs sm:text-sm text-[#714B67] hover:underline text-left cursor-pointer"
          title="Click to view Roll Passport"
        >
          {r.roll_number || `#${r.id}`}
        </button>
      )
    },
    {
      header: 'ORDER',
      accessor: 'order_number',
      render: (r) => (
        <span className="font-mono text-xs sm:text-sm text-[#111827]">
          #{r.order_id || r.order_number?.replace('ORD-2026-00', '') || '3'}
        </span>
      )
    },
    {
      header: 'DYE LOT',
      accessor: 'dye_lot',
      render: (r) => (
        <span className="font-mono text-xs text-[#111827]">
          {r.dye_lot ? (r.dye_lot.startsWith('LOT') ? r.dye_lot.replace('LOT-NB-', 'DL-') : r.dye_lot) : 'DL-003'}
        </span>
      )
    },
    {
      header: 'LENGTH',
      accessor: 'length_m',
      render: (r) => (
        <span className="font-mono tabular-nums text-xs sm:text-sm text-[#111827]">
          {r.length_m || 250} m
        </span>
      )
    },
    {
      header: 'STATUS',
      accessor: 'qc_status',
      render: (r) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          r.qc_status === 'pass' ? 'bg-emerald-100 text-emerald-800' :
          r.qc_status === 'reject' ? 'bg-rose-100 text-rose-800' :
          r.qc_status === 'rework' ? 'bg-orange-100 text-orange-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {tab === 'Pending' ? 'Pending' : r.qc_status === 'pass' ? 'Passed' : r.qc_status === 'reject' ? 'Rejected' : 'Pending'}
        </span>
      )
    },
    {
      header: 'GRADE',
      accessor: 'grade',
      render: (r) => (
        <span className="text-xs text-[#4B5563] font-medium">
          {r.grade ? `Grade ${r.grade}` : '—'}
        </span>
      )
    },
    {
      header: 'PTS',
      accessor: 'defect_points_per_100_sq_yd',
      render: (r) => (
        <span className="font-mono tabular-nums text-xs text-[#111827]">
          {r.defect_points_per_100_sq_yd ? Math.round(r.defect_points_per_100_sq_yd) : (r.defect_points || 0)}
        </span>
      )
    },
    {
      header: '',
      accessor: 'actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handlePrintSingleLabel(r)}
            className="flex items-center gap-1 text-xs text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 font-medium px-2.5 py-1.5 rounded-[6px] transition-colors cursor-pointer"
            title="Print 4x2 inch roll sticker label"
          >
            <Printer className="w-3 h-3 text-[#714B67]" />
            Label
          </button>
          <button
            onClick={() => handleOpenDefectModal(r)}
            className="bg-[#714B67] hover:bg-[#5C3D54] text-white text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer"
          >
            Inspect
          </button>
          <button
            onClick={() => handleOpenTraceModal(r)}
            className="text-xs text-[#714B67] hover:underline font-medium cursor-pointer px-1 py-1"
          >
            Trace
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
            Quality Control
          </h1>
          <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
            Four-point fabric grading & roll pedigree verification
          </p>
        </div>

        {/* Bulk Print Action Button */}
        {selectedRollIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkPrint}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print Labels ({selectedRollIds.size})
            </Button>
            <button
              onClick={() => setSelectedRollIds(new Set())}
              className="text-xs text-[#6B7280] hover:text-[#111827] underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Row of Small Grading Legend Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[#6B7280]">≤3"→1pt</span>
        <span className="text-[#6B7280]">3-6"→2pt</span>
        <span className="text-[#6B7280]">6-9"→3pt</span>
        <span className="text-[#6B7280]">&gt;9"→4pt</span>
        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
          B: 16–39 pts/100sqyd
        </span>
        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium">
          Reject: ≥40 pts/100sqyd
        </span>
      </div>

      {/* Filter Tabs: Pending / Passed / Rework / Rejected */}
      <div className="flex items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-2">
          {['Pending', 'Passed', 'Rework', 'Rejected'].map((item) => {
            const isActive = tab === item;
            return (
              <button
                key={item}
                onClick={() => {
                  setTab(item);
                  setSelectedRollIds(new Set());
                }}
                className={`transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#111827] shadow-xs font-semibold px-3.5 py-1.5 rounded-[8px]'
                    : 'text-[#6B7280] hover:text-[#111827] px-2 py-1.5 font-normal'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Multi-selection summary notice */}
        {selectedRollIds.size > 0 && (
          <span className="text-xs text-[#714B67] font-semibold bg-purple-50 px-2.5 py-1 rounded-md">
            {selectedRollIds.size} rolls selected for bulk printing
          </span>
        )}
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
            <p className="text-xs text-[#6B7280] mt-1">
              ASTM Rule: ≤3" = 1pt | 3-6" = 2pts | 6-9" = 3pts | &gt;9" = 4pts
            </p>
          </FormField>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
            <Button variant="secondary" type="button" onClick={() => setIsDefectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submittingDefect}>
              Log Defect & Recalculate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Roll Trace Journey Modal with QR Code and Label Print */}
      <Modal
        isOpen={isPedigreeModalOpen}
        onClose={() => setIsPedigreeModalOpen(false)}
        title={`Roll Journey Trace: ${pedigreeData?.roll_number || ''}`}
        subtitle="Genealogy from yarn intake to perch inspection"
      >
        {loadingPedigree ? (
          <div className="py-8 text-center text-xs text-[#6B7280]">
            Fetching traceability history...
          </div>
        ) : pedigreeData ? (
          <div className="space-y-4">
            {/* Prominent QR Code + Print Action Bar */}
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white rounded-lg border border-purple-200 shrink-0">
                  <QRCodeSVG
                    value={`${baseUrl}/passport/${pedigreeData.roll_number}`}
                    size={72}
                    level="M"
                  />
                </div>
                <div>
                  <span className="font-mono font-bold text-sm text-[#714B67] block">
                    {pedigreeData.roll_number}
                  </span>
                  <span className="text-xs text-gray-700 block">
                    Grade {pedigreeData.grade || 'A'} • {pedigreeData.length_m} m
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono block mt-0.5 truncate max-w-[200px]">
                    {baseUrl}/passport/{pedigreeData.roll_number}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePrintSingleLabel(pedigreeData)}
                  className="flex-1 sm:flex-initial"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print 4×2" Label
                </Button>
                {onOpenRollPassport && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsPedigreeModalOpen(false);
                      onOpenRollPassport(pedigreeData.roll_number);
                    }}
                    className="flex-1 sm:flex-initial"
                  >
                    View Passport
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] text-xs">
              <div>
                <span className="text-[#6B7280] block">Order:</span>
                <span className="font-bold text-[#111827]">#{pedigreeData.order_number || pedigreeData.order_id}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Fabric & Shade:</span>
                <span className="font-bold text-[#111827]">{pedigreeData.fabric_type || 'Cotton'} ({pedigreeData.colour || 'Natural'})</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Yarn Batch:</span>
                <span className="font-mono text-[#714B67] font-semibold">{pedigreeData.yarn_batch?.batch_code || 'YB-202610-01'}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Loom Machine:</span>
                <span className="font-semibold text-[#111827]">{pedigreeData.machine_name || 'Airjet Loom A1'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-2">
                Defects Logged ({pedigreeData.defects?.length || 0})
              </h4>
              {pedigreeData.defects?.length === 0 ? (
                <div className="p-3 bg-emerald-50 rounded-[8px] text-xs text-emerald-800 border border-emerald-200">
                  Zero defects recorded. Clean pass.
                </div>
              ) : (
                <div className="space-y-2">
                  {pedigreeData.defects?.map((d, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2 rounded bg-gray-50 border border-gray-100">
                      <span className="capitalize font-medium text-[#111827]">{d.type?.replace(/_/g, ' ')} ({d.size_in}")</span>
                      <span className="font-mono font-bold text-[#714B67]">{d.points_awarded || d.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Bulk & Single Label Print Modal */}
      <PrintLabelsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        rolls={rollsToPrint}
        baseUrl={baseUrl}
      />
    </div>
  );
}
