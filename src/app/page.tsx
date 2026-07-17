import Link from "next/link";
import { Search, Users, History, Stethoscope } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-blue-600 p-3 rounded-2xl">
            <Stethoscope size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">Doc Pirma</h1>
        </div>
        <p className="text-gray-400 text-lg">
          I-identify ang pirma ng doktor gamit ang AI
        </p>
        <p className="text-gray-600 text-sm mt-1">
          City of Ilagan Medical Center
        </p>
      </div>

      {/* Menu cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        <Link
          href="/scan"
          className="group bg-blue-600 hover:bg-blue-500 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
        >
          <Search size={36} className="text-white" />
          <div className="text-center">
            <p className="font-bold text-white text-lg">I-Scan</p>
            <p className="text-blue-200 text-sm">I-identify ang pirma</p>
          </div>
        </Link>

        <Link
          href="/doctors"
          className="group bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-gray-500/25 border border-gray-700"
        >
          <Users size={36} className="text-blue-400" />
          <div className="text-center">
            <p className="font-bold text-white text-lg">Mga Doktor</p>
            <p className="text-gray-400 text-sm">Manage signatures</p>
          </div>
        </Link>

        <Link
          href="/history"
          className="group bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-gray-500/25 border border-gray-700"
        >
          <History size={36} className="text-purple-400" />
          <div className="text-center">
            <p className="font-bold text-white text-lg">History</p>
            <p className="text-gray-400 text-sm">Mga nakaraang scan</p>
          </div>
        </Link>
      </div>

      <p className="text-gray-700 text-xs mt-12">
        Powered by Claude AI + Supabase
      </p>
    </main>
  );
}