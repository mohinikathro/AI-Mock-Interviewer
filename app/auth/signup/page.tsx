"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react"; // Optional: You can use any icon library

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Signup failed");

      router.push("/auth/signin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-blue-900 to-black flex items-center justify-center px-12 overflow-hidden relative">
      {/* Orb */}
      <div className="relative w-1/2 flex items-center justify-center">
        {/* ...orb animation as before... */}
      </div>

      {/* Form */}
      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-lg px-10 py-12 rounded-2xl shadow-2xl shadow-indigo-400/30 mr-[-4rem] min-h-[32rem] flex flex-col justify-center">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-1">Sign Up</h2>
        <p className="text-center text-indigo-600 font-semibold mb-6 animate-pulse">
          {typedTagline}
        </p>

        {error && <p className="text-red-500 text-center mb-2">{error}</p>}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {["name", "email", "password", "confirmPassword"].map((field) => {
            const isPasswordField = field === "password" || field === "confirmPassword";
            const show = field === "password" ? showPassword : showConfirmPassword;
            const toggle = () =>
              field === "password"
                ? setShowPassword((s) => !s)
                : setShowConfirmPassword((s) => !s);

            return (
              <div key={field}>
                <label htmlFor={field} className="block text-lg font-medium text-gray-800">
                  {field === "confirmPassword"
                    ? "Confirm Password"
                    : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>

                <div className="relative">
                  <input
                    type={
                      isPasswordField
                        ? show
                          ? "text"
                          : "password"
                        : field === "email"
                        ? "email"
                        : "text"
                    }
                    name={field}
                    id={field}
                    placeholder={`Enter your ${
                      field === "confirmPassword" ? "password again" : field
                    }`}
                    className="mt-2 block w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 hover:scale-[1.02] transition-all"
                    value={formData[field as keyof typeof formData]}
                    onChange={handleChange}
                    required
                  />
                  {isPasswordField && (
                    <button
                      type="button"
                      onClick={toggle}
                      className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                      tabIndex={-1}
                    >
                      {show ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="text-right mt-1">
            <Link
              href="/auth/signin"
              className="text-sm text-indigo-600 font-semibold hover:text-indigo-800"
            >
              Already have an account? Sign In
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-4 py-3 text-white font-semibold text-lg rounded-xl shadow-lg transition duration-300 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-700 hover:to-cyan-600"
            }`}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
