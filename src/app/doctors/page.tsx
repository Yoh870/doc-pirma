"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, X } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  department: string;
  specialty: string;
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

  async function handleSaveDoctor(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.department || !formData.specialty) {
      alert("Please fill in all fields");
      return;
    }

    try {
      if (editingDoctor) {
        // UPDATE existing doctor
        const { error } = await supabase
          .from("doctors")
          .update({
            name: formData.name,
            department: formData.department,
            specialty: formData.specialty,
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
          },
        ]);

        if (error) throw error;
        alert("Doctor added successfully!");
        setIsAddingNew(false);
      }

      setFormData({ name: "", department: "", specialty: "" });
      fetchDoctors();
    } catch (err) {
      console.error("Error saving doctor:", err);
      alert("Failed to save doctor");
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
    setIsAddingNew(false);
  }

  function closeModals() {
    setEditingDoctor(null);
    setIsAddingNew(false);
    setFormData({ name: "", department: "", specialty: "" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mga Doktor</h1>
          <p className="text-slate-400">Manage doctor profiles and signatures</p>
        </div>

        {/* Add Doctor Button */}
        <div className="mb-6">
          <button
            onClick={() => {
              setIsAddingNew(true);
              setEditingDoctor(null);
              setFormData({ name: "", department: "", specialty: "" });
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
                    className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => openEditModal(doctor)}
                  >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(doctor);
                          }}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDoctor(doctor.id);
                          }}
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
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  {editingDoctor ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}