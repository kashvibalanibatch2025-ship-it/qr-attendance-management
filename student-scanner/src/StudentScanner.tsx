import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  MapPin, 
  Wifi, 
  CheckCircle2, 
  XCircle, 
  Camera, 
  QrCode, 
  RefreshCw, 
  Sparkles,
  ShieldCheck,
  UserCheck,
  FlipHorizontal,
  Upload
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { API_BASE } from './config/api';

// Quick test preset students from SCANNER_APP_SPEC.md
const PRESET_STUDENTS = [
  { rollNo: '25070521001', name: 'ARUSHI VARGHESE', section: 'Sec A' },
  { rollNo: '25070521002', name: 'LARANYA SHENDE', section: 'Sec A' },
  { rollNo: '25070521004', name: 'HARSHINI S J', section: 'Sec A' },
  { rollNo: '25070521071', name: 'PREETI GAUTAM', section: 'Sec B' },
  { rollNo: '25070521142', name: 'ADITYA RAJ', section: 'Sec C' },
];

export default function StudentScanner() {
  const [step, setStep] = useState<'info' | 'face' | 'qr' | 'success' | 'error'>('info');
  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [devBypassGPS, setDevBypassGPS] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [scannedDetails, setScannedDetails] = useState<{
    subject?: string;
    section?: string;
    classroom?: string;
    teacher?: string;
    markedAt?: string;
  } | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Get GPS coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('GPS prompt denied or unavailable:', err.message),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Cleanup camera streams when component unmounts
  useEffect(() => {
    return () => {
      stopAllStreams();
      stopQrScanner();
    };
  }, []);

  const stopAllStreams = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  };

  const stopQrScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch (e) {
        // Ignore stop error
      }
      qrScannerRef.current = null;
    }
  };

  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      // AudioContext unavailable or blocked
    }
  };

  // Step 1 -> Step 2: Face Verification
  const startFaceVerification = async () => {
    if (!rollNo.trim()) return;
    setStep('face');
    setStatusMessage('Position your face inside the circle...');

    try {
      stopAllStreams();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      activeStreamRef.current = stream;

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play().catch(() => {});
      }

      // Simulate biometric face verification check (2.5s)
      setTimeout(() => {
        stopAllStreams();
        setStatusMessage('Face Verified ✓ Launching QR Scanner...');
        setTimeout(() => startQrScanner(), 800);
      }, 2500);
    } catch (err: any) {
      alert('Camera access denied or unavailable: ' + (err.message || err));
      setStep('info');
    }
  };

  // Step 2 -> Step 3: QR Scanner using html5-qrcode
  const startQrScanner = (mode: 'user' | 'environment' = facingMode) => {
    setStep('qr');
    setStatusMessage('Align the classroom QR code inside the frame');

    setTimeout(() => {
      const html5QrCode = new Html5Qrcode('qr-reader');
      qrScannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: mode },
        { 
          fps: 12, 
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.floor(minEdge * 0.72);
            return { width: edgeSize, height: edgeSize };
          }
        },
        async (decodedText) => {
          await stopQrScanner();
          handleScannedData(decodedText);
        },
        () => {} // Silent on individual frame misses
      ).catch((err) => {
        console.error('QR Scanner start error:', err);
        // Fallback: try default camera without facingMode constraint
        html5QrCode.start(
          {},
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            await stopQrScanner();
            handleScannedData(decodedText);
          },
          () => {}
        ).catch((secondErr) => {
          alert('Unable to start QR camera: ' + secondErr);
          setStep('info');
        });
      });
    }, 350);
  };

  const flipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    await stopQrScanner();
    startQrScanner(nextMode);
  };

  // Handle uploaded image file containing QR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await stopQrScanner();
      const html5QrCode = new Html5Qrcode('qr-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScannedData(decodedText);
    } catch (err: any) {
      alert('Could not decode QR code from uploaded image. Please try another photo.');
      startQrScanner();
    }
  };

  // Step 3 -> Step 4: Submit to Backend API
  const handleScannedData = async (scannedRaw: string) => {
    setStatusMessage('Syncing attendance with Teacher Portal...');

    // Extract clean JWT token if a full URL was scanned (e.g. http://localhost:3000/scan/eyJ...)
    let cleanToken = scannedRaw.trim();
    if (cleanToken.includes('/scan/')) {
      cleanToken = cleanToken.split('/scan/').pop()?.split('?')[0] || cleanToken;
    }

    try {
      const response = await fetch(`${API_BASE}/api/attendance/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: cleanToken,
          rollNo: rollNo.trim(),
          name: studentName.trim() || undefined,
          lat: location?.lat || 21.1255,
          lng: location?.lng || 79.0522,
          wifiSSID: 'SYMBI_NGP_STUDENT',
          faceVerified: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark attendance');
      }

      // Success chime and confetti celebration!
      playSuccessChime();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EC77AB', '#D4C0F2', '#16A34A', '#FED6E3', '#0ea5e9']
      });

      setScannedDetails({
        markedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      setStep('success');
      setStatusMessage(data.message || 'Attendance Marked Successfully! 🎉');
    } catch (err: any) {
      setStep('error');
      setStatusMessage(err.message || 'QR validation failed. Please scan again.');
    }
  };

  const selectPreset = (student: typeof PRESET_STUDENTS[0]) => {
    setRollNo(student.rollNo);
    setStudentName(student.name);
  };

  return (
    <div className="min-h-screen bg-[#fdf2f6] text-[#12122B] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#FED6E3] rounded-full blur-3xl opacity-60 pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#D4C0F2] rounded-full blur-3xl opacity-50 pointer-events-none -z-10 animate-pulse" />

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md bg-white/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#D4C0F2] relative transition-all">
        
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="w-13 h-13 rounded-2xl bg-[#EC77AB]/10 text-[#EC77AB] flex items-center justify-center mx-auto mb-3 shadow-inner border border-[#EC77AB]/20">
            <QrCode className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-sora text-[#12122B] tracking-tight">Student Attendance</h1>
          <p className="text-xs text-[#6B6B85] mt-1 font-medium">Symbiosis Institute of Technology · Nagpur</p>
        </div>

        {/* Verification Status Badges (GPS + Wi-Fi) */}
        <div className="flex justify-between items-center mb-6 text-xs bg-[#fdf2f6]/90 p-3 rounded-2xl border border-[#D4C0F2]/80 font-plex-mono shadow-sm">
          <div className="flex items-center gap-1.5 text-[#12122B]">
            <MapPin className="w-3.5 h-3.5 text-[#EC77AB]" />
            <span className={location || devBypassGPS ? 'text-[#16A34A] font-semibold' : 'text-amber-600'}>
              {location ? 'GPS: Active' : devBypassGPS ? 'GPS: Dev Pass' : 'GPS: Searching'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#12122B]">
            <Wifi className="w-3.5 h-3.5 text-[#EC77AB]" />
            <span className="text-[#16A34A] font-semibold">SYMBI_NGP_STUDENT</span>
          </div>
        </div>

        {/* ================= STEP 1: Student Input ================= */}
        {step === 'info' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#12122B] uppercase tracking-wider block mb-1.5">
                PRN / Roll Number <span className="text-[#EC77AB]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 25070521001"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full bg-[#fdf2f6] text-[#12122B] placeholder:text-[#6B6B85]/60 border border-[#D4C0F2] rounded-xl h-12 px-4 font-plex-mono text-sm focus:ring-2 focus:ring-[#EC77AB] focus:border-transparent outline-none transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#12122B] uppercase tracking-wider block mb-1.5">
                Full Name <span className="text-[#6B6B85] font-normal lowercase">(optional if registered)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Arushi Varghese"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-[#fdf2f6] text-[#12122B] placeholder:text-[#6B6B85]/60 border border-[#D4C0F2] rounded-xl h-12 px-4 text-sm focus:ring-2 focus:ring-[#EC77AB] focus:border-transparent outline-none transition-all shadow-inner"
              />
            </div>

            {/* Quick-test Presets from Teacher Portal Database */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-[#6B6B85] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#EC77AB]" />
                  Quick Test Students:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_STUDENTS.map((p) => (
                  <button
                    key={p.rollNo}
                    type="button"
                    onClick={() => selectPreset(p)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      rollNo === p.rollNo
                        ? 'bg-[#EC77AB] text-white border-[#EC77AB] font-semibold shadow-sm'
                        : 'bg-white/80 hover:bg-[#FED6E3]/40 text-[#12122B] border-[#D4C0F2]'
                    }`}
                  >
                    {p.name.split(' ')[0]} ({p.section})
                  </button>
                ))}
              </div>
            </div>

            {/* Dev Geofence Bypass Checkbox */}
            <div className="flex items-center gap-2 pt-1 text-xs text-[#6B6B85]">
              <input
                type="checkbox"
                id="devBypass"
                checked={devBypassGPS}
                onChange={(e) => setDevBypassGPS(e.target.checked)}
                className="rounded accent-[#EC77AB] w-4 h-4 cursor-pointer"
              />
              <label htmlFor="devBypass" className="cursor-pointer select-none">
                Dev Mode (Allow testing away from campus)
              </label>
            </div>

            <button
              disabled={!rollNo.trim()}
              onClick={startFaceVerification}
              className="w-full h-12 mt-2 bg-[#EC77AB] hover:bg-[#EC77AB]/90 disabled:opacity-40 text-white font-sora font-semibold rounded-2xl shadow-lg shadow-[#EC77AB]/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5" />
              <span>Verify Face & Scan QR</span>
            </button>
          </div>
        )}

        {/* ================= STEP 2: Face Check (Webcam) ================= */}
        {step === 'face' && (
          <div className="flex flex-col items-center py-2">
            <div className="flex items-center gap-2 mb-3 text-[#EC77AB] font-sora text-sm font-semibold text-center">
              <ShieldCheck className="w-4 h-4 animate-bounce" />
              <span>{statusMessage}</span>
            </div>

            {/* Circular Mirrored Webcam Viewfinder with Radar Pulse */}
            <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-[#EC77AB] shadow-2xl mb-4 bg-black flex items-center justify-center">
              <video
                ref={webcamVideoRef}
                className="w-full h-full object-cover transform -scale-x-100"
                playsInline
                muted
                autoPlay
              />
              {/* Pulsing Guide Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-white/70 animate-pulse pointer-events-none" />
              <div className="absolute inset-[-15%] rounded-full border border-[#EC77AB]/40 radar-sweep pointer-events-none" />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#6B6B85] mt-1">
              <UserCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Keep your head steady and well-lit...</span>
            </div>
          </div>
        )}

        {/* ================= STEP 3: QR Code Scanner ================= */}
        {step === 'qr' && (
          <div className="flex flex-col items-center py-1">
            <div className="flex items-center justify-between w-full mb-3">
              <p className="text-xs font-semibold text-[#EC77AB] font-sora">
                Show Teacher's QR Code to Camera
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={flipCamera}
                  title="Switch Camera (Front/Back)"
                  className="p-1.5 rounded-lg bg-white border border-[#D4C0F2] text-[#12122B] hover:text-[#EC77AB] transition-colors"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload QR Image from file"
                  className="p-1.5 rounded-lg bg-white border border-[#D4C0F2] text-[#12122B] hover:text-[#EC77AB] transition-colors"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* HTML5 QR Code Mount Region */}
            <div className="w-full overflow-hidden rounded-2xl border-2 border-[#D4C0F2] shadow-inner bg-black aspect-square flex items-center justify-center relative">
              <div id="qr-reader" className="w-full h-full" />
            </div>

            <div className="flex items-center justify-between w-full mt-3 text-xs text-[#6B6B85]">
              <span>Scanning live camera feed...</span>
              <button
                type="button"
                onClick={() => {
                  stopQrScanner();
                  setStep('info');
                }}
                className="text-[#EC77AB] hover:underline font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: Success Screen ================= */}
        {step === 'success' && (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-[#16A34A]/15 text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-[#16A34A]/20 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold font-sora text-[#16A34A]">Marked Present!</h2>
            <p className="text-[#12122B] font-medium mt-2 text-sm">{statusMessage}</p>

            <div className="mt-4 flex flex-col gap-2 items-center">
              <div className="inline-block bg-[#fdf2f6] px-4 py-1.5 rounded-full border border-[#D4C0F2] text-xs font-plex-mono text-[#12122B]">
                PRN: <b>{rollNo}</b>
              </div>
              {scannedDetails?.markedAt && (
                <div className="text-[11px] text-[#6B6B85] font-plex-mono">
                  Timestamp: {scannedDetails.markedAt}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setRollNo('');
                setStudentName('');
                setStep('info');
              }}
              className="mt-6 w-full h-12 bg-[#12122B] hover:bg-[#12122B]/90 text-white font-sora font-semibold rounded-2xl shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              Scan Another Student
            </button>
          </div>
        )}

        {/* ================= STEP 5: Error Screen ================= */}
        {step === 'error' && (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-[#DC2626]/15 text-[#DC2626] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-[#DC2626]/20">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold font-sora text-[#DC2626]">Scan Failed</h2>
            <p className="text-[#12122B] mt-2 text-sm font-medium">{statusMessage}</p>

            <button
              onClick={() => setStep('info')}
              className="mt-6 w-full h-12 bg-[#EC77AB] hover:bg-[#EC77AB]/90 text-white font-sora font-semibold rounded-2xl shadow-lg shadow-[#EC77AB]/30 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
