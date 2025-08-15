"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function MockInterviewPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<{ role: string; text: string }[]>([]);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const introAttempted = useRef(false);

const [role, setRole] = useState("");
const [company, setCompany] = useState("");
const [level, setLevel] = useState("");

useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search);
  setRole(decodeURIComponent(searchParams.get("role") || "").trim());
  setCompany(decodeURIComponent(searchParams.get("company") || "").trim());
  setLevel(decodeURIComponent(searchParams.get("level") || "").trim());
}, []);


  useEffect(() => {
  if (!role || !company || !level) return;
  if (role === "" || company === "" || level === "") {
    alert("Missing required interview details. Please start from the form.");
    router.push("/auth/interview-form");
  }
}, [role, company, level]);


  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcripts]);

  useEffect(() => {
    if (!introAttempted.current && role && company && level) {
      introAttempted.current = true;
      fetchIntro();
    }
  }, [role, company, level]);

  async function fetchIntro() {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/interview/intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, level })
      });
      const data = await res.json();
      if (data.text) {
        setTranscripts([{ role: "Interviewer", text: data.text }]);
        setConversationHistory([{ role: "assistant", content: data.text }]);
      }
      if (data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      }
      setHasStarted(true);
    } catch (err) {
      console.error("Intro fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleRecord = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    let audioChunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size) audioChunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: recorder.mimeType });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = reader.result!.toString().split(",")[1];
        setTranscripts((t) => [...t, { role: "System", text: "🤖 Processing your response..." }]);

        try {
          const filteredHistory = conversationHistory.filter((m) => m.content?.trim());

          const res = await fetch("http://localhost:5000/api/interview/audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Audio: base64,
              conversationHistory: filteredHistory,
              role,
              company,
              level,
            }),
          });

          const data = await res.json();

          setTranscripts((t) =>
            t.filter((m) => m.text !== "🤖 Processing your response...").concat(
              { role: "User", text: data.userTranscript },
              { role: "Interviewer", text: data.text }
            )
          );

          setConversationHistory((h) => [
            ...h,
            { role: "user", content: data.userTranscript },
            { role: "assistant", content: data.text },
          ]);

          if (data.audio) {
            const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => setIsSpeaking(false);
            await audio.play();
          }
        } catch (err) {
          console.error("Audio processing error:", err);
          setTranscripts((t) =>
            t.filter((m) => m.text !== "🤖 Processing your response...").concat({
              role: "System",
              text: "⚠️ Failed to process audio.",
            })
          );
        }
      };
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);

    // Optional: Auto-stop after 15 seconds
    setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
        setIsRecording(false);
      }
    }, 15000);
  } catch {
    alert("⚠️ Please allow microphone access and try again.");
  }
};

const handleStop = () => {
  const rec = mediaRecorderRef.current;
  if (rec && rec.state === "recording") {
    rec.stop(); // ⬅️ This will trigger recorder.onstop() from handleRecord
    setIsRecording(false);
  }
};

  const handleClearTranscript = () => {
    setTranscripts([]);
    setConversationHistory([]);
    introAttempted.current = false;
    fetchIntro();
  };

  const handleEndInterview = async () => {
  const token = localStorage.getItem("token");

  try {
    const evalRes = await fetch("http://localhost:5000/api/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationHistory }),
    });

    if (!evalRes.ok) throw new Error("Evaluation failed");
    const { evaluation } = await evalRes.json();

   const parseEvaluation = (text: string) => {
  const result: Record<string, any> = {};
  const lines = text.split("\n");

  const metricMap: Record<string, string> = {
    correctness: "Correctness",
    "clarity & structure": "Clarity & Structure",
    completeness: "Completeness",
    relevance: "Relevance",
    "confidence & tone": "Confidence & Tone",
    "communication skills": "Communication Skills"
  };

  for (const line of lines) {
    const scoreMatch = line.match(/^•?\s*(.+?):\s*(\d+)\/10\s*[-–]\s*(.+)/i);
    if (scoreMatch) {
      const rawKey = scoreMatch[1].trim().toLowerCase();
      const score = `${scoreMatch[2]}/10`;
      const explanation = scoreMatch[3].trim();
      const normalized = metricMap[rawKey];
      if (normalized) result[normalized] = { score, explanation };
    }

    if (line.toLowerCase().startsWith("overall feedback")) {
      result["Overall Feedback Summary"] = line.split(":").slice(1).join(":").trim();
    }
  }

  return result;
};


    const structuredEvaluation =
      typeof evaluation === "string" ? parseEvaluation(evaluation) : evaluation;

    // ✅ Add Scores field dynamically
    const categories = [
      "Correctness",
      "Clarity & Structure",
      "Completeness",
      "Relevance",
      "Confidence & Tone",
      "Communication Skills",
    ];

    const scoreLines = categories
  .map((key) => {
    const val = structuredEvaluation[key];
    let scoreStr = typeof val === "string" ? val : val?.score;
    const match = scoreStr?.match(/(\d+(?:\.\d+)?)\/10/);
    return match ? `${key}: ${match[1]}/10` : `${key}: 0/10`;
  })
  .join("\n");

    structuredEvaluation["Scores"] = scoreLines;

    const saveRes = await fetch("http://localhost:5000/api/interviewTranscript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        transcriptData: conversationHistory,
        analysis: structuredEvaluation,
      }),
    });

    if (!saveRes.ok) throw new Error("Save failed");

    console.log("✅ Transcript and evaluation saved!");
    router.push("/auth/thankyou");
  } catch (err) {
    console.error("❌ End Interview error:", err);
    alert("Something went wrong while ending the interview.");
  }
};


  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-blue-900 to-black flex">
      <div className="relative w-3/4 flex items-center justify-center p-6 overflow-hidden">
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none w-full h-full">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <div className="absolute w-96 h-96 bg-gradient-radial from-white/20 via-indigo-400/10 to-transparent rounded-full blur-3xl opacity-30 animate-spin-slow z-0"></div>
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
        )}

        {/* Controls */}
        <div className="absolute bottom-20 w-full px-12">
          <div className="flex justify-center gap-6">
            <button
              onClick={handleRecord}
              disabled={isRecording || isLoading}
              className={`px-6 py-3 rounded-xl text-white font-semibold ${
                isRecording || isLoading ? "bg-red-300" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              🎙 {isRecording ? "Recording..." : "Start Recording"}
            </button>
            <button
              onClick={handleStop}
              disabled={!isRecording}
              className={`px-6 py-3 rounded-xl text-white font-semibold ${
                !isRecording ? "bg-gray-400" : "bg-gray-600 hover:bg-gray-700"
              }`}
            >
              ⏹ Stop
            </button>
          </div>
          {hasStarted && (
            <div className="absolute right-12 bottom-0">
              <button
                onClick={handleEndInterview}
                className="px-6 py-3 bg-red-700 hover:bg-red-800 text-white rounded-xl font-semibold"
              >
                🚪 End Interview
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transcript panel */}
      <div className="w-1/4 bg-white/90 backdrop-blur-sm shadow-2xl p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Transcript</h2>
          <button onClick={handleClearTranscript} className="text-sm text-blue-600 hover:underline">
            Restart Interview
          </button>
        </div>
        <div ref={transcriptRef} className="space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {transcripts.map((t, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg shadow-sm ${
                t.role === "User"
                  ? "bg-teal-100 text-teal-800"
                  : t.role === "Interviewer"
                  ? "bg-gray-200 text-gray-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <strong>{t.role === "Interviewer" ? "Interviewer" : t.role}:</strong> {t.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
