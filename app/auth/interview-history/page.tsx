"use client";

import React, { useEffect, useState } from "react";
import { Bar, Line, Pie, Radar } from "react-chartjs-2";
import Chart from "chart.js/auto";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
} from "chart.js";
import { useRouter } from "next/navigation";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale
);

interface EvaluationField {
  score: string;
  explanation: string;
}

interface EvaluationAnalysis {
  Correctness?: string | EvaluationField;
  "Clarity & Structure"?: string | EvaluationField;
  Completeness?: string | EvaluationField;
  Relevance?: string | EvaluationField;
  "Confidence & Tone"?: string | EvaluationField;
  "Communication Skills"?: string | EvaluationField;
  "Overall Feedback Summary"?: string;
  Scores?: string;
}

interface Interview {
  _id: string;
  company: string;
  role: string;
  level: string;
  createdAt: string;
  analysis?: EvaluationAnalysis;
}

export default function InterviewHistory() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selected, setSelected] = useState<Interview | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/my-interviews", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setInterviews(data.interviews || []))
      .catch((err) => console.error("Failed to load interviews", err));
  }, []);

  const extractScoreFromText = (text: string, field: string): number => {
    if (!text || !field) return 0;
    const regex = new RegExp(`${field}:\\s*(\\d+(?:\\.\\d+)?)/10`, "i");
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : 0;
  };

  const safeSplit = (val?: string | EvaluationField, scoresText?: string, label?: string): number => {
    if (typeof val === "string" && val.includes("/")) {
      const num = parseFloat(val.split("/")[0]);
      return isNaN(num) ? 0 : num;
    }
    if (typeof val === "object" && val?.score) {
      const num = parseFloat(val.score.split("/")[0]);
      return isNaN(num) ? 0 : num;
    }
    if (scoresText && label) return extractScoreFromText(scoresText, label);
    return 0;
  };

  const sanitizeScore = (val: number) => (isNaN(val) || val < 0 ? 0 : val);

  const getBarData = (analysis: EvaluationAnalysis) => {
    const labels = [
      "Correctness",
      "Clarity & Structure",
      "Completeness",
      "Relevance",
      "Confidence & Tone",
      "Communication Skills",
    ];

    const rawScores = labels.map((label) =>
      sanitizeScore(safeSplit(analysis?.[label as keyof EvaluationAnalysis], analysis?.Scores, label))
    );

    return {
      labels,
      datasets: [
        {
          label: "Evaluation Scores",
          data: rawScores,
          backgroundColor: "rgba(168, 85, 247, 0.4)",
          borderColor: "rgba(168, 85, 247, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  const getRadarData = getBarData;

  const getLineData = () => {
    const labels: string[] = [];
    const scores: number[] = [];

    interviews.forEach((i) => {
      const a = i.analysis;
      const score = [
        safeSplit(a?.Correctness, a?.Scores, "Correctness"),
        safeSplit(a?.["Clarity & Structure"], a?.Scores, "Clarity & Structure"),
        safeSplit(a?.Completeness, a?.Scores, "Completeness"),
        safeSplit(a?.Relevance, a?.Scores, "Relevance"),
        safeSplit(a?.["Confidence & Tone"], a?.Scores, "Confidence & Tone"),
        safeSplit(a?.["Communication Skills"], a?.Scores, "Communication Skills"),
      ];
      if (score.some((s) => s > 0)) {
        labels.push(new Date(i.createdAt).toLocaleDateString());
        scores.push(score.reduce((a, b) => a + b, 0) / score.length);
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Average Score Trend",
          data: scores,
          fill: false,
          borderColor: "#c084fc",
          tension: 0.3,
        },
      ],
    };
  };

  const getRoleDistribution = () => {
    const roleCount: Record<string, number> = {};
    interviews.forEach((i) => {
      roleCount[i.role] = (roleCount[i.role] || 0) + 1;
    });
    return {
      labels: Object.keys(roleCount),
      datasets: [
        {
          label: "Role Distribution",
          data: Object.values(roleCount),
          backgroundColor: ["#c084fc", "#a855f7", "#7e22ce", "#6b21a8"],
        },
      ],
    };
  };

  const getHeatmapData = () => {
    const buckets: Record<string, number[]> = {};
    interviews.forEach((i) => {
      const key = `${i.role} - L${i.level}`;
      const a = i.analysis;
      if (!a) return;
      if (!buckets[key]) buckets[key] = [0, 0, 0, 0, 0, 0, 0];

      const scores = [
        safeSplit(a?.Correctness, a?.Scores, "Correctness"),
        safeSplit(a?.["Clarity & Structure"], a?.Scores, "Clarity & Structure"),
        safeSplit(a?.Completeness, a?.Scores, "Completeness"),
        safeSplit(a?.Relevance, a?.Scores, "Relevance"),
        safeSplit(a?.["Confidence & Tone"], a?.Scores, "Confidence & Tone"),
        safeSplit(a?.["Communication Skills"], a?.Scores, "Communication Skills"),
      ];

      if (!scores.every((s) => isNaN(s))) {
        for (let j = 0; j < 6; j++) {
          buckets[key][j] += isNaN(scores[j]) ? 0 : scores[j];
        }
        buckets[key][6] += 1;
      }
    });

    const labels = [
      "Correctness",
      "Clarity & Structure",
      "Completeness",
      "Relevance",
      "Confidence & Tone",
      "Communication Skills",
    ];

    return {
      labels,
      datasets: Object.entries(buckets).map(([group, values], i) => ({
        label: group,
        data: values.slice(0, 6).map((v) => Math.round(v / values[6])),
        backgroundColor: `rgba(${130 + i * 15}, ${85 + i * 20}, 247, 0.3)`,
      })),
    };
  };

  const renderScore = (field?: string | EvaluationField) => {
    if (!field) return "N/A";
    if (typeof field === "string") return field;
    return (
      <span>
        <strong>{field.score}</strong> — {field.explanation}
      </span>
    );
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-blue-900 to-black flex overflow-hidden relative">
      {/* Top-right Buttons */}
      <div className="absolute top-4 right-6 flex gap-4 z-50">
        <button
          onClick={() => router.push("/auth/interview-form")}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow hover:brightness-110 transition"
        >
          Take Another Interview
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            router.push("/auth/signin");
          }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow hover:brightness-110 transition"
        >
          Sign Out
        </button>
      </div>

      {/* Left Panel */}
      <div className="w-1/3 bg-white/80 backdrop-blur-lg shadow-xl p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">My Interviews ({interviews.length})</h2>
        {interviews.map((item) => (
          <div
            key={item._id}
            onClick={() => setSelected(item)}
            className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <p className="font-semibold text-gray-800">{item.company}</p>
            <p className="text-sm text-gray-600">
              {item.role} — Level {item.level}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(item.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Right Panel */}
      <div className="w-2/3 p-8 overflow-y-auto text-white">
        {selected ? (
          <>
            <h2 className="text-3xl font-bold mb-2">
              {selected.company} — {selected.role} (Level {selected.level})
            </h2>
            <p className="mb-6 text-indigo-200">
              Interviewed on: {new Date(selected.createdAt).toLocaleString()}
            </p>

            {selected.analysis ? (
              <>
                <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 mb-6 shadow-lg h-72">
                  <Bar data={getBarData(selected.analysis)} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 10 } } }} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow h-72">
                    <Radar data={getRadarData(selected.analysis)} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                  <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow h-72">
                    <Pie data={getRoleDistribution()} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                  <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow h-72">
                    <Bar data={getHeatmapData()} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 10 } } }} />
                  </div>
                  <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow h-72">
                    <Line data={getLineData()} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 shadow-md text-gray-800">
                  <h3 className="text-lg font-semibold mb-3">Detailed Feedback</h3>
                  <p className="mb-2"><strong>Overall:</strong> {selected.analysis["Overall Feedback Summary"]}</p>
                  <p><strong>Correctness:</strong> {renderScore(selected.analysis.Correctness)}</p>
                  <p><strong>Clarity & Structure:</strong> {renderScore(selected.analysis["Clarity & Structure"])}</p>
                  <p><strong>Completeness:</strong> {renderScore(selected.analysis.Completeness)}</p>
                  <p><strong>Relevance:</strong> {renderScore(selected.analysis.Relevance)}</p>
                  <p><strong>Confidence & Tone:</strong> {renderScore(selected.analysis["Confidence & Tone"])}</p>
                  <p><strong>Communication Skills:</strong> {renderScore(selected.analysis["Communication Skills"])}</p>
                </div>
              </>
            ) : (
              <div className="text-indigo-200 text-lg mt-10">
                No feedback analysis available for this interview yet.
              </div>
            )}
          </>
        ) : (
          <p className="text-indigo-200 text-lg">Select an interview to view details.</p>
        )}
      </div>
    </div>
  );
}
