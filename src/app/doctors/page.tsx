"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2 } from "lucide-react";

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
];

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDoctor, setNewDoctor] = useState({
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

  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault();

    if (!newDoctor.name || !newDoctor.department || !newDoctor.specialty) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase.from("doctors").insert([
        {
          name: newDoctor.name,
          department: newDoctor.department,
          specialty: newDoctor.specialty,
        },
      ]);

      if (error) throw error;

      setNewDoctor({ name: "", department: "", specialty: "" });
      fetchDoctors();
      alert("Doctor added successfully!");
    } catch (err) {
      console.error("Error adding doctor:", err);
      alert("Failed to add doctor");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mga Doktor</h1>
          <p className="text-slate-400">Manage doctor profiles and signatures</p>
        </div>

        {/* Add Doctor Form */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={20} />
            Add New Doctor
          </h2>

          <form onSubmit={handleAddDoctor} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Doctor Name */}
              <input
                type="text"
                placeholder="Doctor Name"
                value={newDoctor.name}
                onChange={(e) =>
                  setNewDoctor({ ...newDoctor, name: e.target.value })
                }
                className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />

              {/* Department */}
              <input
                type="text"
                placeholder="Department"
                value={newDoctor.department}
                onChange={(e) =>
                  setNewDoctor({ ...newDoctor, department: e.target.value })
                }
                className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />

              {/* Specialty Dropdown */}
              <select
                value={newDoctor.specialty}
                onChange={(e) =>
                  setNewDoctor({ ...newDoctor, specialty: e.target.value })
                }
                className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Specialty</option>
                {SPECIALTIES.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              Add Doctor
            </button>
          </form>
        </div>

        {/* Doctors List */}
        {loading ? (
          <div className="text-center text-slate-400">Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="text-center text-slate-400">
            No doctors added yet
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
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr
                    key={doctor.id}
                    className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">{doctor.name}</td>
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
                      <button
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}