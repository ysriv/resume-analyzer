"use client";

import { useEffect, useRef, useState } from "react";
import { api, initAuthToken, setAuthToken } from "@/lib/api";

type ATSAnalysis = {
  ats_score: number;
  content_score: number;
  impact_score: number;
  grammar_score: number;
  issues: string[];
  strengths: string[];
};

type JDMatch = {
  match_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  semantic_similarity: number;
} | null;

type ParsedSections = {
  contact: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  projects: string;
  certifications: string;
  other: string;
};

type AnalysisResponse = {
  id?: number;
  filename: string;
  overall_score: number;
  ats_analysis: ATSAnalysis;
  jd_match: JDMatch;
  parsed_sections: ParsedSections;
  suggestions: string[];
  rewritten_summary: string | null;
  created_at?: string;
};

export default function Home() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [history, setHistory] = useState<AnalysisResponse[]>([]);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    initAuthToken();
    const token = localStorage.getItem("token");
    if (token) {
      setLoggedIn(true);
      fetchHistory();
    }
  }, []);

  const authenticate = async () => {
    setAuthLoading(true);
    setError("");

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : { email, password, full_name: fullName };

      const response = await api.post(endpoint, payload);
      setAuthToken(response.data.access_token);
      setLoggedIn(true);
      fetchHistory();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get("/analyses");
      setHistory(response.data);
    } catch {
      setHistory([]);
    }
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    const isValid =
      selectedFile.name.toLowerCase().endsWith(".pdf") ||
      selectedFile.name.toLowerCase().endsWith(".docx");

    if (!isValid) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please upload a PDF or DOCX resume.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (jobDescription.trim()) {
        formData.append("job_description", jobDescription);
      }

      const response = await api.post("/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(response.data);
      fetchHistory();
      window.scrollTo({ top: 1000, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const exportDocx = async (id: number) => {
    const response = await api.get(`/export/analysis/${id}/docx`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis_${id}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const logout = () => {
    setAuthToken(null);
    setLoggedIn(false);
    setHistory([]);
    setResult(null);
    setFile(null);
    setJobDescription("");
  };

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#120f4f_0%,#2e0f8a_45%,#4c1db8_100%)] text-white">
        <div className="mx-auto max-w-md px-6 py-16">
          <div className="rounded-[28px] border border-white/10 bg-white/10 p-8 backdrop-blur-md shadow-2xl">
            <div className="mb-6">
              <div className="text-sm font-bold tracking-[0.35em] text-white/90">
                RESUME ANALYZER
              </div>
              <h1 className="mt-6 text-4xl font-bold leading-tight">
                Your personal resume coach
              </h1>
              <p className="mt-3 text-white/75">
                Login to analyze resumes, save history, and export polished reports.
              </p>
            </div>

            <div className="mb-6 flex rounded-2xl bg-white/10 p-1">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "login"
                    ? "bg-white text-slate-900"
                    : "text-white/75"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "register"
                    ? "bg-white text-slate-900"
                    : "text-white/75"
                }`}
              >
                Register
              </button>
            </div>

            {mode === "register" && (
              <input
                className="mb-4 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:border-cyan-300"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}

            <input
              className="mb-4 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:border-cyan-300"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              className="mb-4 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:border-cyan-300"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={authenticate}
              disabled={authLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 font-semibold text-slate-900 shadow-lg transition hover:scale-[1.01] disabled:opacity-60"
            >
              {authLoading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </button>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#082c66] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#1b1458]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-sm font-bold tracking-[0.35em] text-white">
            RESUME ANALYZER
          </div>

          <div className="flex items-center gap-6 text-sm text-white/80">
            <span className="hidden md:block">Products</span>
            <span className="hidden md:block">Dashboard</span>
            <button
              onClick={logout}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#140d57_0%,#27058f_45%,#5d18c9_100%)]">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[#082c66] [clip-path:ellipse(75%_100%_at_50%_100%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div className="relative z-10">
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-sm font-semibold text-cyan-100">
              AI-powered resume feedback
            </div>

            <h1 className="max-w-2xl text-5xl font-extrabold leading-tight md:text-6xl">
              Improve your resume and land better interviews
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
              Get ATS scoring, keyword matching, resume feedback, and a polished
              report in seconds. Upload a resume and compare it to your target role.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() =>
                  document.getElementById("upload-section")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="rounded-2xl bg-[#22c58b] px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:scale-[1.01]"
              >
                Get started for free
              </button>

              <button
                onClick={() =>
                  document.getElementById("results-section")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-base font-bold text-white transition hover:bg-white/15"
              >
                See preview
              </button>
            </div>
          </div>

          <div className="relative z-10">
            <DashboardMockup />
          </div>
        </div>
      </section>

      <section className="bg-[#082c66] px-6 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-4xl font-bold text-white">
            Your personal resume & LinkedIn coach
          </h2>
          <p className="mx-auto mt-6 max-w-4xl text-lg leading-8 text-white/70">
            Upload your resume, score it against recruiter expectations, find
            keyword gaps, and instantly receive actionable suggestions to improve it.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-4">
            <FeatureTab title="Instant Resume Review" active />
            <FeatureTab title="Resume Samples" />
            <FeatureTab title="Resume Targeting" />
            <FeatureTab title="LinkedIn Optimization" />
          </div>
        </div>
      </section>

      <section id="upload-section" className="bg-[#082c66] px-6 pb-20">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[36px] bg-[linear-gradient(135deg,#173f8f_0%,#0d2f72_100%)] p-8 shadow-2xl lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] bg-white/5 p-5">
            <div className="overflow-hidden rounded-[24px] bg-white shadow-2xl">
              <div className="flex items-center gap-3 bg-[#1d47a2] px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-white/70" />
                <div className="h-3 w-3 rounded-full bg-white/40" />
                <div className="h-3 w-3 rounded-full bg-white/25" />
                <div className="ml-4 text-xs font-semibold tracking-widest text-white/90">
                  RESUME PREVIEW
                </div>
              </div>

              <div className="grid gap-0 md:grid-cols-[0.32fr_0.68fr]">
                <div className="bg-[#f5f7ff] p-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#f2996a] text-3xl font-bold text-slate-700">
                      {result ? result.overall_score : 78}
                    </div>
                    <p className="mt-3 text-center text-xs font-semibold text-slate-500">
                      Overall Score
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <MiniScore label="Impact" value={result?.ats_analysis.impact_score ?? 100} />
                    <MiniScore label="Brevity" value={65} />
                    <MiniScore label="Style" value={result?.ats_analysis.grammar_score ?? 90} />
                    <MiniScore label="Skills" value={result?.ats_analysis.content_score ?? 84} />
                  </div>
                </div>

                <div className="p-5">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <div className="text-xl font-bold text-slate-800">
                      {result
                        ? `Your resume scored ${result.overall_score} out of 100`
                        : "Your resume scored 78 out of 100"}
                    </div>
                    <div className="mt-4 space-y-3">
                      <SkeletonBar />
                      <SkeletonBar />
                      <SkeletonBar short />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <ChecklistCard
                      title="Strong action verbs"
                      good
                    />
                    <ChecklistCard
                      title="Quantifying impact"
                      good={!!result && result.ats_analysis.impact_score > 70}
                    />
                    <ChecklistCard
                      title="No spelling issues"
                      good
                    />
                    <ChecklistCard
                      title="ATS-friendly structure"
                      good={!!file}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="max-w-xl">
              <div className="text-sm font-bold tracking-[0.2em] text-cyan-200">
                INSTANT RESUME REVIEW
              </div>
              <h3 className="mt-4 text-4xl font-bold leading-tight text-white">
                Get expert feedback on your resume, instantly
              </h3>
              <p className="mt-5 text-lg leading-8 text-blue-100/80">
                Score your resume on recruiter-facing criteria, upload a job description,
                and get tailored ATS feedback in seconds.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFileSelect(e.dataTransfer.files?.[0] || null);
              }}
              className={`mt-8 rounded-[28px] border-2 border-dashed p-6 transition ${
                dragActive
                  ? "border-cyan-300 bg-white/15"
                  : file
                  ? "border-cyan-300 bg-[linear-gradient(135deg,rgba(37,99,235,0.35),rgba(16,185,129,0.28))]"
                  : "border-white/20 bg-white/5"
              }`}
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${
                      file ? "bg-cyan-400 text-slate-900" : "bg-white/10 text-white"
                    }`}
                  >
                    {file ? "✓" : "📄"}
                  </div>

                  <div>
                    <div className="text-xl font-bold text-white">
                      {file ? "Resume uploaded successfully" : "Upload your resume"}
                    </div>
                    <div className="mt-1 text-sm text-blue-100/75">
                      {file
                        ? file.name
                        : "PDF or DOCX supported. Drag and drop or use the button below."}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-fit rounded-2xl px-6 py-4 text-base font-bold transition ${
                    file
                      ? "bg-cyan-400 text-slate-900 shadow-lg"
                      : "bg-[#22c58b] text-white shadow-lg"
                  }`}
                >
                  {file ? "Change uploaded file" : "Upload resume"}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-cyan-100">
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={7}
                placeholder="Paste the target job description here to compare keywords, relevance, and semantic match..."
                className="w-full rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 text-white placeholder:text-white/45 outline-none focus:border-cyan-300"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-2xl bg-[#22c58b] px-7 py-4 text-base font-bold text-white shadow-lg transition hover:scale-[1.01] disabled:opacity-60"
              >
                {loading ? "Analyzing..." : "Analyze Resume"}
              </button>

              {file && (
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-3 text-sm font-semibold text-cyan-100">
                  File ready for analysis
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#082c66] px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_0.28fr]">
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
              <h3 className="text-2xl font-bold text-white">Saved Analyses</h3>
              <p className="mt-2 text-white/65">
                Open a previous report or export it as DOCX.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {history.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/65">
                    No saved analyses yet.
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="text-lg font-semibold text-white">{item.filename}</div>
                      <div className="mt-2 text-white/65">
                        Score: {item.overall_score}/100
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => setResult(item)}
                          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900"
                        >
                          View
                        </button>
                        {item.id && (
                          <button
                            onClick={() => exportDocx(item.id!)}
                            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white"
                          >
                            Export DOCX
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[30px] bg-gradient-to-br from-cyan-400 to-blue-500 p-6 text-slate-900 shadow-xl">
              <h3 className="text-2xl font-bold">Scoring Model</h3>
              <div className="mt-5 space-y-3 text-sm font-semibold">
                <p>ATS compatibility: 25%</p>
                <p>Section completeness: 10%</p>
                <p>Content quality: 20%</p>
                <p>Impact and quantification: 15%</p>
                <p>Job-description match: 20%</p>
                <p>Grammar and consistency: 10%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="results-section" className="bg-[#082c66] px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          {result && (
            <div className="space-y-6">
              <div className="rounded-[32px] bg-white p-6 text-slate-900 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <div className="mb-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Analysis complete
                    </div>
                    <h2 className="text-3xl font-bold">{result.filename}</h2>
                    <p className="mt-2 text-slate-600">
                      Your full ATS and recruiter-readability breakdown.
                    </p>
                  </div>

                  <div className="rounded-[28px] bg-gradient-to-r from-[#1d47a2] to-[#1b1458] px-8 py-5 text-white">
                    <div className="text-sm uppercase tracking-wide text-white/80">
                      Overall Score
                    </div>
                    <div className="mt-1 text-4xl font-extrabold">
                      {result.overall_score}/100
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <ScoreCard title="ATS Score" value={result.ats_analysis.ats_score} color="orange" />
                <ScoreCard title="Content Score" value={result.ats_analysis.content_score} color="purple" />
                <ScoreCard title="Impact Score" value={result.ats_analysis.impact_score} color="green" />
                <ScoreCard title="Grammar Score" value={result.ats_analysis.grammar_score} color="blue" />
              </div>

              {result.jd_match && (
                <div className="rounded-[32px] bg-white p-6 text-slate-900 shadow-2xl">
                  <h3 className="text-2xl font-bold">Job Match Insights</h3>

                  <div className="mt-5 grid gap-5 md:grid-cols-3">
                    <MetricBox label="Match Score" value={`${result.jd_match.match_score}/100`} />
                    <MetricBox label="Semantic Similarity" value={String(result.jd_match.semantic_similarity)} />
                    <MetricBox label="Matched Keywords" value={String(result.jd_match.matched_keywords.length)} />
                  </div>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <TagBox title="Matched Keywords" items={result.jd_match.matched_keywords} />
                    <TagBox title="Missing Keywords" items={result.jd_match.missing_keywords} />
                  </div>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <ResultList title="Strengths" items={result.ats_analysis.strengths} tone="green" />
                <ResultList title="Issues Found" items={result.ats_analysis.issues} tone="red" />
              </div>

              <ResultList title="Recommended Fixes" items={result.suggestions} tone="blue" />

              {result.rewritten_summary && (
                <div className="rounded-[32px] bg-gradient-to-r from-[#1d47a2] to-[#5b21b6] p-6 text-white shadow-2xl">
                  <h3 className="text-2xl font-bold">Suggested Summary Rewrite</h3>
                  <p className="mt-4 text-white/90 leading-8">{result.rewritten_summary}</p>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard title="Summary" content={result.parsed_sections.summary} />
                <SectionCard title="Skills" content={result.parsed_sections.skills} />
                <SectionCard title="Experience" content={result.parsed_sections.experience} />
                <SectionCard title="Education" content={result.parsed_sections.education} />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function DashboardMockup() {
  return (
    <div className="relative mx-auto max-w-[720px]">
      <div className="rounded-[28px] bg-[#17195d] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="grid min-h-[500px] grid-cols-[0.25fr_0.75fr] overflow-hidden rounded-[24px] bg-white">
          <div className="bg-[#18145d] p-5 text-white">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-4 w-20 rounded-full bg-white/25" />
              <div className="h-4 w-4 rounded-full bg-white/25" />
            </div>

            <SidebarItem title="Impact" />
            <SidebarItem title="Brevity" />
            <SidebarItem title="Style" />
            <SidebarItem title="Skills" />
          </div>

          <div className="bg-[#f5f7ff] p-5">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="grid gap-5 md:grid-cols-[0.3fr_0.7fr]">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#e28c61] text-4xl font-bold text-slate-700">
                    78
                  </div>
                  <div className="mt-2 text-sm text-slate-500">Overall Score</div>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="text-2xl font-bold text-slate-700">
                    Your resume scored 78 out of 100.
                  </div>
                  <div className="mt-4 space-y-3">
                    <SkeletonBar />
                    <SkeletonBar />
                    <SkeletonBar short />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 text-sm font-bold tracking-widest text-[#1b1458]">
              BREAKDOWN
            </div>

            <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <BreakdownCell title="IMPACT" score="100" tag="EXCELLENT" tagColor="green" />
              <BreakdownCell title="BREVITY" score="65" tag="AVERAGE" tagColor="orange" />
              <BreakdownCell title="STYLE" score="90" tag="VERY GOOD" tagColor="green" />
              <BreakdownCell title="SKILLS" score="78" tag="GOOD" tagColor="green" />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[0.28fr_0.72fr]">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#55d4c4] text-3xl font-bold text-slate-700">
                  100
                </div>
                <div className="mt-2 text-center text-sm text-slate-500">Impact Score</div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                  <CheckItem text="Quantifying impact" />
                  <CheckItem text="Unique action verbs" />
                  <CheckItem text="Strong action verbs" />
                  <CheckItem text="Accomplishment-oriented" />
                  <CheckItem text="No spelling errors" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -right-10 top-8 hidden h-44 w-24 rounded-md bg-white/85 shadow-2xl lg:block" />
      </div>
    </div>
  );
}

function SidebarItem({ title }: { title: string }) {
  return (
    <div className="mb-10">
      <div className="mb-4 text-sm font-bold uppercase tracking-widest text-white/80">
        {title}
      </div>
      <div className="space-y-3">
        <div className="h-3 rounded-full bg-white/18" />
        <div className="h-3 w-4/5 rounded-full bg-white/18" />
        <div className="h-3 w-3/4 rounded-full bg-white/18" />
        <div className="h-3 w-2/3 rounded-full bg-white/18" />
      </div>
    </div>
  );
}

function BreakdownCell({
  title,
  score,
  tag,
  tagColor,
}: {
  title: string;
  score: string;
  tag: string;
  tagColor: "green" | "orange";
}) {
  return (
    <div className="border-r border-slate-200 p-4 last:border-r-0">
      <div className="text-xs font-bold tracking-widest text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-bold text-[#4c3cff]">{score}<span className="text-sm text-slate-400">/100</span></div>
      <div
        className={`mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
          tagColor === "green"
            ? "bg-green-100 text-green-700"
            : "bg-orange-100 text-orange-700"
        }`}
      >
        {tag}
      </div>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-lg font-bold text-emerald-500">✓</div>
      <div className="text-sm font-semibold text-slate-700">{text}</div>
    </div>
  );
}

function SkeletonBar({ short = false }: { short?: boolean }) {
  return (
    <div
      className={`h-3 rounded-full bg-slate-200 ${short ? "w-2/3" : "w-full"}`}
    />
  );
}

function FeatureTab({ title, active = false }: { title: string; active?: boolean }) {
  return (
    <div
      className={`rounded-t-2xl px-6 py-8 text-center text-lg font-bold ${
        active
          ? "bg-[#1d47a2] text-white"
          : "bg-transparent text-white/70"
      }`}
    >
      {title}
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="text-xs font-bold tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}/100</div>
    </div>
  );
}

function ChecklistCard({ title, good }: { title: string; good: boolean }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
            good ? "bg-emerald-400 text-slate-900" : "bg-white/15 text-white"
          }`}
        >
          {good ? "✓" : "•"}
        </div>
        <div className="font-semibold text-white">{title}</div>
      </div>
    </div>
  );
}

function ScoreCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: "orange" | "purple" | "green" | "blue";
}) {
  const map = {
    orange: "from-orange-400 to-orange-500",
    purple: "from-violet-500 to-fuchsia-500",
    green: "from-emerald-400 to-teal-500",
    blue: "from-cyan-400 to-blue-500",
  };

  return (
    <div className="rounded-[30px] bg-white p-6 text-slate-900 shadow-2xl">
      <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white ${map[color]}`}>
        {title}
      </div>
      <div className="mt-5 text-4xl font-extrabold">{value}/100</div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function TagBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[28px] bg-slate-50 p-5">
      <h4 className="text-lg font-bold text-slate-900">{title}</h4>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-slate-500">None</span>
        ) : (
          items.map((item, index) => (
            <span
              key={index}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
            >
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function ResultList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "green" | "red" | "blue";
}) {
  const styles = {
    green: "from-emerald-50 to-green-50",
    red: "from-rose-50 to-red-50",
    blue: "from-cyan-50 to-blue-50",
  };

  return (
    <div className={`rounded-[32px] bg-gradient-to-br ${styles[tone]} p-6 text-slate-900 shadow-2xl`}>
      <h3 className="text-2xl font-bold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-slate-500">No items found.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item, index) => (
            <li
              key={index}
              className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-slate-700 shadow-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-[32px] bg-white p-6 text-slate-900 shadow-2xl">
      <h3 className="text-2xl font-bold">{title}</h3>
      <pre className="mt-4 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        {content || "Not detected."}
      </pre>
    </div>
  );
}