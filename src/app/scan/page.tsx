"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Upload, AlertCircle } from "lucide-react";

interface ScanResult {
  identified_doctor_id: string | null;
  identified_doctor_name: string | null;
  confidence_score: number;
  reasoning: string;
  is_match_found: boolean;
  referenceImageUrl?: string | null;
}

export default function ScanPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file upload
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
      setError(null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }

  // Scan signature
  async function handleScan() {
    if (!preview) {
      setError("Please upload a signature first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const base64 = preview.split(",")[1];

      const { data: signatures } = await supabase
        .from("signatures")
        .select("id, image_url, doctor:doctors(id, name, department, specialty)");

      const response = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureBase64: base64,
          signatures: signatures || [],
        }),
      });

      const data: ScanResult = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Scan error:", err);
      setError("Failed to identify signature");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">I-Scan ang Pirma</h1>
          <p className="text-slate-400">
            Mag-upload ng signature para ma-identify ang doktor
          </p>
        </div>

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
        </div>

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
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300">
              {error}
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
                  />
                </div>
                <span className="text-slate-200 font-semibold min-w-fit">
                  {(result.confidence_score * 100).toFixed(1)}%
                </span>
              </div>
            </div>

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

            <div>
              <p className="text-slate-300 text-sm mb-2">Reasoning ng AI:</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                {result.reasoning}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}