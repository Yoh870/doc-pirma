"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, ArrowLeft, Upload, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

interface ScanResult {
  identified_doctor_id: string | null;
  identified_doctor_name: string | null;
  confidence_score: number;
  reasoning: string;
  is_match_found: boolean;
}

export default function ScanPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  }

  async function handleScan() {
    if (!image) {
      alert("Mag-upload muna ng signature!");
      return;
    }

    setScanning(true);
    setError(null);
    setResult(null);

    try {
      // 1. Get all stored signatures with doctor info
      const { data: signatures, error: sigError } = await supabase
        .from("signatures")
        .select("id, image_url, doctor_id, doctors(id, name)");

      if (sigError) throw sigError;

      if (!signatures || signatures.length === 0) {
        setError("Walang stored signatures! Mag-add muna ng doktor.");
        setScanning(false);
        return;
      }

      // 2. Convert uploaded image to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(image);
      });

      // 3. Prepare signatures list for AI
      const signatureList = signatures.map((s: any) => ({
        doctor_id: s.doctor_id,
        doctor_name: s.doctors?.name || "Unknown",
        image_url: s.image_url,
      }));

      // 4. Call AI API
      const response = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureBase64: base64,
          signatures: signatureList,
        }),
      });

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
      setError("May error sa pag-scan. Subukan ulit.");
      console.error(err);
    }

    setScanning(false);
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

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-2xl p-5 flex items-start gap-3">
          <XCircle size={24} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

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

          {result.is_match_found && (
            <div className="bg-gray-900/50 rounded-xl p-4 mb-4">
              <p className="text-gray-400 text-sm">Doktor:</p>
              <p className="text-white text-2xl font-bold mt-1">
                {result.identified_doctor_name}
              </p>
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

          <div className="bg-gray-900/50 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Reasoning ng AI:</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {result.reasoning}
            </p>
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