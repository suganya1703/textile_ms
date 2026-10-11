import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Modal,
  FormField,
  Input,
  Select,
  PageHeader,
  formatStatus,
  formatNumber,
  useToast
} from '../components/common';
import { api } from '../api/client';

export function ProductionView() {
  const [machines, setMachines] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Job Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [assignForm, setAssignForm] = useState({
    machine_id: '',
    order_id: '',
    stage: 'weaving',
    shift: 'day',
    operator_id: ''
  });
  const [assigning, setAssigning] = useState(false);

  // Status & Progress Modal State
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('running');
  const [incrementM, setIncrementM] = useState('');
  const [updating, setUpdating] = useState(false);
  const [simulatingTick, setSimulatingTick] = useState(false);

  // Reassign Interrupted Job Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassigningJob, setReassigningJob] = useState(null);
  const [reassignMachine, setReassignMachine] = useState(null);
  const [reassignData, setReassignData] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedTargetMachineId, setSelectedTargetMachineId] = useState('');
  const [reassignOperatorId, setReassignOperatorId] = useState('');
  const [reassignShift, setReassignShift] = useState('morning');
  const [transferring, setTransferring] = useState(false);


  const fetchMachines = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.getMachines();
      setMachines(res.machines || []);
      setSummary(res.summary || {});
    } catch (err) {
      console.error('Polling error:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines(true);

    const loadAssignMeta = async () => {
      try {
        const [ordRes, wrkRes] = await Promise.all([
          api.getOrders(),
          api.getWorkers()
        ]);
        setOrders((ordRes || []).filter((o) => o.status !== 'Dispatched'));
        setWorkers(wrkRes || []);
      } catch (err) {
        console.error('Meta load error:', err);
      }
    };
    loadAssignMeta();

    const interval = setInterval(() => {
      fetchMachines(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSimulateTick = async () => {
    try {
      setSimulatingTick(true);
      await api.simulateTick();
      await fetchMachines(false);
      showToast('Telemetry cycle completed! Production output updated.', 'success');
    } catch (err) {
      showToast('Simulation error: ' + err.message, 'error');
    } finally {
      setSimulatingTick(false);
    }
  };

  const handleOpenAssignModal = (machine) => {
    setAssignForm({
      machine_id: machine.id,
      order_id: orders[0]?.id || '',
      stage: machine.stage || 'weaving',
      shift: 'day',
      operator_id: workers[0]?.id || ''
    });
    setIsAssignModalOpen(true);
  };

  const handleOpenUpdateModal = (machine) => {
    setSelectedMachine(machine);
    setNewStatus(machine.effectiveStatus || machine.status);
    setIncrementM('25.0');
    setIsUpdateModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.order_id || !assignForm.machine_id) {
      showToast('Please select order and machine', 'warning');
      return;
    }

    try {
      setAssigning(true);
      await api.assignJob({
        order_id: Number(assignForm.order_id),
        machine_id: Number(assignForm.machine_id),
        stage: assignForm.stage,
        shift: assignForm.shift,
        operator_id: Number(assignForm.operator_id)
      });
      showToast('Job assigned to machine successfully!', 'success');
      setIsAssignModalOpen(false);
      fetchMachines(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMachine) return;

    try {
      setUpdating(true);
      if (newStatus !== selectedMachine.status) {
        await api.updateMachineStatus(selectedMachine.id, newStatus);
      }
      if (selectedMachine.current_job && Number(incrementM) > 0) {
        await api.updateJobProgress(selectedMachine.current_job.job_id, {
          increment_metres: Number(incrementM),
          notes: 'Manual progress update'
        });
      }
      showToast('Machine status updated!', 'success');
      setIsUpdateModalOpen(false);
      fetchMachines(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenReassignModal = async (machine, job) => {
    setReassignMachine(machine);
    setReassigningJob(job);
    setIsReassignModalOpen(true);
    setLoadingSuggestions(true);
    setSelectedTargetMachineId('');
    try {
      const res = await api.getReassignSuggestions(job.job_id);
      setReassignData(res);
      if (res.suggestions && res.suggestions.length > 0) {
        setSelectedTargetMachineId(String(res.suggestions[0].machine_id));
      }
      setReassignOperatorId(workers[0]?.id || '');
      setReassignShift(job.shift || 'morning');
    } catch (err) {
      showToast('Failed to load suggestions: ' + err.message, 'error');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTargetMachineId) {
      showToast('Please select a target idle machine', 'warning');
      return;
    }
    try {
      setTransferring(true);
      const res = await api.transferJob(reassigningJob.job_id, {
        target_machine_id: Number(selectedTargetMachineId),
        operator_id: reassignOperatorId ? Number(reassignOperatorId) : undefined,
        shift: reassignShift
      });
      showToast(res.message || 'Job transferred successfully!', 'success');
      setIsReassignModalOpen(false);
      fetchMachines(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setTransferring(false);
    }
  };

  // Enforce Status Consistency: Running machines have an active job; Idle machines show "No active job"
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

  const runningList = processedMachines.filter((m) => m.effectiveStatus === 'running');
  const idleList = processedMachines.filter((m) => m.effectiveStatus === 'idle');
  const breakdownList = processedMachines.filter((m) => m.effectiveStatus === 'breakdown');

  const renderMachineCard = (m) => {
    const isBreakdown = m.effectiveStatus === 'breakdown';
    const isRunning = m.effectiveStatus === 'running';
    const job = m.current_job;
    const isInterrupted = isBreakdown && job;

    const progressPct = job ? Math.min(100, Math.round(job.progress_pct || 0)) : 0;
    const metresToday = job ? Math.round(job.output_today_m ?? job.produced_m ?? 0) : 0;
    const shift = job?.shift || 'day';

    const borderClass = isRunning
      ? 'border-l-4 border-l-emerald-500'
      : isBreakdown
      ? 'border-l-4 border-l-rose-500'
      : 'border-l-4 border-l-amber-500';

    return (
      <div
        key={m.id}
        className={`bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-5 space-y-3 ${borderClass}`}
      >
        {/* Machine name bold, status pill top right, stage in grey */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-[#111827] text-sm">{m.name}</h4>
            <div className="text-xs text-[#6B7280] capitalize mt-0.5">{m.stage}</div>
          </div>
          <Badge variant={m.effectiveStatus} size="sm">
            {formatStatus(m.effectiveStatus)}
          </Badge>
        </div>

        {/* Breakdown Interrupted Job Banner */}
        {isInterrupted && (
          <div className="p-2.5 rounded-[8px] bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Job interrupted, reassign</span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenReassignModal(m, job)}
              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-[6px] transition-colors shadow-xs"
            >
              Reassign
            </button>
          </div>
        )}

        {/* 'Order #n • stage' or 'No active job' in grey italic */}
        <div className="text-xs">
          {job ? (
            <div className="font-medium text-[#111827]">
              Order #{job.order_number} • <span className="text-[#6B7280] capitalize">{m.stage}</span>
              {isInterrupted && <span className="ml-1 text-rose-600 text-[11px] font-normal">(Interrupted)</span>}
            </div>
          ) : (
            <div className="text-[#9CA3AF] italic">No active job</div>
          )}
        </div>

        {/* Progress bar in purple, '% done' left and 'm today' right */}
        <div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-1.5">
            <div
              className={`h-full transition-all duration-300 ${isBreakdown ? 'bg-rose-500' : 'bg-[#714B67]'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-mono tabular-nums text-[#6B7280]">{progressPct}% done</span>
            <span className="font-mono tabular-nums font-semibold text-[#111827]">{formatNumber(metresToday)} m today</span>
          </div>
        </div>

        {/* Shift: day */}
        <div className="text-xs text-[#6B7280] pt-1 border-t border-[#F3F4F6]">
          Shift: <span className="capitalize text-[#111827] font-medium">{shift}</span>
        </div>

        {/* Buttons: Assign Job / Status */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {isInterrupted ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenReassignModal(m, job)}
              className="w-full text-xs bg-rose-600 hover:bg-rose-700 text-white border-none"
            >
              Reassign
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={isBreakdown}
              onClick={() => handleOpenAssignModal(m)}
              className="w-full text-xs"
            >
              Assign Job
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenUpdateModal(m)}
            className="w-full text-xs"
          >
            Status
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
            Production
          </h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Machine floor status and loom telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Updates every 5 s
          </div>
          <button
            onClick={handleSimulateTick}
            disabled={simulatingTick}
            className="bg-white border border-[#9CA3AF] hover:bg-gray-50 text-[#111827] px-3.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors cursor-pointer"
          >
            Simulate 1 Tick
          </button>
        </div>
      </div>

      {/* SECTION 1: RUNNING (n) in green */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
          RUNNING ({runningList.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {runningList.map(renderMachineCard)}
        </div>
      </div>

      {/* SECTION 2: IDLE (n) in amber */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">
          IDLE ({idleList.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {idleList.map(renderMachineCard)}
        </div>
      </div>

      {/* SECTION 3: BREAKDOWN (n) in red */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider">
          BREAKDOWN ({breakdownList.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {breakdownList.map(renderMachineCard)}
        </div>
      </div>

      {/* Assign Job Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Machine Job"
        subtitle="Dispatch manufacturing order to loom or finishing station"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <FormField label="Select Order" required>
            <Select
              value={assignForm.order_id}
              onChange={(e) => setAssignForm({ ...assignForm, order_id: e.target.value })}
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.order_number} — {o.fabric_type} ({o.colour}, {formatNumber(o.quantity_m)}m)
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Process Stage" required>
              <Select
                value={assignForm.stage}
                onChange={(e) => setAssignForm({ ...assignForm, stage: e.target.value })}
              >
                <option value="spinning">Spinning</option>
                <option value="weaving">Weaving</option>
                <option value="dyeing">Dyeing</option>
              </Select>
            </FormField>

            <FormField label="Shift" required>
              <Select
                value={assignForm.shift}
                onChange={(e) => setAssignForm({ ...assignForm, shift: e.target.value })}
              >
                <option value="day">Day</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Primary Machine Operator" required>
            <Select
              value={assignForm.operator_id}
              onChange={(e) => setAssignForm({ ...assignForm, operator_id: e.target.value })}
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.role}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
            <Button variant="secondary" type="button" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={assigning}>
              Confirm Job Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Machine Status Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title={`Machine Status: ${selectedMachine?.name}`}
        subtitle="Update operating health status or increment produced metres"
      >
        <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
          <FormField label="Operational Status" required>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="running">Running (Active Production)</option>
              <option value="idle">Idle (Awaiting Work / Standby)</option>
              <option value="breakdown">Breakdown (Maintenance Required)</option>
            </Select>
          </FormField>

          {selectedMachine?.current_job && (
            <FormField label="Add Metres Produced (Manual Shift Entry)">
              <Input
                type="number"
                step="5.0"
                placeholder="25.0"
                value={incrementM}
                onChange={(e) => setIncrementM(e.target.value)}
              />
              <p className="text-xs text-[#6B7280] mt-1">
                Adds output metres directly to active Job #{selectedMachine.current_job.job_id}
              </p>
            </FormField>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
            <Button variant="secondary" type="button" onClick={() => setIsUpdateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={updating}>
              Save Updates
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reassign Job Modal */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reassign Interrupted Job"
        subtitle={`Order #${reassigningJob?.order_number || ''} from ${reassignMachine?.name || ''}`}
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-[8px] border border-gray-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Order:</span>
              <span className="font-semibold text-gray-900">#{reassigningJob?.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stage:</span>
              <span className="capitalize font-semibold text-gray-900">{reassigningJob?.stage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Carried Over Progress:</span>
              <span className="font-mono font-semibold text-gray-900">{reassigningJob?.progress_pct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Output on Broken Machine:</span>
              <span className="font-mono text-gray-700">{formatNumber(reassigningJob?.output_today_m || 0)} m (retained on {reassignMachine?.name})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining Metres:</span>
              <span className="font-mono font-bold text-indigo-700">{formatNumber(reassignData?.remaining_m || 0)} m</span>
            </div>
          </div>

          {loadingSuggestions ? (
            <div className="text-center py-6 text-xs text-gray-500">Finding candidate idle machines...</div>
          ) : reassignData?.suggestions?.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Candidate Machines ({reassigningJob?.stage}, Idle, Sorted by Capacity)
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {reassignData.suggestions.map((cand) => {
                  const isSelected = String(cand.machine_id) === String(selectedTargetMachineId);
                  return (
                    <div
                      key={cand.machine_id}
                      onClick={() => setSelectedTargetMachineId(String(cand.machine_id))}
                      className={`p-3 rounded-[8px] border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'border-[#2F3E8F] bg-[#2F3E8F]/5'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="targetMachine"
                            checked={isSelected}
                            onChange={() => setSelectedTargetMachineId(String(cand.machine_id))}
                            className="text-[#2F3E8F]"
                          />
                          <span>{cand.machine_name}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Capacity: <span className="font-medium text-gray-800">{cand.capacity_m_per_hour} m/hr</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[#2F3E8F] font-mono">
                          ~{cand.estimated_hours} hrs
                        </div>
                        <div className="text-[11px] text-gray-500">to finish {formatNumber(cand.remaining_m)} m</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-[8px] text-xs text-amber-800">
              No idle candidate machines found with stage &apos;{reassigningJob?.stage}&apos;. Please wait or free up an idle machine.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Assign Operator">
              <Select
                value={reassignOperatorId}
                onChange={(e) => setReassignOperatorId(e.target.value)}
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.role})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Shift">
              <Select
                value={reassignShift}
                onChange={(e) => setReassignShift(e.target.value)}
              >
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </Select>
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
            <Button variant="secondary" type="button" onClick={() => setIsReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={transferring}
              disabled={!selectedTargetMachineId || !reassignData?.suggestions?.length}
            >
              Confirm Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
