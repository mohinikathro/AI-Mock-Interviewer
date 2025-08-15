"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function InterviewForm() {
  const [formData, setFormData] = useState({
    company: "",
    level: "",
    role: "",
    agreeToTerms: false,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [typedTagline, setTypedTagline] = useState("");
  const router = useRouter();

  const tagline = "Ace every interview with AI.";

  useEffect(() => {
    let i = 0;
    const typing = setInterval(() => {
      setTypedTagline(tagline.slice(0, i + 1));
      i++;
      if (i === tagline.length) clearInterval(typing);
    }, 60);
    return () => clearInterval(typing);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      setError("You must agree to the terms to proceed.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      // Create interview
      const response = await fetch("http://localhost:5000/api/interviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company: formData.company,
          level: formData.level,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit interview data.");
      }

      // Fetch intro
      const introRes = await fetch("http://localhost:5000/api/interview/intro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company: formData.company,
          level: formData.level,
          role: formData.role,
        }),
      });
      

      if (!introRes.ok) {
        const errorIntro = await introRes.json();
        throw new Error(errorIntro.message || "Failed to fetch intro.");
      }

      // Navigate
      router.push(`/auth/mock-interview?start=true&role=${encodeURIComponent(formData.role)}&company=${encodeURIComponent(formData.company)}&level=${encodeURIComponent(formData.level)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    router.replace("/auth/signin");
  };

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-gray-900 via-blue-900 to-black flex items-center justify-center px-12 overflow-hidden">
      {/* NAVBAR */}
      <header className="absolute top-0 left-0 w-full px-6 py-4 flex justify-between items-center z-50 bg-white/10 backdrop-blur-md">
        <h1 className="text-xl font-bold text-white">AI Interview</h1>
        <nav className="hidden md:flex gap-6 text-white font-medium">
          <Link href="/auth/interview-history" className="hover:text-indigo-300">Dashboard</Link>
          <button onClick={handleSignOut} className="hover:text-red-400 transition-all">Sign Out</button>
        </nav>
        <div className="md:hidden">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-white" aria-label="Toggle menu">
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
          {menuOpen && (
            <div className="absolute right-6 top-16 bg-white/90 text-gray-800 shadow-lg rounded-lg overflow-hidden w-40 z-50 transition-all duration-200">
              <Link href="/auth/interview-history" className="block px-4 py-2 hover:bg-indigo-100" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={() => { setMenuOpen(false); handleSignOut(); }} className="block w-full text-left px-4 py-2 hover:bg-indigo-100">Sign Out</button>
            </div>
          )}
        </div>
      </header>

      {/* ORB */}
      <div className="relative w-1/2 flex items-center justify-center">
        <div className="relative w-64 h-64 flex items-center justify-center pointer-events-none">
          <div className="absolute w-96 h-96 bg-gradient-radial from-white/20 via-indigo-400/10 to-transparent rounded-full blur-3xl opacity-30 animate-spin-slow"></div>
          <div className="absolute w-24 h-24 bg-gradient-to-br from-fuchsia-600 via-indigo-500 to-cyan-400 rounded-full shadow-2xl animate-glowPulse"></div>
          <div className="absolute w-36 h-36 bg-purple-500 blur-2xl opacity-40 rounded-full animate-pulseFast"></div>
          <div className="absolute w-48 h-48 border border-cyan-300/30 rounded-full animate-wavePing1"></div>
          <div className="absolute w-64 h-64 border border-fuchsia-400/20 rounded-full animate-wavePing2">
            <div className="absolute w-64 h-64 flex items-center justify-center animate-spin-slow">
              <div className="w-2 h-2 bg-white rounded-full absolute top-0 left-1/2 transform -translate-x-1/2 blur-sm opacity-80"></div>
              <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2 blur-sm opacity-70"></div>
            </div>
          </div>
          <div className="absolute w-80 h-80 bg-gradient-radial from-purple-500/10 to-transparent rounded-full blur-2xl opacity-60"></div>
        </div>
      </div>

      {/* FORM */}
      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-lg p-10 rounded-xl shadow-2xl shadow-indigo-400/30 mr-[-4rem]">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-2">Start Interview</h2>
        <p className="text-center text-indigo-600 font-semibold mb-6 animate-pulse">{typedTagline}</p>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {[
            { id: "company", label: "Company", placeholder: "Enter your company name" },
            { id: "level", label: "Level", placeholder: "E.g., Junior, Mid-level, Senior" },
            { id: "role", label: "Role", placeholder: "E.g., Data Scientist, Software Engineer" },
          ].map(({ id, label, placeholder }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-lg font-medium text-gray-800">{label}</label>
              <input
                type="text"
                name={id}
                id={id}
                placeholder={placeholder}
                value={formData[id as keyof typeof formData] as string}
                onChange={handleChange}
                className="mt-3 block w-full px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 hover:scale-105 transition-all"
                required
              />
            </div>
          ))}

          <div className="flex items-center text-gray-800">
            <input
              type="checkbox"
              name="agreeToTerms"
              id="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="agreeToTerms">
              I agree to the{" "}
              <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                Terms & Conditions
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-4 py-3 text-white font-semibold text-lg rounded-xl shadow-lg transition duration-300 ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-700 hover:to-cyan-600"
            }`}
          >
            {loading ? "Starting..." : "Start Interview"}
          </button>
        </form>
      </div>
    </div>
  );
}
