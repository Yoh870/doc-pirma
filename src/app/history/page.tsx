"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, History, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

interface ScanRecord {
  id: string;
  confidence_score: number | null;
  notes: string | null;
  created_at: string;
  identified_doctor_id: string | null;
  doctors: { name: string } | null;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    const { data } = await supabase
      .from("scan_history")
      .select("*, doctors(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    setRecords((data as ScanRecord[]) || []);
    setLoading(false);
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("tl-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getConfidenceColor(score: number | null) {
    if (!score) return "text-gray-500";
    if (score >= 0.8) return "text-green-400";
    if (score >= 0.5) return "text-yellow-400";
    return "text-red-400";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-4">
        <Link href="/" className="text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Scan History</h1>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-gray-600 py-12">
          <History size={48} className="mx-auto mb-3 opacity-30" />
          <p>Wala pang scan history.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              className="bg-gray-800 rounded-2xl p-4 border border-gray-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {record.identified_doctor_id ? (
                    <CheckCircle size={20} className="text-green-400 shrink-0" />
                  ) : (
                    <XCircle size={20} className="text-red-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-white">
                      {record.doctors?.name || "Hindi na-identify"}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatDate(record.created_at)}
                    </p>
                  </div>
                </div>
                {record.confidence_score && (
                  <span className={`font-bold text-sm shrink-0 ${getConfidenceColor(record.confidence_score)}`}>
                    {Math.round(record.confidence_score * 100)}%
                  </span>
                )}
              </div>
              {record.notes && (
                <p className="text-gray-500 text-xs mt-3 leading-relaxed line-clamp-2">
                  {record.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}