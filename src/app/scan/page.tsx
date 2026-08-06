"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, ArrowLeft, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";

interface ScanResult {
  identified_doctor_id: string | null;
  identified_doctor_name: string | null;
  confidence_score: number;
  reasoning: string;
  is_match_found: boolean;
  referenceImageUrl?: string | null;
}

export default function ScanPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Hindi ma-access ang camera. Bigyan ng permission o subukan mag-upload.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }

  function resetAll() {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  async function handleScan() {
    if (!image) {
      setError("Mag-upload muna ng signature!");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxSize = 800;
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
        };
        img.onerror = () => reject(new Error("Hindi ma-load ang image"));
        img.src = URL.createObjectURL(image);
      });

      const response = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureBase64: base64 }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || "May error sa pag-scan. Subukan ulit.");
        return;
      }

      setResult(data);
    } catch (err) {
      console.error("Scan error:", err);
      setError("May error sa pag-scan. Subukan ulit.");
    } finally {
      setLoading(false);
    }
  }

  function getConfidenceColor(score: number) {
    if (score >= 0.8) return "text-green-400";
    if (score >= 0.5) return "text-yellow-400";
    return "text-red-400";
  }

  function getConfidenceLabel(score: number) {
    if (score >= 0.8) return "Mataas";
    if (score >= 0.5) return "Katamtaman";
    return "Mababa";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6 pt-4">
        <Link href="/" className="text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-white">I-Scan ang Pirma</h1>
      </div>

      <div className="bg-gray-800 rounded-2xl p-5 mb-4 border border-gray-700">
        {!preview && !cameraActive && (
          <button
            onClick={startCamera}
            className="w-full border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors"
          >
            <Camera size={36} className="mx-auto mb-3 text-gray-500" />
            <p className="text-white font-semibold">Buksan ang Camera</p>
            <p className="text-gray-500 text-sm mt-1">
              I-click para kumuha ng larawan ng pirma
            </p>
          </button>
        )}

        {cameraActive && (
          <div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-xl border border-gray-600 bg-black"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                Kunin ang Larawan
              </button>
              <button
                onClick={stopCamera}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Kanselahin
              </button>
            </div>
          </div>
        )}

        {preview && (
          <div>
            <p className="text-gray-400 text-sm mb-2">Preview:</p>
            <img
              src={preview}
              alt="Signature preview"
              className="max-h-48 rounded-xl border border-gray-600 bg-white p-3 mx-auto block"
            />
            <button
              onClick={() => {
                resetAll();
                startCamera();
              }}
              className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Kunin Ulit
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {!cameraActive && (
          <label className="block cursor-pointer mt-3">
            <div className="text-center text-gray-500 text-sm hover:text-blue-400 transition-colors flex items-center justify-center gap-2">
              <Upload size={14} />
              O mag-upload ng larawan mula sa gallery
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {image && !result && (
        <button
          onClick={handleScan}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Nag-a-analyze...
            </>
          ) : (
            <>
              <Upload size={20} />
              I-Identify ang Pirma
            </>
          )}
        </button>
      )}

      {result && (
        <div
          className={`rounded-2xl border p-6 mt-2 ${
            result.is_match_found
              ? "border-green-500/30 bg-green-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {result.is_match_found ? (
              <>
                <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 font-bold">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-green-400">Na-identify!</h2>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-red-500/30 flex items-center justify-center">
                  <span className="text-red-400 font-bold">×</span>
                </div>
                <h2 className="text-2xl font-bold text-red-400">Hindi Na-identify</h2>
              </>
            )}
          </div>

          {result.is_match_found && (
            <div className="mb-6 text-center">
              <p className="text-gray-400 text-sm mb-1">Doktor:</p>
              <p className="text-green-400 text-4xl font-bold">
                {result.identified_doctor_name}
              </p>
            </div>
          )}

          {result.is_match_found && preview && result.referenceImageUrl && (
            <div className="bg-gray-900/50 rounded-xl p-4 mb-4">
              <p className="text-gray-400 text-sm mb-3">Comparison:</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-gray-500 text-xs mb-2 text-center">Uploaded</p>
                  <img
                    src={preview}
                    alt="Uploaded signature"
                    className="w-full h-32 object-cover rounded-lg border border-gray-600 bg-white p-2"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs mb-2 text-center">Reference</p>
                  <img
                    src={result.referenceImageUrl}
                    alt="Reference signature"
                    className="w-full h-32 object-cover rounded-lg border border-gray-600 bg-white p-2"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-3">
            <span className="text-gray-400 text-sm">Confidence:</span>
            <span className={`font-bold text-lg ${getConfidenceColor(result.confidence_score)}`}>
              {Math.round(result.confidence_score * 100)}%
            </span>
            <span className={`text-sm ${getConfidenceColor(result.confidence_score)}`}>
              ({getConfidenceLabel(result.confidence_score)})
            </span>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-sm mb-1">Reasoning ng AI:</p>
            <p className="text-gray-300 text-sm leading-relaxed">{result.reasoning}</p>
          </div>

          <button
            onClick={resetAll}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Mag-scan ulit
          </button>
        </div>
      )}
    </main>
  );
}