"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Upload, AlertCircle } from "lucide-react";
import { Search, ArrowLeft, Upload, CheckCircle, XCircle } from "lucide-react";
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
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file upload
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
      setError(null);
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    };
    reader.readAsDataURL(file);
      setError(null);
    }
  }

  // Scan signature
  async function handleScan() {
    if (!preview) {
      setError("Please upload a signature first");
    if (!image) {
      alert("Mag-upload muna ng signature!");
      return;
    }

    setLoading(true);
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const base64 = preview.split(",")[1];

      const { data: signatures } = await supabase
      // 1. Get all stored signatures with doctor info
      const { data: signatures, error: sigError } = await supabase
        .from("signatures")
        .select("id, image_url, doctor:doctors(id, name, department, specialty)");
        .select("id, image_url, doctor_id, doctors(id, name)");

      if (sigError) throw sigError;

      if (!signatures || signatures.length === 0) {
        setError("Walang stored signatures! Mag-add muna ng doktor.");
        setScanning(false);
        return;
      }

      // 2. Compress + convert to base64
    const base64 = await new Promise<string>((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
        // Resize to max 800px
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
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressed.split(",")[1]);
    };
    img.src = URL.createObjectURL(image);
    });

      // 3. Prepare signatures list for AI
      const signatureList = signatures.map((s: { id: string; image_url: string; doctor_id: string; doctors: { id: string; name: string }[] }) => ({
        doctor_id: s.doctor_id,
        doctor_name: s.doctors?.[0]?.name || "Unknown",
        image_url: s.image_url,
      }));

      // 4. Call AI API
      const response = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureBase64: base64,
          signatures: signatures || [],
          signatures: signatureList,
        }),
      });

      const data: ScanResult = await response.json();
      setResult(data);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);

        // 5. Save to scan history
        await supabase.from("scan_history").insert({
          identified_doctor_id: data.identified_doctor_id,
          confidence_score: data.confidence_score,
          notes: data.reasoning,
        });
      }
    } catch (err) {
      console.error("Scan error:", err);
      setError("Failed to identify signature");
      setError("May error sa pag-scan. Subukan ulit.");
      console.error(err);
    } finally {
      setLoading(false);
      setScanning(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">I-Scan ang Pirma</h1>
          <p className="text-slate-400">
            Mag-upload ng signature para ma-identify ang doktor
    <main className="min-h-screen bg-gray-950 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-4">
        <Link href="/" className="text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-white">I-Scan ang Pirma</h1>
      </div>

      {/* Upload area */}
      <div className="bg-gray-800 rounded-2xl p-5 mb-4 border border-gray-700">
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
            <Upload size={36} className="mx-auto mb-3 text-gray-500" />
            <p className="text-white font-semibold">Mag-upload ng signature</p>
            <p className="text-gray-500 text-sm mt-1">
              JPG, PNG — Mula sa camera o gallery
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Preview */}
        {preview && (
          <div className="mt-4">
            <p className="text-gray-400 text-sm mb-2">Preview:</p>
            <img
              src={preview}
              alt="Signature preview"
              className="max-h-48 rounded-xl border border-gray-600 bg-white p-3 mx-auto block"
            />
          </div>
        )}
      </div>

      {/* Scan button */}
      {image && (
        <button
          onClick={handleScan}
          disabled={scanning}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors mb-4"
        >
          <Search size={24} />
          {scanning ? "Ine-identify..." : "I-identify ang Pirma"}
        </button>
      )}

      {/* Loading state */}
      {scanning && (
        <div className="bg-gray-800 rounded-2xl p-6 text-center border border-gray-700">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white font-semibold">Ina-analyze ng AI...</p>
          <p className="text-gray-400 text-sm mt-1">
            Ihinahambing sa lahat ng stored signatures
          </p>
        </div>
      )}

        {/* Photo Guidelines */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-blue-300 font-semibold mb-2">📸 Mga Tip para sa Magandang Larawan:</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>✅ Kunin ang <strong>BUONG pirma</strong> (mula dulo hanggang dulo)</li>
                <li>✅ <strong>Centered</strong> sa screen (hindi sa gilid)</li>
                <li>✅ <strong>Maliwanag na liwanag</strong> (walang shadow o madilim)</li>
                <li>✅ <strong>Clear at sharp</strong> (hindi blurry)</li>
                <li>❌ Iwasan ang partial o angled na larawan</li>
              </ul>
            </div>
          </div>
      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-2xl p-5 flex items-start gap-3">
          <XCircle size={24} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

        {/* Upload Section */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-8 mb-8">
          {preview ? (
            <div>
              <p className="text-slate-400 mb-4">Preview:</p>
              <div className="bg-white rounded-lg p-4 mb-4 flex justify-center">
                <img
                  src={preview}
                  alt="Signature preview"
                  className="max-h-48 max-w-full object-contain"
                />
              </div>
      {/* Result */}
      {result && (
        <div className={`rounded-2xl p-5 border ${
          result.is_match_found
            ? "bg-green-900/20 border-green-700"
            : "bg-red-900/20 border-red-700"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {result.is_match_found ? (
              <CheckCircle size={28} className="text-green-400" />
            ) : (
              <XCircle size={28} className="text-red-400" />
            )}
            <h2 className="text-xl font-bold text-white">
              {result.is_match_found ? "Na-identify!" : "Hindi Na-identify"}
            </h2>
          </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPreview(null);
                    setResult(null);
                    setError(null);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  I-Clear
                </button>
                <button
                  onClick={handleScan}
                  disabled={!preview || loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Nag-scan...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      I-Identify ang Pirma
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <Upload className="mx-auto mb-4 text-slate-400" size={32} />
                <p className="text-slate-300 font-medium mb-1">
                  I-click para mag-upload o drag and drop
                </p>
                <p className="text-slate-500 text-sm">PNG, JPG, GIF hanggang 10MB</p>
              </label>
          {/* Doctor Name - Big Green Text */}
          {result.is_match_found && (
            <div className="mb-6 text-center">
              <p className="text-green-400 text-5xl font-bold">
                {result.identified_doctor_name}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300">
              {error}
          {/* Image Comparison */}
          {/* DEBUG - Show referenceImageUrl value */}
          {result.is_match_found && (
            <div className="bg-gray-800 rounded-xl p-3 mb-4 text-center">
              <p className="text-gray-500 text-xs mb-1">DEBUG:</p>
              <p className="text-gray-300 text-xs break-all">
                {result.referenceImageUrl ? "URL: " + result.referenceImageUrl : "referenceImageUrl is NULL"}
              </p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div
            className={`rounded-2xl border p-6 ${
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
              <div className="mb-6">
                <p className="text-green-300 text-sm mb-2">Doktor:</p>
                <p className="text-green-400 text-4xl font-bold">
                  {result.identified_doctor_name}
                </p>
              </div>
            )}

            <div className="mb-6">
              <p className="text-slate-300 text-sm mb-2">Confidence:</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      result.confidence_score >= 0.8
                        ? "bg-green-500"
                        : result.confidence_score >= 0.6
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${result.confidence_score * 100}%` }}
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
                <span className="text-slate-200 font-semibold min-w-fit">
                  {(result.confidence_score * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

            {/* Image Comparison */}
            {result.is_match_found && preview && result.referenceImageUrl && (
              <div className="mb-6">
                <p className="text-slate-300 text-sm mb-3">Comparison:</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-slate-500 text-xs mb-2 text-center">Uploaded</p>
                    <img
                      src={preview}
                      alt="Uploaded signature"
                      className="w-full h-32 object-cover rounded-lg border border-slate-600 bg-white p-2"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-500 text-xs mb-2 text-center">Reference</p>
                    <img
                      src={result.referenceImageUrl}
                      alt="Reference signature"
                      className="w-full h-32 object-cover rounded-lg border border-slate-600 bg-white p-2"
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

            <div>
              <p className="text-slate-300 text-sm mb-2">Reasoning ng AI:</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                {result.reasoning}
              </p>
            </div>
          <div className="bg-gray-900/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Reasoning ng AI:</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {result.reasoning}
            </p>
          </div>
        )}
      </div>
    </div>

          <button
            onClick={() => {
              setImage(null);
              setPreview(null);
              setResult(null);
            }}
            className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Mag-scan ulit
          </button>
        </div>
      )}
    </main>
  );
}