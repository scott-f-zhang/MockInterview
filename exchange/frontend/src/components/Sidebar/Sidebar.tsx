/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React, { useRef, useState } from "react"
import { Trash2, Upload } from "lucide-react"
import { Evaluation, Report, Session } from "@/types/Message"
import { uploadAndExtractDocument } from "@/hooks/useAgentAPI"

const ASPECT_LABELS: Record<string, string> = {
  relevance: "Relevance",
  depth: "Depth",
  clarity: "Clarity",
  structure: "Structure",
  professionalism: "Professionalism",
}

const ASPECT_ORDER = ["relevance", "depth", "clarity", "structure", "professionalism"]

function normalizeScore(score: unknown): number {
  if (typeof score === "number" && Number.isFinite(score)) return score
  const n = Number(score)
  return Number.isFinite(n) ? n : 0
}

function StarRow({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.max(0, Math.min(1, score / max))
  return (
    <div
      className="relative inline-flex items-center"
      aria-label={`${score} out of ${max} stars`}
    >
      <span
        className="whitespace-nowrap text-sidebar-text/30"
        style={{ letterSpacing: "0.15em" }}
      >
        ★★★★★
      </span>
      <span
        className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-amber-400"
        style={{ width: `${pct * 100}%`, letterSpacing: "0.15em" }}
      >
        ★★★★★
      </span>
    </div>
  )
}

function formatSessionDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface SidebarProps {
  resume: string
  setResume: (value: string) => void
  jobDescription: string
  setJobDescription: (value: string) => void
  latestEvaluation?: Evaluation | null
  sessions?: Session[]
  onLoadSession?: (session: Session) => void
  onDeleteSession?: (session: Session) => void
  onNewSession?: () => void
  reports?: Report[]
  onOpenReport?: (report: Report) => void
  onDeleteReport?: (report: Report) => void
  mode?: "free" | "timed" | "simulation"
  onModeChange?: (mode: "free" | "timed" | "simulation") => void
  timedDurationMinutes?: number
  onTimedDurationChange?: (minutes: number) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  resume,
  setResume,
  jobDescription,
  setJobDescription,
  latestEvaluation,
  sessions = [],
  onLoadSession,
  onDeleteSession,
  onNewSession,
  reports = [],
  onOpenReport,
  onDeleteReport,
  mode = "free",
  onModeChange,
  timedDurationMinutes = 10,
  onTimedDurationChange,
}) => {
  const [contextOpen, setContextOpen] = useState<boolean>(true)
  const [scoreOpen, setScoreOpen] = useState<boolean>(true)
  const [historyOpen, setHistoryOpen] = useState<boolean>(true)
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(null)
  const [jdUploadError, setJdUploadError] = useState<string | null>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const jdInputRef = useRef<HTMLInputElement>(null)

  const handleResumeFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setResumeUploadError(null)
    try {
      const { text } = await uploadAndExtractDocument(file)
      setResume(text)
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Upload failed")
          : "Upload failed"
      setResumeUploadError(message)
    }
  }

  const handleJdFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setJdUploadError(null)
    try {
      const { text } = await uploadAndExtractDocument(file)
      setJobDescription(text)
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Upload failed")
          : "Upload failed"
      setJdUploadError(message)
    }
  }

  const finalScore = latestEvaluation
    ? normalizeScore(latestEvaluation.final_score)
    : null
  const aspectScores = latestEvaluation?.aspect_scores
    ? ASPECT_ORDER.map((key) => ({
        key,
        label: ASPECT_LABELS[key] ?? key,
        score: normalizeScore(latestEvaluation.aspect_scores[key]),
      }))
    : []

  return (
    <div className="flex h-full w-64 flex-none flex-col border-r border-sidebar-border bg-sidebar-background font-inter lg:w-[320px]">
      <div className="flex h-full flex-1 flex-col gap-5 overflow-y-auto p-4">
        {onNewSession && (
          <button
            type="button"
            onClick={onNewSession}
            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-item-selected px-3 py-2 text-sm font-medium text-sidebar-text transition-colors hover:bg-sidebar-border/50"
          >
            <span aria-hidden>✨</span>
            <span>New Chat</span>
          </button>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setContextOpen(!contextOpen)}
            className="flex min-h-[36px] w-full items-center gap-2 rounded p-2 text-left text-sm font-normal tracking-wide text-sidebar-text hover:bg-sidebar-item-selected"
          >
            <span className="flex-1">Context (resume + JD)</span>
            <span className="text-xs opacity-70">{contextOpen ? "▼" : "▶"}</span>
          </button>
          {contextOpen && (
            <div className="flex flex-col gap-3 rounded border border-sidebar-border bg-sidebar-background p-2">
              <label className="flex flex-col gap-1 text-xs text-sidebar-text">
                Resume
                <div className="flex items-center gap-2">
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    aria-hidden
                    onChange={handleResumeFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => resumeInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded border border-sidebar-border bg-sidebar-background px-2 py-1.5 text-xs text-sidebar-text transition-colors hover:bg-sidebar-item-selected"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload PDF/DOCX
                  </button>
                </div>
                {resumeUploadError && (
                  <span className="text-xs text-red-400">{resumeUploadError}</span>
                )}
                <textarea
                  value={resume}
                  onChange={(e) => {
                    setResume(e.target.value)
                    setResumeUploadError(null)
                  }}
                  placeholder="Paste your resume. The interview will be tailored to your background."
                  rows={4}
                  className="w-full resize-y rounded border border-nav-border bg-chat-input-background px-2 py-1.5 text-sm text-chat-text placeholder:text-chat-text placeholder:opacity-60"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-sidebar-text">
                Job description (optional)
                <div className="flex items-center gap-2">
                  <input
                    ref={jdInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    aria-hidden
                    onChange={handleJdFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => jdInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded border border-sidebar-border bg-sidebar-background px-2 py-1.5 text-xs text-sidebar-text transition-colors hover:bg-sidebar-item-selected"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload PDF/DOCX
                  </button>
                </div>
                {jdUploadError && (
                  <span className="text-xs text-red-400">{jdUploadError}</span>
                )}
                <textarea
                  value={jobDescription}
                  onChange={(e) => {
                    setJobDescription(e.target.value)
                    setJdUploadError(null)
                  }}
                  placeholder="Paste the job description. Questions will align with the role."
                  rows={4}
                  className="w-full resize-y rounded border border-nav-border bg-chat-input-background px-2 py-1.5 text-sm text-chat-text placeholder:text-chat-text placeholder:opacity-60"
                />
              </label>
            </div>
          )}
        </div>

        {onModeChange && (
          <div className="flex flex-col gap-2">
            <span className="rounded p-2 text-left text-sm font-medium text-sidebar-text">
              Mode
            </span>
            <div className="flex flex-col gap-1 rounded border border-sidebar-border bg-sidebar-background p-2">
              {(["free", "timed", "simulation"] as const).map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-sidebar-text hover:bg-sidebar-item-selected"
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === m}
                    onChange={() => onModeChange(m)}
                    className="h-3.5 w-3.5"
                  />
                  <span>
                    {m === "free"
                      ? "Free"
                      : m === "timed"
                        ? "Timed"
                        : "Simulation"}
                  </span>
                </label>
              ))}
              {mode === "timed" && onTimedDurationChange && (
                <div className="mt-2 flex items-center gap-2 border-t border-sidebar-border pt-2">
                  <span className="text-xs text-sidebar-text">Duration (min)</span>
                  <select
                    value={timedDurationMinutes}
                    onChange={(e) =>
                      onTimedDurationChange(Number(e.target.value))
                    }
                    className="rounded border border-sidebar-border bg-chat-input-background px-2 py-1 text-xs text-chat-text"
                  >
                    {[5, 10, 15].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex min-h-[36px] w-full items-center gap-2 rounded p-2 text-left text-sm font-normal tracking-wide text-sidebar-text hover:bg-sidebar-item-selected"
            >
              <span className="flex-1">History</span>
              <span className="text-xs opacity-70">{historyOpen ? "▼" : "▶"}</span>
            </button>
            {historyOpen && (
              <ul className="flex max-h-[200px] flex-col gap-0.5 overflow-y-auto rounded border border-sidebar-border bg-sidebar-background p-1">
                {sessions.map((session) => (
                  <li key={session.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onLoadSession?.(session)}
                      className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left text-xs text-sidebar-text transition-colors hover:bg-sidebar-item-selected"
                    >
                      <span className="line-clamp-2 w-full break-words font-medium">
                        {session.title}
                      </span>
                      <span className="text-sidebar-text/70">
                        {formatSessionDate(session.createdAt)}
                      </span>
                    </button>
                    {onDeleteSession && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteSession(session)
                        }}
                        className="shrink-0 rounded p-1 text-sidebar-text/70 transition-colors hover:bg-sidebar-item-selected hover:text-sidebar-text"
                        aria-label="Delete history"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {latestEvaluation != null && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setScoreOpen(!scoreOpen)}
              className="flex min-h-[36px] w-full items-center gap-2 rounded p-2 text-left text-sm font-normal tracking-wide text-sidebar-text hover:bg-sidebar-item-selected"
            >
              <span className="text-base leading-none">🌟</span>
              <span className="flex-1">Overall Score</span>
              <span className="text-xs opacity-70">{scoreOpen ? "▼" : "▶"}</span>
            </button>
            {scoreOpen && (
              <div className="rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent p-3 shadow-inner">
                <div className="mb-3 flex flex-col items-center gap-1">
                  <span className="text-3xl font-bold tabular-nums text-amber-400">
                    {finalScore != null ? finalScore.toFixed(1) : "—"}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-sidebar-text/80">
                    out of 5
                  </span>
                  <div className="mt-1 scale-110">
                    <StarRow score={finalScore ?? 0} />
                  </div>
                </div>
                {aspectScores.length > 0 && (
                  <div className="space-y-2 border-t border-sidebar-border/50 pt-3">
                    {aspectScores.map(({ key, label, score }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-sidebar-text/90">
                          {label}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="w-6 text-right text-xs font-medium tabular-nums text-amber-400/90">
                            {score.toFixed(1)}
                          </span>
                          <StarRow score={score} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {reports.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="flex min-h-[36px] w-full items-center gap-2 rounded p-2 text-left text-sm font-normal tracking-wide text-sidebar-text hover:bg-sidebar-item-selected"
            >
              <span className="flex-1">Reports</span>
            </button>
            <ul className="flex max-h-[200px] flex-col gap-0.5 overflow-y-auto rounded border border-sidebar-border bg-sidebar-background p-1">
              {reports.map((report) => (
                <li key={report.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenReport?.(report)}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left text-xs text-sidebar-text transition-colors hover:bg-sidebar-item-selected"
                  >
                    <span className="line-clamp-2 w-full break-words font-medium">
                      {report.title}
                    </span>
                    <span className="text-sidebar-text/70">
                      {formatSessionDate(report.createdAt)}
                    </span>
                  </button>
                  {onDeleteReport && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteReport(report)
                      }}
                      className="shrink-0 rounded p-1 text-sidebar-text/70 transition-colors hover:bg-sidebar-item-selected hover:text-sidebar-text"
                      aria-label="Delete report"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
