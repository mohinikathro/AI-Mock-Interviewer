"use client";

import { useRouter } from "next/navigation";

export default function ThankYouPage() {
  const router = useRouter();

  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-blue-900 to-black flex flex-col items-center justify-center text-white px-4">
      <h1 className="text-4xl font-bold mb-4 text-center">🎉 Congratulations!</h1>
      <p className="text-xl mb-10 text-center">Thank you for taking your interview with us.</p>

      <div className="flex gap-6">
        <button
          onClick={() => router.push("/auth/interview-history")}
          className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-700 hover:to-cyan-600 text-white font-semibold text-lg rounded-xl shadow-lg transition duration-300"
        >
          See Results
        </button>

        
      </div>
    </div>
  );
}
