"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function SignIn() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [typedTagline, setTypedTagline] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Invalid credentials");

      localStorage.setItem("token", data.token);
      router.push("/auth/interview-form");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-blue-900 to-black flex items-center justify-center px-12 overflow-hidden relative">
      {/* Orb on the LEFT */}
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

      {/* Sign-In Form on RIGHT */}
      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-lg p-10 rounded-xl shadow-2xl shadow-indigo-400/30 mr-[-4rem]">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-2">Sign In</h2>
        <p className="text-center text-indigo-600 font-semibold mb-6 animate-pulse">{typedTagline}</p>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-lg font-medium text-gray-800">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              className="mt-3 block w-full px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 hover:scale-105 transition-all"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password with toggle */}
          <div>
            <label htmlFor="password" className="block text-lg font-medium text-gray-800">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                className="mt-3 block w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 hover:scale-105 transition-all"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-indigo-600 font-semibold hover:text-indigo-800"
            >
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-6 py-3 text-white font-semibold text-lg rounded-xl shadow-lg transition duration-300 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-700 hover:to-cyan-600"
            }`}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-4 text-lg text-gray-700">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-indigo-600 font-semibold hover:text-indigo-800 hover:underline hover:underline-offset-4"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
