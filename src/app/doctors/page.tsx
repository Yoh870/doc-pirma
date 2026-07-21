"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, X, Upload } from "lucide-react";
import Image from "next/image";

interface Doctor {
  id: string;
  name: string;
  department: string;
  specialty: string;
  signature_url: string;
  created_at: string;
}

const SPECIALTIES = [
  "Surgical",
  "Pediatrics",
  "Psychiatry",
  "Medical",
  "OB-GYN",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Dermatology",
  "Emergency",
  "Derma",
  "Optha",
  "ENT",
];

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("All");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    specialty: "",
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  async function fetchDoctors() {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
    } catch (err) {
      console.error("Error fetching doctors:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter doctors by selected specialty
  const filteredDoctors =
    selectedSpecialty === "All"
      ? doctors
      : doctors.filter((d) => d.specialty === selectedSpecialty);

  // Get unique specialties from existing doctors
  const uniqueSpecialties = Array.from(
    new Set(doctors.map((d) => d.specialty))
  ).filter(Boolean);

  // Handle signature file selection
  function handleSignatureSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSignaturePreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  // Upload signature to Supabase storage
  async function uploadSignature(file: File): Promise<string> {
    try {
      const timestamp = Date.now();
      const filename = `signatures/${timestamp}-${file.name}`;

      const { data, error } = await supabase.storage
        .from("signatures")
        .upload(filename, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from("signatures")
        .getPublicUrl(filename);

      return publicUrl.publicUrl;
    } catch (err) {
      console.error("Error uploading signature:", err);
      throw new Error("Failed to upload signature");
    }
  }

  async function handleSaveDoctor(e: React.FormEvent) {
    e.preventDefault();

    // Check if signature is provided
    if (!selectedImage && !editingDoctor) {
      alert("Please upload a signature for the doctor");
      return;
    }

    if (!formData.name || !formData.department || !formData.specialty) {
      alert("Please fill in all fields");
      return;
    }

    setUploading(true);

    try {
      let signatureUrl = editingDoctor?.signature_url || "";

      // Upload new signature if selected
      if (selectedImage) {
        signatureUrl = await uploadSignature(selectedImage);
      }

      if (editingDoctor) {
        // UPDATE existing doctor
        const { error } = await supabase
          .from("doctors")
          .update({
            name: formData.name,
            department: formData.department,
            specialty: formData.specialty,
            signature_url: signatureUrl,
          })
          .eq("id", editingDoctor.id);

        if (error) throw error;
        alert("Doctor updated successfully!");
        setEditingDoctor(null);
      } else {
        // CREATE new doctor
        const { error } = await supabase.from("doctors").insert([
          {
            name: formData.name,
            department: formData.department,
            specialty: formData.specialty,
            signature_url: signatureUrl,
          },
        ]);

        if (error) throw error;
        alert("Doctor added successfully!");
        setIsAddingNew(false);
      }

      setFormData({ name: "", department: "", specialty: "" });
      setSelectedImage(null);
      setSignaturePreviewUrl("");
      fetchDoctors();
    } catch (err) {
      console.error("Error saving doctor:", err);
      alert("Failed to save doctor");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDoctor(id: string) {
    if (!confirm("Are you sure you want to delete this doctor?")) return;

    try {
      const { error } = await supabase.from("doctors").delete().eq("id", id);

      if (error) throw error;

      fetchDoctors();
      alert("Doctor deleted successfully!");
    } catch (err) {
      console.error("Error deleting doctor:", err);
      alert("Failed to delete doctor");
    }
  }

  function openEditModal(doctor: Doctor) {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      department: doctor.department,
      specialty: doctor.specialty,
    });
    setSignaturePreviewUrl(doctor.signature_url);
    setSelectedImage(null);
    setIsAddingNew(false);
  }

  function closeModals() {
    setEditingDoctor(null);
    setIsAddingNew(false);
    setFormData({ name: "", department: "", specialty: "" });
    setSelectedImage(null);
    setSignaturePreviewUrl("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mga Doktor</h1>
          <p className="text-slate-400">
            Manage doctor profiles and signatures for Doc Pirma
          </p>
        </div>

        {/* Add Doctor Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              setIsAddingNew(true);
              setEditingDoctor(null);
              setFormData({ name: "", department: "", specialty: "" });
              setSignaturePreviewUrl("");
              setSelectedImage(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Add New Doctor
          </button>
        </div>

        {/* Specialty Filter Tabs */}
        {doctors.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSpecialty("All")}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedSpecialty === "All"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              All ({doctors.length})
            </button>

            {uniqueSpecialties.map((spec) => {
              const count = doctors.filter((d) => d.specialty === spec).length;
              return (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    selectedSpecialty === spec
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {spec} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Doctors Table */}
        {loading ? (
          <div className="text-center text-slate-400">Loading doctors...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center text-slate-400">
            {selectedSpecialty === "All"
              ? "No doctors added yet"
              : `No doctors in ${selectedSpecialty}`}
          </div>
        ) : (
          <div className="overflow-x-auto bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/30">
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Signature
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Specialty
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Added
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr
                    key={doctor.id}
                    className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      {doctor.signature_url && (
                        <button
                          onClick={() => setPreviewSignature(doctor.signature_url)}
                          className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-600 hover:border-blue-500 transition-colors"
                        >
                          <img
                            src={doctor.signature_url}
                            alt={`${doctor.name} signature`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {doctor.name}
                    </td>
                    <td className="px-6 py-4 text-sm">{doctor.department}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                        {doctor.specialty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(doctor.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => openEditModal(doctor)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doctor.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(isAddingNew || editingDoctor) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingDoctor ? "Edit Doctor" : "Add New Doctor"}
              </h2>
              <button
                onClick={closeModals}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-4">
              {/* Doctor Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Doctor Name
                </label>
                <input
                  type="text"
                  placeholder="Dr. John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g., Surgical Ward"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Specialty Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Specialty
                </label>
                <select
                  value={formData.specialty}
                  onChange={(e) =>
                    setFormData({ ...formData, specialty: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select Specialty</option>
                  {SPECIALTIES.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Signature Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Doctor Signature <span className="text-red-400">*Required</span>
                </label>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureSelect}
                    className="hidden"
                    id="signature-input"
                  />
                  <label
                    htmlFor="signature-input"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload size={32} className="text-slate-400" />
                    <span className="text-slate-300 font-medium">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-slate-500 text-sm">
                      PNG, JPG, GIF up to 10MB
                    </span>
                  </label>
                </div>
              </div>

              {/* Signature Preview */}
              {signaturePreviewUrl && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Preview
                  </label>
                  <div className="bg-white rounded-lg p-4 flex justify-center">
                    <img
                      src={signaturePreviewUrl}
                      alt="Signature preview"
                      className="max-h-32 max-w-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || (!selectedImage && !editingDoctor)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {uploading
                    ? "Uploading..."
                    : editingDoctor
                      ? "Update"
                      : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Preview Modal */}
      {previewSignature && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Signature Preview</h2>
              <button
                onClick={() => setPreviewSignature(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="bg-white rounded-lg p-4 flex justify-center">
              <img
                src={previewSignature}
                alt="Signature"
                className="max-h-96 max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}