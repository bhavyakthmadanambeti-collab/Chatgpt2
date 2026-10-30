import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Attachment } from '../types';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (attachment: Attachment) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError(err.message || 'Could not access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!capturedImage) return;

    // Convert dataUrl to Attachment
    const id = 'att_cam_' + Date.now();
    const attachment: Attachment = {
      id,
      name: `camera-snapshot-${Date.now()}.jpg`,
      type: 'image',
      mimeType: 'image/jpeg',
      size: Math.round(capturedImage.length * 0.75),
      url: capturedImage,
      extractedText: '[Attached Photo from Camera - Visual analysis enabled]',
    };

    onCapture(attachment);
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 text-white">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-emerald-400" />
            <h3 className="font-semibold text-sm">Camera Snapshot</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-red-400 space-y-2">
              <AlertCircle size={32} className="mx-auto" />
              <p className="text-sm font-medium">{error}</p>
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Snapshot"
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-gray-950/80 flex items-center justify-between">
          {!capturedImage ? (
            <>
              <button
                onClick={toggleFacingMode}
                className="p-2.5 rounded-full bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors cursor-pointer"
                title="Switch Camera"
              >
                <RefreshCw size={18} />
              </button>

              <button
                onClick={handleCapture}
                disabled={Boolean(error)}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-full font-semibold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Camera size={18} />
                <span>Take Photo</span>
              </button>

              <div className="w-10" />
            </>
          ) : (
            <div className="flex items-center justify-between w-full gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium cursor-pointer"
              >
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm font-semibold shadow-md cursor-pointer"
              >
                <Check size={16} />
                <span>Attach Photo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
