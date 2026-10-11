import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, QrCode, Tag, ExternalLink, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Modal,
  FormField,
  Input,
  Select,
  Table,
  PageHeader,
  Breadcrumbs,
  ControlPanel,
  ActivityLog,
  formatStatus,
  formatNumber,
  formatINR,
  useToast
} from '../components/common';
import { api } from '../api/client';
import { PrintLabelsModal } from '../components/common/RollLabel';

export function QualityView({ onOpenRollPassport }) {
  const [rolls, setRolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const { showToast } = useToast();

  // Control panel state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

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

  // Roll Detail View (Two-Column ERP View)
  const [selectedRollDetail, setSelectedRollDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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
      if (selectedRollDetail && selectedRollDetail.id === selectedRoll.id) {
        handleOpenRollDetail(selectedRoll);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingDefect(false);
    }
  };

  const handleOpenRollDetail = async (roll) => {
    try {
      setLoadingDetail(true);
      setSelectedRollDetail(roll);
      const res = await api.getRollPedigree(roll.id);
      setSelectedRollDetail((prev) => ({ ...prev, ...res }));
    } catch (err) {
      console.error('Error fetching roll pedigree:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(filteredRolls.map((r) => r.id));
      setSelectedRollIds(allIds);
    } else {
      setSelectedRollIds(new Set());
    }
  };

  const handleToggleSelectRoll = (id) => {
    const next = new Set(selectedRollIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRollIds(next);
  };

  const handleBulkPrint = () => {
    const targets = rolls.filter((r) => selectedRollIds.has(r.id));
    if (targets.length === 0) {
      showToast('Please select at least one roll to print', 'warning');
      return;
    }
    setRollsToPrint(targets);
    setIsPrintModalOpen(true);
  };

  const handlePrintSingleLabel = (roll) => {
    setRollsToPrint([roll]);
    setIsPrintModalOpen(true);
  };

  // Live filter and search on loaded rolls
  const filteredRolls = useMemo(() => {
    return rolls.filter((r) => {
      // Status filter
      if (statusFilter !== 'All') {
        const normFilter = statusFilter.toLowerCase().trim();
        const normStatus = (r.qc_status || '').toLowerCase().trim();
        if (normFilter === 'passed' && normStatus !== 'pass' && normStatus !== 'passed') return false;
        if (normFilter === 'pending' && normStatus !== 'pending') return false;
        if (normFilter === 'rework' && normStatus !== 'rework') return false;
        if (normFilter === 'rejected' && normStatus !== 'reject' && normStatus !== 'rejected') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const numMatch = (r.roll_number || '').toLowerCase().includes(term);
        const ordMatch = String(r.order_number || r.order_id || '').toLowerCase().includes(term);
        const lotMatch = (r.dye_lot || '').toLowerCase().includes(term);
        const shadeMatch = (r.shade_value || '').toLowerCase().includes(term);
        const machMatch = (r.machine_name || '').toLowerCase().includes(term);
        if (!numMatch && !ordMatch && !lotMatch && !shadeMatch && !machMatch) return false;
      }

      return true;
    });
  }, [rolls, statusFilter, searchTerm]);

  const rollColumns = [
    {
      header: (
        <input
          type="checkbox"
          checked={filteredRolls.length > 0 && selectedRollIds.size === filteredRolls.length}
          onChange={handleSelectAll}
          className="rounded text-[#2F3E8F] focus:ring-[#2F3E8F] cursor-pointer"
        />
      ),
      accessor: 'id',
      sortable: false,
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedRollIds.has(r.id)}
          onChange={() => handleToggleSelectRoll(r.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded text-[#2F3E8F] focus:ring-[#2F3E8F] cursor-pointer"
        />
      )
    },
    {
      header: 'Roll Code',
      accessor: 'roll_number',
      render: (r) => (
        <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-[#2F3E8F]">
          <Tag className="w-3 h-3 text-[#2BA38C]" />
          <span>{r.roll_number}</span>
        </div>
      )
    },
    {
      header: 'Order #',
      accessor: 'order_number',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#111827]">
          #{r.order_number || r.order_id}
        </span>
      )
    },
    {
      header: 'Loom / Machine',
      accessor: 'machine_name',
      render: (r) => <span className="text-xs text-[#111827]">{r.machine_name || 'Loom W-01'}</span>
    },
    {
      header: 'Length',
      accessor: 'length_m',
      align: 'right',
      sum: true,
      sumRender: (total) => `${formatNumber(total)} m`,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs font-semibold text-[#111827]">
          {r.length_m} m
        </span>
      )
    },
    {
      header: 'Dye Lot',
      accessor: 'dye_lot',
      render: (r) => <span className="font-mono text-xs text-[#6B7280]">{r.dye_lot}</span>
    },
    {
      header: 'Defect Points',
      accessor: 'defect_points',
      align: 'right',
      sum: true,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs font-semibold text-[#111827]">
          {r.defect_points || 0}
        </span>
      )
    },
    {
      header: 'ASTM Grade',
      accessor: 'grade',
      align: 'center',
      render: (r) => (
        <Badge variant={r.grade === 'A' ? 'grade a' : r.grade === 'B' ? 'grade b' : 'reject'}>
          {r.grade ? `Grade ${r.grade}` : 'Uninspected'}
        </Badge>
      )
    },
    {
      header: 'QC Decision',
      accessor: 'qc_status',
      align: 'center',
      render: (r) => <Badge variant={r.qc_status}>{formatStatus(r.qc_status)}</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handlePrintSingleLabel(r)}
            className="flex items-center gap-1 text-xs text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 font-medium px-2 py-1 rounded-[6px] transition-colors cursor-pointer"
            title="Print label"
          >
            <Printer className="w-3 h-3 text-[#2F3E8F]" />
            Label
          </button>
          <button
            type="button"
            onClick={() => handleOpenDefectModal(r)}
            className="bg-[#2F3E8F] hover:bg-[#232F70] text-white text-xs font-medium px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer"
          >
            Inspect
          </button>
          <button
            type="button"
            onClick={() => handleOpenRollDetail(r)}
            className="text-xs text-[#2F3E8F] hover:underline font-semibold cursor-pointer px-1 py-1"
          >
            Detail
          </button>
        </div>
      )
    }
  ];

  // -------------------------------------------------------------
  // DETAIL VIEW: Two-Column ERP Form + Activity Log
  // -------------------------------------------------------------
  if (selectedRollDetail) {
    return (
      <div className="space-y-6">
        {/* Detail View Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-[12px] border border-[#E5E7EB] shadow-xs">
          <div className="space-y-1">
            <Breadcrumbs
              items={[
                { label: 'Quality', onClick: () => setSelectedRollDetail(null) },
                { label: selectedRollDetail.roll_number }
              ]}
            />
            <div className="flex items-center gap-3 pt-1">
              <h1 className="text-xl font-bold text-[#111827]">
                Roll {selectedRollDetail.roll_number}
              </h1>
              <Badge variant={selectedRollDetail.qc_status}>
                {formatStatus(selectedRollDetail.qc_status)}
              </Badge>
              <Badge variant={selectedRollDetail.grade === 'A' ? 'grade a' : selectedRollDetail.grade === 'B' ? 'grade b' : 'reject'}>
                ASTM Grade {selectedRollDetail.grade || 'Pending'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={Printer}
              onClick={() => handlePrintSingleLabel(selectedRollDetail)}
            >
              Print 4x2 Label
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={ExternalLink}
              onClick={() => {
                if (onOpenRollPassport) onOpenRollPassport(selectedRollDetail.roll_number);
              }}
            >
              Roll Passport
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={ArrowLeft}
              onClick={() => setSelectedRollDetail(null)}
            >
              Back to Quality
            </Button>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Roll Specifications (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <Card>
              <CardHeader
                title="Roll Genealogy & Grading"
                subtitle="Perch table ASTM D5430 metrics and batch pedigree"
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenDefectModal(selectedRollDetail)}
                  >
                    Log Defect
                  </Button>
                }
              />
              <CardContent className="pt-2">
                {/* QR Code Banner */}
                <div className="p-3 bg-[#EEF2FF] rounded-[8px] border border-[#C7D2FE] flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-white rounded border border-[#C7D2FE]">
                      <QRCodeSVG
                        value={`${baseUrl}/passport/${selectedRollDetail.roll_number}`}
                        size={56}
                        level="M"
                      />
                    </div>
                    <div>
                      <span className="font-mono font-bold text-xs text-[#2F3E8F] block">
                        {selectedRollDetail.roll_number}
                      </span>
                      <span className="text-[11px] text-[#4B5563] block">
                        Public Offline URL: <code className="font-mono text-[#2F3E8F]">{baseUrl}/passport/{selectedRollDetail.roll_number}</code>
                      </span>
                    </div>
                  </div>
                  <Badge variant="accent">ASTM Certified</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block">Order Number</span>
                    <span className="font-mono font-semibold text-[#111827] mt-0.5 block">
                      #{selectedRollDetail.order_number || selectedRollDetail.order_id}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block">Loom / Machine</span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {selectedRollDetail.machine_name || 'Loom W-01'}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block">Yarn Batch</span>
                    <span className="font-mono font-semibold text-[#2F3E8F] mt-0.5 block">
                      {selectedRollDetail.yarn_batch_code || selectedRollDetail.yarn_batch?.batch_code || 'YB-2026-0410'}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block">Roll Length</span>
                    <span className="font-mono font-bold text-[#111827] mt-0.5 block">
                      {selectedRollDetail.length_m} metres ({formatNumber(selectedRollDetail.length_m * 1.0936)} yd)
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block">Dye Lot & Shade</span>
                    <span className="font-mono font-semibold text-[#111827] mt-0.5 block">
                      {selectedRollDetail.dye_lot} • {selectedRollDetail.shade_value}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block">Shift & Operator</span>
                    <span className="font-medium text-[#111827] mt-0.5 block capitalize">
                      {selectedRollDetail.shift || 'morning'} • {selectedRollDetail.operator_name || 'R. Balasubramanian'}
                    </span>
                  </div>
                </div>

                {/* Defects Table on Roll */}
                <div className="mt-5 space-y-2">
                  <h4 className="font-bold text-xs text-[#111827] uppercase tracking-wider">
                    Defect Points Log ({selectedRollDetail.defects?.length || 0} defects)
                  </h4>
                  {selectedRollDetail.defects && selectedRollDetail.defects.length > 0 ? (
                    <div className="border border-[#E5E7EB] rounded-[8px] overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#F9FAFB] text-[#6B7280] border-b border-[#E5E7EB]">
                          <tr>
                            <th className="px-3 py-2">Defect Type</th>
                            <th className="px-3 py-2">Size (in)</th>
                            <th className="px-3 py-2 text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F3F4F6]">
                          {selectedRollDetail.defects.map((d, dIdx) => (
                            <tr key={d.id || dIdx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium capitalize text-[#111827]">
                                {d.type.replace(/_/g, ' ')}
                              </td>
                              <td className="px-3 py-2 font-mono text-[#4B5563]">{d.size_in}"</td>
                              <td className="px-3 py-2 font-mono font-bold text-rose-600 text-right">
                                +{d.points} pts
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 rounded-[8px] border border-emerald-200 text-xs text-emerald-800 font-medium">
                      Zero defects detected during inspection. Clean Grade A roll.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Activity Log (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <ActivityLog
              entity="Roll"
              entityId={selectedRollDetail.id}
              entityIdentifier={selectedRollDetail.roll_number}
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN VIEW: Control Panel + Rolls Table
  // -------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
          Quality Control
        </h1>
        <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
          Four-point fabric grading, defect points and roll pedigree verification
        </p>
      </div>

      {/* Control Panel: Breadcrumbs, Search, Filter Chips, Action Button */}
      <ControlPanel
        breadcrumbs={['Quality', 'Roll Inspection & Perch']}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search roll code, order#, dye lot..."
        filterChips={[
          { id: 'All', label: 'All', count: rolls.length },
          { id: 'Pending', label: 'Pending', count: rolls.filter((r) => r.qc_status === 'pending').length },
          { id: 'Passed', label: 'Passed', count: rolls.filter((r) => r.qc_status === 'pass').length },
          { id: 'Rework', label: 'Rework', count: rolls.filter((r) => r.qc_status === 'rework').length },
          { id: 'Rejected', label: 'Rejected', count: rolls.filter((r) => r.qc_status === 'reject').length }
        ]}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        actionButton={
          selectedRollIds.size > 0 ? (
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handleBulkPrint}
            >
              Print Labels ({selectedRollIds.size})
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={Printer}
              onClick={() => {
                const pending = rolls.filter((r) => r.qc_status === 'pass');
                setRollsToPrint(pending.slice(0, 10));
                setIsPrintModalOpen(true);
              }}
            >
              Batch Labels
            </Button>
          )
        }
      />

      {/* ASTM Legend Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs bg-white p-2.5 rounded-[8px] border border-[#E5E7EB]">
        <span className="font-semibold text-[#111827]">ASTM D5430 Standard:</span>
        <span className="text-[#6B7280]">≤3"→1pt</span>
        <span className="text-[#6B7280]">3-6"→2pt</span>
        <span className="text-[#6B7280]">6-9"→3pt</span>
        <span className="text-[#6B7280]">&gt;9"→4pt</span>
        <span className="ml-auto px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
          Grade B: 16–39 pts/100 sq yd
        </span>
        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium">
          Reject: ≥40 pts/100 sq yd
        </span>
      </div>

      {/* Rolls Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={rollColumns}
            data={filteredRolls}
            keyField="id"
            emptyMessage={`No rolls found matching '${statusFilter}' or search criteria.`}
            onRowClick={(roll) => handleOpenRollDetail(roll)}
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

      {/* Print Labels Modal */}
      <PrintLabelsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        rolls={rollsToPrint}
        publicBaseUrl={baseUrl}
      />
    </div>
  );
}
