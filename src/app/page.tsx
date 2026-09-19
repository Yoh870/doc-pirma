import Link from "next/link";
import { Search, Users, History, Stethoscope } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-blue-950 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
            <Stethoscope size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Doc Pirma
          </h1>
        </div>
        <p className="text-gray-300 text-lg">
          I-identify ang pirma ng doktor gamit ang AI
        </p>
        <p className="text-gray-500 text-sm mt-1 font-medium">
          City of Ilagan Medical Center
        </p>
      </div>

      {/* Menu cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        <Link
          href="/scan"
          className="group bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-105 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/30"
        >
          <Search size={36} className="text-white" />
          <div className="text-center">
            <p className="font-bold text-white text-lg">I-Scan</p>
            <p className="text-blue-200 text-sm">I-identify ang pirma</p>
          </div>
        </Link>

        <Link
          href="/doctors"
          className="group bg-gray-800/80 hover:bg-gray-800 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-105 shadow-lg shadow-black/10 hover:shadow-xl border border-gray-700/50 hover:border-gray-600"
        >
          <Users size={36} className="text-blue-400" />
          <div className="text-center">
            <p className="font-bold text-white text-lg">Mga Doktor</p>
            <p className="text-gray-400 text-sm">Manage signatures</p>
          </div>
        </Link>

        <Link
          href="/history"
          className="group bg-gray-800/80 hover:bg-gray-800 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-105 shadow-lg shadow-black/10 hover:shadow-xl border border-gray-700/50 hover:border-gray-600"
        >
          <History size={36} className="text-purple-400" />
          <div className="text-center">
            <p className="font-bold text-white text-lg">History</p>
            <p className="text-gray-400 text-sm">Mga nakaraang scan</p>
          </div>
        </Link>
      </div>

      <div className="flex flex-col items-center gap-2 mt-14">
        <p className="text-gray-600 text-xs">
          Powered by Claude AI + Supabase
        </p>
        <p className="text-gray-700 text-xs">
          Developed by{" "}
          <span className="text-gray-500 font-medium">
            Mario Jimenez Gañgan
          </span>
        </p>
      </div>

      <form action="/api/logout" method="POST" className="mt-4">
        <button
          type="submit"
          className="text-gray-500 hover:text-gray-300 text-sm underline"
        >
          Mag-logout
        </button>
      </form>
    </main>
  );
}
