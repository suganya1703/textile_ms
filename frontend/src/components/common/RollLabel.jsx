import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Tag } from 'lucide-react';

/**
 * 4x2 Inch Roll Label Component (101.6mm x 50.8mm)
 * Standard industrial roll sticker layout with QR code, ASTM Grade, and mill provenance.
 */
export function RollLabel({ roll, baseUrl = 'http://localhost:5173', className = '' }) {
  if (!roll) return null;

  const rollCode = roll.roll_number || roll.roll_code || `ROLL-${roll.id}`;
  const fabricType = roll.fabric_type || roll.order?.fabric_type || 'Cotton Sheeting';
  const lengthM = roll.length_m || 250;
  const widthIn = roll.width_in || 58;
  const grade = roll.grade || (roll.defect_points <= 20 ? 'A' : 'B');
  const dyeLot = roll.dye_lot || 'DL-001';
  const qrUrl = `${baseUrl.replace(/\/$/, '')}/passport/${encodeURIComponent(rollCode)}`;

  return (
    <div
      className={`label-sticker-4x2 bg-white text-black border border-black/40 rounded-sm p-2 flex items-center justify-between select-none ${className}`}
      style={{
        width: '4in',
        height: '2in',
        maxWidth: '4in',
        maxHeight: '2in',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Left Details Column (~68%) */}
      <div className="flex-1 min-w-0 pr-2 flex flex-col justify-between h-full py-0.5">
        {/* Mill Header & Grade Tag */}
        <div className="flex items-center justify-between border-b border-black/20 pb-0.5">
          <span className="text-[9px] font-black tracking-wider text-black uppercase font-mono">
            EVEREST TEXTILE MILLS
          </span>
          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-black text-white font-mono uppercase">
            GRADE {grade}
          </span>
        </div>

        {/* Big Monospace Roll Code */}
        <div className="my-0.5">
          <div className="text-[15px] font-mono font-black text-black tracking-tight leading-tight truncate">
            {rollCode}
          </div>
        </div>

        {/* Specification Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8.5px] leading-tight font-sans">
          <div>
            <span className="text-gray-600 block text-[7.5px] uppercase">Fabric</span>
            <span className="font-bold text-black truncate block">{fabricType}</span>
          </div>
          <div>
            <span className="text-gray-600 block text-[7.5px] uppercase">Dye Lot</span>
            <span className="font-bold font-mono text-black truncate block">{dyeLot}</span>
          </div>
          <div>
            <span className="text-gray-600 block text-[7.5px] uppercase">Length / Width</span>
            <span className="font-bold text-black block">{lengthM}m × {widthIn}"</span>
          </div>
          <div>
            <span className="text-gray-600 block text-[7.5px] uppercase">Standard</span>
            <span className="font-bold text-black block">ASTM D5430</span>
          </div>
        </div>

        {/* Footer Tag */}
        <div className="border-t border-black/20 pt-0.5 flex items-center justify-between text-[7px] text-gray-700 font-mono">
          <span>Powered by Loomdo</span>
          <span>Scan to Verify</span>
        </div>
      </div>

      {/* Right Column: QR Code (~32%) */}
      <div className="w-[1.2in] h-[1.5in] flex flex-col items-center justify-center pl-1 border-l border-dashed border-black/30 shrink-0">
        <QRCodeSVG
          value={qrUrl}
          size={95}
          level="M"
          includeMargin={false}
          fgColor="#000000"
        />
        <span className="text-[7px] font-mono font-bold text-black mt-1 uppercase tracking-tight text-center">
          Roll Passport
        </span>
      </div>
    </div>
  );
}

/**
 * Modal to preview and print 1 or multiple 4x2 inch roll labels in one print job
 */
export function PrintLabelsModal({ isOpen, onClose, rolls = [], baseUrl = 'http://localhost:5173' }) {
  if (!isOpen || !rolls || rolls.length === 0) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-labels-active');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-labels-active');
    }, 1000);
  };

  return (
    <>
      {/* On-screen Preview Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
        <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#2F3E8F] text-white flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Print Roll Labels (4x2 Inch)
                </h3>
                <p className="text-xs text-gray-500">
                  {rolls.length} {rolls.length === 1 ? 'label' : 'labels'} ready for thermal label printer
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview Scroll Area */}
          <div className="flex-1 overflow-y-auto py-6 space-y-4 flex flex-col items-center bg-gray-50 rounded-xl my-4 border border-gray-100">
            <p className="text-xs text-gray-500 mb-2">
              Print preview (formatted 4" × 2" for thermal or continuous sticker stock):
            </p>
            {rolls.map((roll, idx) => (
              <div
                key={roll.id || roll.roll_number || idx}
                className="shadow-md rounded-sm border border-gray-300 transform transition-transform hover:scale-[1.01]"
              >
                <RollLabel roll={roll} baseUrl={baseUrl} />
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 shrink-0">
            <span className="text-xs text-gray-500">
              QR links encode <code className="font-mono text-[#2F3E8F]">{baseUrl}/passport/...</code>
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#2F3E8F] hover:bg-[#232F70] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print {rolls.length > 1 ? `All ${rolls.length} Labels` : 'Label'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Portal Rendered for Print Only */}
      {createPortal(
        <div id="loomdo-label-print-portal" style={{ display: 'none' }}>
          {rolls.map((roll, idx) => (
            <RollLabel key={roll.id || roll.roll_number || idx} roll={roll} baseUrl={baseUrl} />
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
