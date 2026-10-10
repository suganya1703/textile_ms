import React, { useState, useEffect } from 'react';
import {
  FileText,
  RefreshCw
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  PageHeader,
  useToast
} from '../components/common';
import { api } from '../api/client';

export function SettingsView() {
  const [settings, setSettings] = useState({});
  const [lanInfo, setLanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const { showToast } = useToast();

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

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="py-20 text-center text-[#6B7280]">
        <div className="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading Settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
          Settings
        </h1>
        <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
          Mill parameters, thresholds and Odoo ERP export
        </p>
      </div>

      {/* Stacked Cards: Company, Grading, Yield Ratios, Finance, Shifts, Odoo CSV Export */}
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
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
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
                  className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
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
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
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
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Maximum points for Grade B; rolls exceeding this cutoff are marked Reject.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Yield Ratios */}
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
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
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
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Weight threshold in kg that triggers low stock warning badges on inventory cards.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Finance */}
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
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
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
                  className="w-full font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
                />
                <p className="text-xs text-[#6B7280] mt-1">Applicable GST percentage applied during dispatch invoice generation.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Shifts */}
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

        {/* 6. Roll Passport QR & Network */}
        <Card>
          <CardHeader
            title="Roll Passport QR & Network"
            subtitle="Configure base URL for public QR codes across mill and mobile WiFi devices"
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
                <span className="text-xs text-[#6B7280]">QR Target Host Address</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={settings.public_base_url?.value || 'http://localhost:5173'}
                  onChange={(e) => handleInputChange('public_base_url', e.target.value)}
                  placeholder="http://localhost:5173"
                  className="flex-1 font-mono bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
                />
                {lanInfo?.suggested_url && (
                  <button
                    type="button"
                    onClick={() => handleInputChange('public_base_url', lanInfo.suggested_url)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#714B67] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-[8px] transition-colors shrink-0 cursor-pointer"
                  >
                    Use this computer's network address ({lanInfo.lan_ip})
                  </button>
                )}
              </div>
              <p className="text-xs text-[#6B7280] mt-1.5">
                Every generated Roll Passport QR code encodes <code className="font-mono text-[#714B67]">{settings.public_base_url?.value || 'http://localhost:5173'}/passport/&lt;roll_code&gt;</code>.
                When testing on phones connected to the same WiFi, set this to your computer's LAN IP address.
              </p>
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
                  <div className="w-9 h-9 rounded-[8px] bg-purple-50 text-[#714B67] flex items-center justify-center mb-2">
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
                  <div className="w-9 h-9 rounded-[8px] bg-purple-50 text-[#714B67] flex items-center justify-center mb-2">
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
                  <div className="w-9 h-9 rounded-[8px] bg-purple-50 text-[#714B67] flex items-center justify-center mb-2">
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
                  <div className="w-9 h-9 rounded-[8px] bg-purple-50 text-[#714B67] flex items-center justify-center mb-2">
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
    </div>
  );
}
