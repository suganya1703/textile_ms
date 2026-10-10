import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, ArrowRight, X, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';

export function RollScannerModal({ isOpen, onClose, onSelectRoll }) {
  const [typedCode, setTypedCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [recentRolls, setRecentRolls] = useState([]);
  const [detectorSupported, setDetectorSupported] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setDetectorSupported(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      api.getRolls('limit=8')
        .then((res) => setRecentRolls(res || []))
        .catch(() => {});
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const extractCodeFromUrl = (str) => {
    if (!str) return '';
    const clean = str.trim();
    if (clean.includes('/passport/')) {
      const parts = clean.split('/passport/');
      return parts[parts.length - 1].split('?')[0].split('#')[0];
    }
    return clean;
  };

  const handleStartCamera = async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser in this context (HTTPS or localhost required).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Start detection loop if BarcodeDetector is available
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'data_matrix']
        });

        const scanFrame = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(scanFrame);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const detected = barcodes[0].rawValue;
              const extracted = extractCodeFromUrl(detected);
              stopCamera();
              onSelectRoll(extracted);
              onClose();
              return;
            }
          } catch (e) {
            // detection frame error, continue loop
          }
          animFrameRef.current = requestAnimationFrame(scanFrame);
        };
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      setCameraError(err.message || 'Could not start camera feed.');
      stopCamera();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if ('BarcodeDetector' in window) {
      try {
        const imageBitmap = await createImageBitmap(file);
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128'] });
        const barcodes = await detector.detect(imageBitmap);
        if (barcodes && barcodes.length > 0) {
          const extracted = extractCodeFromUrl(barcodes[0].rawValue);
          onSelectRoll(extracted);
          onClose();
          return;
        } else {
          setCameraError('No barcode/QR code detected in the selected image.');
        }
      } catch (err) {
        setCameraError('Failed to read image barcode: ' + err.message);
      }
    } else {
      setCameraError('Barcode scanning API is not supported on this browser context. Please enter the Roll Code manually.');
    }
  };

  const handleTypedSubmit = (e) => {
    e.preventDefault();
    if (!typedCode.trim()) return;
    const clean = extractCodeFromUrl(typedCode);
    stopCamera();
    onSelectRoll(clean);
    onClose();
  };

  const handleQuickPick = (rollNumber) => {
    stopCamera();
    onSelectRoll(rollNumber);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#714B67] text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Scan Roll QR / Passport
              </h3>
              <p className="text-xs text-gray-500">
                Lookup roll history, provenance & ASTM grading
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera Scanner Area */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col items-center">
          {cameraActive ? (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-dashed border-[#714B67]/70 m-8 rounded pointer-events-none animate-pulse" />
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-[10px] font-bold rounded"
              >
                Stop Camera
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center py-2 text-center">
              <button
                type="button"
                onClick={handleStartCamera}
                className="flex items-center gap-2 px-4 py-2 bg-[#714B67] text-white text-xs font-bold rounded-xl hover:bg-[#5B3B52] transition-colors cursor-pointer shadow-xs"
              >
                <Camera className="w-4 h-4" />
                Scan via Camera
              </button>
              <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
                <span>Or upload QR photo:</span>
                <label className="text-[#714B67] font-semibold underline cursor-pointer hover:text-[#5B3B52]">
                  Select Image
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 flex items-start gap-1.5 w-full">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {!detectorSupported && !cameraError && (
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              Note: Live QR detection requires HTTPS or localhost with Chrome/Edge. You can always type the roll code below.
            </p>
          )}
        </div>

        {/* Typed Input Form */}
        <form onSubmit={handleTypedSubmit} className="space-y-2">
          <label className="block text-xs font-semibold uppercase text-gray-700">
            Or Enter Roll Code Manually
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value)}
              placeholder="e.g. ROLL-20261001-0001 or 26"
              className="flex-1 font-mono uppercase bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#714B67]"
            />
            <button
              type="submit"
              disabled={!typedCode.trim()}
              className="px-4 py-2 bg-[#714B67] disabled:bg-gray-300 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
            >
              Go <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Quick Picks for Demo/Floor Test */}
        {recentRolls.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Quick Pick Mill Rolls:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {recentRolls.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleQuickPick(r.roll_number)}
                  className="font-mono text-[10.5px] px-2 py-1 bg-purple-50 text-[#714B67] hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                >
                  {r.roll_number?.replace('ROLL-20261001-00', '#') || `#${r.id}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
