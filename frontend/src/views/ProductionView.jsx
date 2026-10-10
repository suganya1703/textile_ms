import React, { useState, useEffect } from 'react';
import {
  RefreshCw
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
    const job = isRunning ? m.current_job : null;

    const progressPct = job ? Math.min(100, Math.round(job.progress_pct || 0)) : 0;
    const metresToday = job ? Math.round(job.produced_m || 0) : 0;
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

        {/* 'Order #n • stage' or 'No active job' in grey italic */}
        <div className="text-xs">
          {job ? (
            <div className="font-medium text-[#111827]">
              Order #{job.order_number} • <span className="text-[#6B7280] capitalize">{m.stage}</span>
            </div>
          ) : (
            <div className="text-[#9CA3AF] italic">No active job</div>
          )}
        </div>

        {/* Progress bar in purple, '% done' left and 'm today' right */}
        <div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-1.5">
            <div
              className="h-full bg-[#714B67] transition-all duration-300"
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
          <Button
            variant="secondary"
            size="sm"
            disabled={isBreakdown}
            onClick={() => handleOpenAssignModal(m)}
            className="w-full text-xs"
          >
            Assign Job
          </Button>
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
          <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
            Production
          </h1>
          <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
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
    </div>
  );
}
