"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Doctor } from "@/lib/supabase";
import { Plus, ArrowLeft, Trash2, User } from "lucide-react";
import Link from "next/link";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [signature, setSignature] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  async function fetchDoctors() {
    setLoading(true);
    const { data } = await supabase
      .from("doctors")
      .select("*")
      .order("name");
    setDoctors(data || []);
    setLoading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSignature(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  async function handleSave() {
    if (!name || !signature) {
      alert("Lagyan mo ng pangalan at signature!");
      return;
    }
    setSaving(true);
    try {
      // 1. Save doctor
      const { data: doctor, error: docError } = await supabase
        .from("doctors")
        .insert({ name, department, specialty })
        .select()
        .single();

      if (docError) throw docError;

      // 2. Upload signature image
      const filePath = `${doctor.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(filePath, signature);

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from("signatures")
        .getPublicUrl(filePath);

      // 4. Save signature record
      await supabase.from("signatures").insert({
        doctor_id: doctor.id,
        image_url: urlData.publicUrl,
      });

      // Reset form
      setName("");
      setDepartment("");
      setSpecialty("");
      setSignature(null);
      setPreview(null);
      setShowForm(false);
      fetchDoctors();
    } catch (err) {
      alert("May error! Subukan ulit.");
      console.error(err);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete ang doktor na ito?")) return;
    await supabase.from("doctors").delete().eq("id", id);
    fetchDoctors();
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-4">
        <Link href="/" className="text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-white flex-1">Mga Doktor</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <Plus size={18} />
          Dagdag
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-800 rounded-2xl p-5 mb-6 border border-gray-700">
          <h2 className="text-lg font-bold text-white mb-4">Bagong Doktor</h2>
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Pangalan *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Juan dela Cruz"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Department</label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Internal Medicine"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Specialty</label>
              <input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Cardiologist"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Signature Image *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="mt-3 max-h-32 rounded-lg border border-gray-700 bg-white p-2"
                />
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                {saving ? "Sine-save..." : "I-save"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctors list */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center text-gray-600 py-12">
          <User size={48} className="mx-auto mb-3 opacity-30" />
          <p>Wala pang doktor. Mag-dagdag ka!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-gray-800 rounded-2xl p-4 border border-gray-700 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-white">{doc.name}</p>
                <p className="text-gray-400 text-sm">
                  {doc.department || "—"} · {doc.specialty || "—"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-gray-600 hover:text-red-400 transition-colors p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}