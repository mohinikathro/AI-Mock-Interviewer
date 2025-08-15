// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");


const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET","POST"] },
});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const googleTTSClient = new TextToSpeechClient();
const assemblyAIKey = process.env.ASSEMBLYAI_API_KEY;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error(err));

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET","POST"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ─── Models ────────────────────────────────────────────────────────────────
const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
}));

const Interview = mongoose.model("Interview", new mongoose.Schema({
  company: String,
  level: String,
  role: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userEmail: String,
  date: { type: Date, default: Date.now },
  transcript: [{ role: String, content: String }],
}));

const TranscriptSchema = new mongoose.Schema({
  interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  company: String,
  role: String,
  level: String,
  transcriptData: mongoose.Schema.Types.Mixed,
  analysis: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});
const Transcript = mongoose.model("Transcript", TranscriptSchema);

// ─── Auth Middleware ───────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token is missing" });
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

// ─── Auth Routes ───────────────────────────────────────────────────────────
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );
    res.status(201).json({ message: "User created", token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );
    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Start Interview ────────────────────────────────────────────────────────
app.post("/api/interviews", authenticateToken, async (req, res) => {
  const { company, level, role } = req.body;
  const interview = new Interview({
    company,
    level,
    role,
    userId: req.user.userId,
    userEmail: req.user.email,
    transcript: [{
      role: "system",
      content: `This is a mock interview for a ${role} position at ${company}, level: ${level}.`
    }],
  });
  await interview.save();
  res.status(201).json({
    message: "Interview started successfully!",
    interviewId: interview._id,
  });
});

// ─── EVALUATION-ONLY Endpoint ───────────────────────────────────────────────
///////////////////////////
// NEW: /api/evaluate
///////////////////////////
app.post(
  "/api/evaluate",
  authenticateToken,
  async (req, res) => {
    const { conversationHistory = [] } = req.body;
    if (!Array.isArray(conversationHistory)) {
      return res.status(400).json({ message: "Bad payload: conversationHistory array required" });
    }

    try {
      // Filter only the user messages
      const userMessages = conversationHistory
  .filter((m) => m.role === "user")
  .map((m) => m.content)
  .join("\n\n---\n\n");

const evaluationPrompt = `
Evaluate the candidate's overall performance across all answers.

Provide a score out of 10 and a short explanation for each of the following categories:
• Correctness
• Clarity & Structure
• Completeness
• Relevance
• Confidence & Tone
• Communication Skills

Use this exact format:
• Correctness: 6/10 – The answer is mostly accurate but lacks depth...
• Clarity & Structure: 5/10 – Response structure is unclear...
...
Overall Feedback: (1-paragraph summary)
`;

      const evaluationResp = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: evaluationPrompt }
        ],
        temperature: 0.3,
      });

      const evaluation = evaluationResp.choices[0].message.content;
      return res.json({evaluation});
    } catch (err) {
      console.error("❌ Evaluation error:", err);
      return res.status(500).json({ message: "Evaluation failed" });
    }
  }
);

// ─── SAVE TRANSCRIPT + ANALYSIS ─────────────────────────────────────────────
app.post(
  "/api/interviewTranscript",
  authenticateToken,
  async (req, res) => {
    const userId = req.user.userId;
    const { transcriptData, analysis } = req.body;

    if (!transcriptData) {
      return res.status(400).json({ message: "transcriptData is required" });
    }
    if (!analysis) {
      return res.status(400).json({ message: "analysis is required" });
    }

    try {
      // Find the most recent interview
      const latestInterview = await Interview
        .findOne({ userId })
        .sort({ date: -1 });

      if (!latestInterview) {
        return res.status(404).json({ message: "No interview found for this user" });
      }

      const newTranscript = new Transcript({
        interviewId: latestInterview._id,
        userId,
        company: latestInterview.company,
        role: latestInterview.role,
        level: latestInterview.level,
        transcriptData,
        analysis,
      });
      await newTranscript.save();

      res.status(201).json({
        message: "Transcript saved successfully",
        transcriptId: newTranscript._id,
        interviewDetails: {
          interviewId: latestInterview._id,
          company: latestInterview.company,
          role: latestInterview.role,
          level: latestInterview.level,
        },
      });
    } catch (error) {
      console.error("❌ Error saving transcript:", error);
      res.status(500).json({ message: "Failed to save transcript" });
    }
  }
);

// ─── Existing Interview Audio + TTS ────────────────────────────────────────
app.post("/api/interview/intro", async (req, res) => {
  const { company, level, role } = req.body;
  console.log("👀 Intro Variables:", { company, level, role });
  


  if (!company || !level || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
   const prompt = `
You are Rachel, a professional and friendly mock interviewer.

Candidate interview details:
- Company: ${company}
- Role: ${role}
- Level: ${level}

Begin the interview by greeting the candidate. Clearly state:
• The role: "${role}"
• The level: "${level}"
• The company: "${company}"

Say it as: "This is a level ${level} interview for the ${role} position at ${company}."

Ask how they are doing. Keep it under 3 sentences.

Do not introduce yourself as the candidate.
Do not make up extra information about the company.
Do not ask anything unrelated to the role, level, or company.
`;



console.log("🧠 Final Prompt Sent to Groq:\n", prompt);


    const groqResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.3,
      presence_penalty: 1.0,
      frequency_penalty: 0.7,
    });

    const openingLine = groqResponse.choices[0].message.content;
    
    const [ttsResponse] = await googleTTSClient.synthesizeSpeech({
      input: { text: openingLine },
      voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
      audioConfig: { audioEncoding: "MP3" },
    });

    const audioBase64 = Buffer.from(ttsResponse.audioContent).toString("base64");
    res.status(200).json({ text: openingLine, audio: audioBase64 });
  } catch (err) {
    console.error("/intro error:", err);
    res.status(500).json({ message: "Failed to generate intro" });
  }
});

function parseEvaluationText(raw) {
  const result = {};
  const lines = raw.split("\n");

  let capturingOverall = false;
  let overallText = "";

  const normalizeKey = (key) => {
    const normalized = key.toLowerCase().replace(/&/g, "and").trim();
    if (normalized.includes("clarity")) return "Clarity & Structure";
    if (normalized.includes("confidence")) return "Confidence & Tone";
    if (normalized.includes("communication")) return "Communication Skills";
    if (normalized.includes("correctness")) return "Correctness";
    if (normalized.includes("completeness")) return "Completeness";
    if (normalized.includes("relevance")) return "Relevance";
    return key.trim();
  };

  for (const line of lines) {
    const match = line.match(/^•?\s*(.+?):\s*(\d+)\/10\s*[–-]?\s*(.*)$/i);
    if (match) {
      const key = normalizeKey(match[1]);
      const score = `${match[2]}/10`;
      const explanation = match[3]?.trim() || "";
      result[key] = { score, explanation };
      continue;
    }

    if (line.toLowerCase().startsWith("overall feedback")) {
      capturingOverall = true;
      overallText = line.split(":").slice(1).join(":").trim();
      continue;
    }

    if (capturingOverall) {
      if (line.trim() === "") break;
      overallText += " " + line.trim();
    }
  }

  if (overallText) {
    result["Overall Feedback Summary"] = overallText.trim();
  }

  return result;
}





app.post("/api/interview/audio", async (req, res) => {
  const { base64Audio, conversationHistory = [], role, company, level } = req.body;
  if (!base64Audio) {
    return res.status(400).json({ message: "No audio data provided" });
  }

  try {
    // 1. Upload to AssemblyAI
    const uploadResp = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      Buffer.from(base64Audio, "base64"),
      {
        headers: {
          authorization: assemblyAIKey,
          "Content-Type": "application/octet-stream",
        },
      }
    );
    const audioUrl = uploadResp.data.upload_url;

    // 2. Request transcription
    const { id: transcriptId } = (
      await axios.post(
        "https://api.assemblyai.com/v2/transcript",
        {
          audio_url: audioUrl,
          punctuate: true,
          format_text: true,
          speaker_labels: false,
          language_code: "en_us",
          word_boost: ["you", "data", "science", "EDA", "model"],
          boost_param: "high",
          disfluencies: false,
        },
        { headers: { authorization: assemblyAIKey } }
      )
    ).data;

    // 3. Poll until complete
    let transcript = "";
    while (true) {
      const status = (
        await axios.get(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
          { headers: { authorization: assemblyAIKey } }
        )
      ).data;
      if (status.status === "completed") {
        transcript = status.text;
        break;
      }
      if (status.status === "failed") {
        return res.status(500).json({ message: "Transcription failed" });
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 4. Append user transcript if new
    const messages = [...conversationHistory];
    if (transcript && !messages.some((m) => m.role === "user" && m.content === transcript)) {
      messages.push({ role: "user", content: transcript });
    }

    // 5. Ask the LLM for the next question
    const groqResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
You are a professional and friendly mock interviewer.

You are interviewing a candidate for the role of **${role}** at **${company}**, specifically for a **Level ${level}** position.

Your task:
- Ask one realistic, relevant, and technical interview question.
- Tailor the question to the domain or expected responsibilities of ${company}, if known (e.g., autonomous driving, robotics, etc.).
- Consider the candidate's last response and keep the conversation flowing naturally.
- DO NOT say phrases like “Here's your next question” or “Let’s begin with…”
- DO NOT give feedback or commentary. Only ask the question.
- Keep the question concise (1–2 sentences). It should sound like it’s from a real human interviewer.
`,
        },
        ...messages,
      ],
      model: "llama3-8b-8192",
      temperature: 0.3,
      presence_penalty: 1.0,
      frequency_penalty: 0.7,
    });
    const aiResponse = groqResponse.choices[0].message.content;

    // 6. Optional per‐turn evaluation
    let evaluation = null;
    if (transcript) {
      const evalPrompt = `
Evaluate the following candidate response:

"${transcript}"

For each of the following categories:
• Correctness
• Clarity & Structure
• Completeness
• Relevance
• Confidence & Tone
• Communication Skills

Give a score out of 10 **and a one-sentence explanation** of that score.

Return your response in this exact format:

• Correctness: 6/10 — Explanation of the score
• Clarity & Structure: 5/10 — Explanation of the score
• Completeness: 4/10 — Explanation of the score
• Relevance: 5/10 — Explanation of the score
• Confidence & Tone: 7/10 — Explanation of the score
• Communication Skills: 6/10 — Explanation of the score

Overall Feedback: A short paragraph summarizing the strengths and areas for improvement.
`;

      const evalResp = await groq.chat.completions.create({
        messages: [{ role: "system", content: evalPrompt }],
        model: "llama3-8b-8192",
        temperature: 0.3,
      });
      evaluation = evalResp.choices[0].message.content;
    }

    // 7. TTS for AI question
    const [ttsResp] = await googleTTSClient.synthesizeSpeech({
      input: { text: aiResponse },
      voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
      audioConfig: { audioEncoding: "MP3" },
    });
    const audioBase64 = Buffer.from(ttsResp.audioContent).toString("base64");

    // 8. Parse evaluation and return response
    const structuredEvaluation =
      typeof evaluation === "string" ? parseEvaluationText(evaluation) : evaluation;
    console.log("📝 Raw Evaluation Response:", evaluation);
    console.log("🧪 Parsed Evaluation:", structuredEvaluation);
    res.status(200).json({
      userTranscript: transcript,
      text: aiResponse,
      audio: audioBase64,
      evaluation: structuredEvaluation,
    });
  } catch (error) {
    console.error("❌ Audio processing error:", error);
    res.status(500).json({ message: "Audio processing failed" });
  }
}); // ✅ DO NOT FORGET THIS CLOSING LINE


//////Dashboard backend
// ─── BACKEND: GET All Transcripts for Logged-In User ───────────────────────────

app.get("/api/my-interviews", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const transcripts = await Transcript.find({ userId })
      .sort({ createdAt: -1 })
      .select("company role level createdAt analysis transcriptData");

    res.json({ interviews: transcripts });
  } catch (err) {
    console.error("❌ Fetch interviews failed:", err);
    res.status(500).json({ message: "Failed to fetch interview history" });
  }
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
