import React, { useState, useEffect } from 'react';
import {
  FileText,
  RefreshCw,
  BookOpen,
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Modal,
  Badge,
  useToast
} from '../components/common';
import { api } from '../api/client';

export function SettingsView({ onNavigate, onOpenRollPassport, currentUser }) {
  const [settings, setSettings] = useState({});
  const [lanInfo, setLanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const { showToast } = useToast();

  // Demo Guide Side Panel Drawer State
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false);

  // Reset Demo Data Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isOwner = !currentUser || currentUser.role === 'owner' || currentUser.id === 'owner';

  const loadSettings = async () => {
    try {
      setLoading(true);
      const setRes = await api.getSettings();
      setSettings(setRes || {});
      try {
        const lan = await api.getLanIp();
        setLanInfo(lan);
      } catch (e) {
        setLanInfo({
          lan_ip: window.location.hostname,
          suggested_url: `http://${window.location.hostname}:5173`
        });
      }
    } catch (err) {
      showToast('Failed to load settings: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleInputChange = (key, val) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        value: val
      }
    }));
  };

  const handleSaveGroup = async (keys) => {
    try {
      setSavingKey(keys.join(','));
      const payload = {};
      keys.forEach((k) => {
        if (settings[k]) {
          payload[k] = settings[k].value;
        }
      });
      await api.updateSettings(payload);
      showToast('Settings saved successfully!', 'success');
      loadSettings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleDownloadOdoo = async (type) => {
    try {
      const csvText = await api.downloadOdooExport(type);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `loomdo_odoo_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Exported loomdo_odoo_${type}.csv formatted for Odoo!`, 'success');
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  const handleConfirmReset = async () => {
    try {
      setResetting(true);
      await api.resetDemoData();
      showToast('Demo data restored successfully with baseline planted stories!', 'success');
      setIsResetModalOpen(false);
      await loadSettings();
      if (onNavigate) {
        onNavigate('dashboard');
      }
    } catch (err) {
      showToast('Reset failed: ' + err.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  const demoStorySteps = [
    {
      id: 'step-a',
      letter: 'a',
      title: 'Buyer calls about roll with colour problem',
      description: 'Buyer Kaveri Fashions calls reporting colour shading mismatch on delivered poplin fabric roll ROLL-20261006-0026.',
      actionLabel: 'Inspect in Quality Perch',
      tabTarget: 'quality',
      onClick: () => {
        if (onNavigate) onNavigate('quality');
        setIsDemoGuideOpen(false);
      }
    },
    {
      id: 'step-b',
      letter: 'b',
      title: 'Open its Roll Passport',
      description: 'Scan or open the public offline Roll Passport for ROLL-20261006-0026 to view ASTM 4-point defect coordinates and complete genealogy.',
      actionLabel: 'Open Roll Passport',
      tabTarget: 'passport',
      onClick: () => {
        if (onOpenRollPassport) onOpenRollPassport('ROLL-20261006-0026');
        else if (onNavigate) onNavigate('passport');
        setIsDemoGuideOpen(false);
      }
    },
    {
      id: 'step-c',
      letter: 'c',
      title: 'See loom, shift, yarn batch',
      description: 'Passport journey reveals roll was produced on Loom W-01 (Airjet), Morning Shift, by R. Balasubramanian using Yarn Batch YB-2026-0412.',
      actionLabel: 'View on Floor Map',
      tabTarget: 'floormap',
      onClick: () => {
        if (onNavigate) onNavigate('floormap');
        setIsDemoGuideOpen(false);
      }
    },
    {
      id: 'step-d',
      letter: 'd',
      title: 'Open Insights and see defect statement',
      description: 'Insights engine correlates root-causes: Batch YB-2026-0412 has 100% of colour mismatch defects & 11.3% scrap loss; Loom W-03 has 2.9x defect points.',
      actionLabel: 'Open Insights',
      tabTarget: 'insights',
      onClick: () => {
        if (onNavigate) onNavigate('insights');
        setIsDemoGuideOpen(false);
      }
    },
    {
      id: 'step-e',
      letter: 'e',
      title: 'Check delayed order',
      description: 'Delay Risk Engine flags Order ORD-2026-003 in Red (needs 48 m/day, running at 19 m/day) and suggests reallocating idle Loom W-05.',
      actionLabel: 'Check Production Board',
      tabTarget: 'production',
      onClick: () => {
        if (onNavigate) onNavigate('production');
        setIsDemoGuideOpen(false);
      }
    },
    {
      id: 'step-f',
      letter: 'f',
      title: 'Dispatch with dye-lot warning',
      description: 'Dispatching Order ORD-2026-006 rolls triggers the Dye-Lot Clash Guard because rolls span differing dye lots LOT-101 and LOT-102.',
      actionLabel: 'Open Dispatch Guard',
      tabTarget: 'dispatch',
      onClick: () => {
        if (onNavigate) onNavigate('dispatch');
        setIsDemoGuideOpen(false);
      }
    },
    {
      id: 'step-g',
      letter: 'g',
      title: 'See margin alert on Dashboard',
      description: 'Owner Dashboard highlights Order ORD-2026-008 losing ~9.2% margin (-₹10,723) because low selling price (₹78/m) fails to cover unit costs.',
      actionLabel: 'View Owner Dashboard',
      tabTarget: 'dashboard',
      onClick: () => {
        if (onNavigate) onNavigate('dashboard');
        setIsDemoGuideOpen(false);
      }
    }
  ];

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="py-20 text-center text-[#6B7280]">
        <div className="w-8 h-8 border-4 border-[#2F3E8F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
            Settings
          </h1>
          <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
            Mill parameters, thresholds and ERP data export
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Demo Guide Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsDemoGuideOpen(true)}
            className="text-xs bg-indigo-50 text-[#2F3E8F] hover:bg-indigo-100 border-indigo-200"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Demo guide
          </Button>

          {/* Reset Demo Data Button (Owner Only) */}
          {isOwner && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsResetModalOpen(true)}
              className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset demo data
            </Button>
          )}
        </div>
      </div>

      {/* Stacked Cards: Company, Roll Passport QR & Network, Grading, Yield Ratios, Finance, Shifts, Odoo CSV Export */}
      <div className="space-y-6">
        {/* 1. Company */}
        <Card>
          <CardHeader
            title="Company"
            subtitle="Tenant name and factory operating details"
            action={
              <Button
                variant="secondary"
                size="sm"
                loading={savingKey?.includes('company_name')}
                onClick={() => handleSaveGroup(['company_name'])}
              >
                Save
              </Button>
            }
          />
          <CardContent className="space-y-4 pt-1">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <code className="font-mono text-xs font-semibold text-[#111827]">company_name</code>
                <span className="text-xs text-[#6B7280]">Primary tenant identifier</span>
              </div>
              <input
                type="text"
                value={settings.company_name?.value || 'Everest Textile Mills'}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
              />
              <p className="text-xs text-[#6B7280] mt-1">Company name displayed across reports, invoices and top navigation.</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Roll Passport QR & Network */}
        <Card>
          <CardHeader
            title="Roll Passport QR & Network"
            subtitle="Configure target URL for QR codes to enable phone scanning over local WiFi"
            action={
              <Button
                variant="secondary"
                size="sm"
                loading={savingKey?.includes('public_base_url')}
                onClick={() => handleSaveGroup(['public_base_url'])}
              >
                Save
              </Button>
            }
          />
          <CardContent className="space-y-4 pt-1">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <code className="font-mono text-xs font-semibold text-[#111827]">public_base_url</code>
                <span className="text-xs text-[#6B7280]">Target URL encoded in QR labels</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={settings.public_base_url?.value || 'http://localhost:5173'}
                  onChange={(e) => handleInputChange('public_base_url', e.target.value)}
                  placeholder="e.g. http://192.168.1.20:5173"
                  className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm font-mono text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
                />
                {lanInfo && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      handleInputChange('public_base_url', lanInfo.suggested_url);
                      showToast(`Set to network address: ${lanInfo.suggested_url}`, 'info');
                    }}
                    className="whitespace-nowrap text-xs"
                  >
                    Use this computer's network address ({lanInfo.lan_ip})
                  </Button>
                )}
              </div>
              <p className="text-xs text-[#6B7280] mt-1.5">
                Each roll QR code encodes <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">&lt;BASE_URL&gt;/passport/&lt;roll_code&gt;</code>.
                Set to your machine's LAN IP address so any smartphone connected to the same mill WiFi can scan and view passports without requiring login.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Grading */}
        <Card>
          <CardHeader
            title="Grading"
            subtitle="ASTM 4-Point inspection scoring thresholds"
            action={
              <Button
                variant="secondary"
                size="sm"
                loading={savingKey?.includes('four_point_grade_a_max')}
                onClick={() => handleSaveGroup(['four_point_grade_a_max', 'four_point_grade_b_max'])}
              >
                Save
              </Button>
            }
          />
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <code className="font-mono text-xs font-semibold text-[#111827]">four_point_grade_a_max</code>
                  <span className="text-xs text-[#6B7280]">Grade A limit</span>
                </div>
                <input
                  type="number"
                  step="1"
                  value={settings.four_point_grade_a_max?.value || '20.0'}
                  onChange={(e) => handleInputChange('four_point_grade_a_max', e.target.value)}
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Maximum points per 100 sq yd to award Grade A premium.</p>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <code className="font-mono text-xs font-semibold text-[#111827]">four_point_grade_b_max</code>
                  <span className="text-xs text-[#6B7280]">Reject cutoff</span>
                </div>
                <input
                  type="number"
                  step="1"
                  value={settings.four_point_grade_b_max?.value || '40.0'}
                  onChange={(e) => handleInputChange('four_point_grade_b_max', e.target.value)}
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Maximum points for Grade B; rolls exceeding this cutoff are marked Reject.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Yield Ratios */}
        <Card>
          <CardHeader
            title="Yield Ratios"
            subtitle="Conversion ratios and inventory stock thresholds"
            action={
              <Button
                variant="secondary"
                size="sm"
                loading={savingKey?.includes('expected_yield_ratio')}
                onClick={() => handleSaveGroup(['expected_yield_ratio', 'low_stock_threshold_kg'])}
              >
                Save
              </Button>
            }
          />
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <code className="font-mono text-xs font-semibold text-[#111827]">expected_yield_ratio</code>
                  <span className="text-xs text-[#6B7280]">Yield benchmark</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={settings.expected_yield_ratio?.value || '0.95'}
                  onChange={(e) => handleInputChange('expected_yield_ratio', e.target.value)}
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Standard conversion ratio from yarn to fabric (0.95 denotes 5% expected process scrap).</p>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <code className="font-mono text-xs font-semibold text-[#111827]">low_stock_threshold_kg</code>
                  <span className="text-xs text-[#6B7280]">Alert threshold</span>
                </div>
                <input
                  type="number"
                  step="10"
                  value={settings.low_stock_threshold_kg?.value || '500.0'}
                  onChange={(e) => handleInputChange('low_stock_threshold_kg', e.target.value)}
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Weight threshold in kg that triggers low stock warning badges on inventory cards.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Finance */}
        <Card>
          <CardHeader
            title="Finance"
            subtitle="Machine hourly electricity and tax parameters"
            action={
              <Button
                variant="secondary"
                size="sm"
                loading={savingKey?.includes('overhead_rate_per_hour')}
                onClick={() => handleSaveGroup(['overhead_rate_per_hour', 'tax_rate_pct'])}
              >
                Save
              </Button>
            }
          />
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <code className="font-mono text-xs font-semibold text-[#111827]">overhead_rate_per_hour</code>
                  <span className="text-xs text-[#6B7280]">Hourly rate (₹)</span>
                </div>
                <input
                  type="number"
                  step="5"
                  value={settings.overhead_rate_per_hour?.value || '250.0'}
                  onChange={(e) => handleInputChange('overhead_rate_per_hour', e.target.value)}
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Factory electricity, depreciation and overhead cost allocation per machine hour.</p>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <code className="font-mono text-xs font-semibold text-[#111827]">tax_rate_pct</code>
                  <span className="text-xs text-[#6B7280]">GST %</span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  value={settings.tax_rate_pct?.value || '5.0'}
                  onChange={(e) => handleInputChange('tax_rate_pct', e.target.value)}
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Applicable GST percentage applied during dispatch invoice generation.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Shifts */}
        <Card>
          <CardHeader
            title="Shifts"
            subtitle="Standard operational shifts and timing"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => showToast('Shift timings updated', 'success')}
              >
                Save
              </Button>
            }
          />
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <code className="font-mono text-xs font-semibold text-[#111827]">shift_day</code>
                  <span className="text-xs text-[#6B7280]">Day Shift</span>
                </div>
                <input
                  type="text"
                  defaultValue="08:00 — 16:00 (8h)"
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Standard daytime production roster.</p>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <code className="font-mono text-xs font-semibold text-[#111827]">shift_evening</code>
                  <span className="text-xs text-[#6B7280]">Evening Shift</span>
                </div>
                <input
                  type="text"
                  defaultValue="16:00 — 00:00 (8h)"
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Evening weaving and dyeing batch operations.</p>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <code className="font-mono text-xs font-semibold text-[#111827]">shift_night</code>
                  <span className="text-xs text-[#6B7280]">Night Shift</span>
                </div>
                <input
                  type="text"
                  defaultValue="00:00 — 08:00 (8h)"
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Continuous loom weaving and perch inspection.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. Odoo CSV Export */}
        <Card>
          <CardHeader
            title="Odoo CSV Export"
            subtitle="Export live data compatible with Odoo ERP modules"
          />
          <CardContent className="pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Products Card */}
              <div className="p-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-[8px] bg-indigo-50 text-[#2F3E8F] flex items-center justify-center mb-2">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#111827]">Products</h4>
                  <p className="text-xs text-[#6B7280] mt-1">Fabric specifications, constructions, and standard selling prices</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadOdoo('products')}
                  className="w-full text-xs"
                >
                  Download CSV
                </Button>
              </div>

              {/* Lots Card */}
              <div className="p-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-[8px] bg-indigo-50 text-[#2F3E8F] flex items-center justify-center mb-2">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#111827]">Lots</h4>
                  <p className="text-xs text-[#6B7280] mt-1">Yarn dye lots, roll numbers, ASTM grades, and test scores</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadOdoo('lots')}
                  className="w-full text-xs"
                >
                  Download CSV
                </Button>
              </div>

              {/* Stock Card */}
              <div className="p-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-[8px] bg-indigo-50 text-[#2F3E8F] flex items-center justify-center mb-2">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#111827]">Stock</h4>
                  <p className="text-xs text-[#6B7280] mt-1">Yarn warehouse inventory balances and shelf rolls ready for dispatch</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadOdoo('stock')}
                  className="w-full text-xs"
                >
                  Download CSV
                </Button>
              </div>

              {/* Invoices Card */}
              <div className="p-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-[8px] bg-indigo-50 text-[#2F3E8F] flex items-center justify-center mb-2">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-[#111827]">Invoices</h4>
                  <p className="text-xs text-[#6B7280] mt-1">Tax invoices, vehicle transport records, and customer accounts receivable</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadOdoo('invoices')}
                  className="w-full text-xs"
                >
                  Download CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slide-Over Side Panel: Demo Guide */}
      {isDemoGuideOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDemoGuideOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[#E5E7EB]">
              {/* Drawer Header */}
              <div className="p-5 border-b border-[#E5E7EB] flex items-start justify-between bg-[#F9FAFB]">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#2F3E8F]" />
                    <h2 className="text-lg font-bold text-[#111827]">Demo Guide</h2>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Clickable 7-step story walkthrough of seeded operational anomalies
                  </p>
                </div>
                <button
                  onClick={() => setIsDemoGuideOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body: Story Steps */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-[8px] text-xs text-[#2F3E8F] font-medium leading-relaxed">
                  💡 Follow this continuous scenario from the buyer phone call all the way to owner P&L reconciliation. Click any step to jump straight to that screen.
                </div>

                <div className="space-y-3">
                  {demoStorySteps.map((step) => (
                    <div
                      key={step.id}
                      className="p-4 bg-white rounded-[10px] border border-[#E5E7EB] hover:border-[#2F3E8F] transition-all shadow-xs space-y-2 group"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#2F3E8F] text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {step.letter}
                        </span>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-[#111827] group-hover:text-[#2F3E8F] transition-colors">
                            {step.title}
                          </h4>
                          <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={step.onClick}
                          className="text-xs border-[#2F3E8F] text-[#2F3E8F] hover:bg-indigo-50 group-hover:bg-[#2F3E8F] group-hover:text-white transition-all"
                        >
                          {step.actionLabel}
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDemoGuideOpen(false)}
                >
                  Close Guide
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset Demo Data */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => !resetting && setIsResetModalOpen(false)}
        title="Reset Demo Data"
        subtitle="Restore baseline operational data and planted stories"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-[10px] flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-950 space-y-1">
              <strong className="block font-semibold">Warning: This action will re-seed the mill database.</strong>
              <p>
                All modified machine statuses, attendance records, dispatches, and inspected rolls will be reset back to the pristine Everest Textile Mills demo state.
              </p>
              <p className="text-[11px] text-rose-700">
                This restores Loom W-03 defect concentration, yarn batch YB-2026-0412 high wastage, ORD-2026-003 delay risk, and ORD-2026-008 loss-making order.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
            <Button
              variant="secondary"
              type="button"
              disabled={resetting}
              onClick={() => setIsResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              loading={resetting}
              onClick={handleConfirmReset}
              className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
            >
              Confirm & Reset Demo Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
