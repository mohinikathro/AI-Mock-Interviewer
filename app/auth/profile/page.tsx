"use client"; // Mark this as a client component

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Import useRouter for redirection

export default function ProfilePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userData, setUserData] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isClient, setIsClient] = useState(false); // Track if we're on the client-side
  const router = useRouter(); // Initialize router for redirection

  // Set isClient to true when mounted in the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token"); // Get the token from localStorage or cookies
      if (token) {
        try {
          const res = await fetch("http://localhost:5000/api/profile", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            setUserData(data); // Set the fetched user data
            setLoading(false); // Stop loading once data is fetched
          } else {
            console.log("Error fetching user profile:", res.statusText);
            setError("Failed to load profile data.");
            setLoading(false);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setError("An error occurred while fetching the profile.");
          setLoading(false);
        }
      } else {
        setError("No token found, please log in.");
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Handle Sign-out
  const handleSignOut = () => {
    localStorage.removeItem("token"); // Remove the token from localStorage
    router.push("/signin"); // Redirect to the signin page
  };

  // Ensure the component renders only on the client-side
  if (!isClient) {
    return null; // Return nothing during SSR (Server-Side Rendering)
  }

  return (
    <>
      {/* Navbar with Hamburger Menu */}
      <nav className="w-full bg-white shadow-lg p-4 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-screen-xl mx-auto flex justify-between items-center">
          {/* Logo or Title */}
          <h1 className="text-xl font-bold text-gray-800">AI Interview</h1>

          {/* Hamburger Button */}
          <button
            className="text-gray-800 text-3xl focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>

        {/* Dropdown Menu */}
        <div
          className={`absolute top-16 right-0 w-48 bg-white shadow-xl rounded-lg transition-transform duration-300 ${
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"
          }`}
          style={{ display: menuOpen ? "block" : "none" }}
        >
          <ul className="py-2 text-gray-800">
            <li className="px-6 py-2 hover:bg-gray-200">
              <Link href="/auth/interview-form">Home</Link>
            </li>
            <li className="px-6 py-2 hover:bg-gray-200">
              <Link href="/auth/dashboard">Dashboard</Link>
            </li>
            <li className="px-6 py-2 hover:bg-gray-200">
              {/* Sign-out button now performs logout and redirects */}
              <button onClick={handleSignOut} className="w-full text-left px-6 py-2 hover:bg-gray-200">
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Profile Page */}
      <div className="min-h-screen bg-gradient-professional flex items-center justify-center py-12 px-6 mt-16">
        <div className="w-full max-w-screen-xl flex items-center justify-center">
          {/* Profile Card */}
          <div className="w-1/2 bg-white/70 backdrop-blur-lg p-8 rounded-xl shadow-2xl shadow-teal-500/50">
            <h2 className="text-4xl font-bold text-center text-gray-800 mb-6">Your Profile</h2>

            {loading ? (
              <p>Loading...</p> // Show loading message when data is being fetched
            ) : error ? (
              <p className="text-red-500">{error}</p> // Show error message if there's an issue
            ) : (
              <>
                <p className="text-lg text-gray-700 mb-4">
                  <span className="font-semibold">Name:</span> {userData.name || "N/A"}
                </p>
                <p className="text-lg text-gray-700">
                  <span className="font-semibold">Email:</span> {userData.email || "N/A"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
