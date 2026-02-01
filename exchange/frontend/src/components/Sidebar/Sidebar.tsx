/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React, { useState } from "react"
import { Evaluation, Session } from "@/types/Message"

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
  onNewSession?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  resume,
  setResume,
  jobDescription,
  setJobDescription,
  latestEvaluation,
  sessions = [],
  onLoadSession,
  onNewSession,
}) => {
  const [contextOpen, setContextOpen] = useState<boolean>(false)
  const [scoreOpen, setScoreOpen] = useState<boolean>(true)
  const [historyOpen, setHistoryOpen] = useState<boolean>(true)

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
            <span>New Session</span>
            <span className="text-xs opacity-80">新对话</span>
          </button>
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
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => onLoadSession?.(session)}
                      className="flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left text-xs text-sidebar-text transition-colors hover:bg-sidebar-item-selected"
                    >
                      <span className="line-clamp-2 w-full break-words font-medium">
                        {session.title}
                      </span>
                      <span className="text-sidebar-text/70">
                        {formatSessionDate(session.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col">
          <div className="flex min-h-[36px] w-full items-center gap-2 rounded p-2">
            <span className="flex-1 text-sm font-normal leading-5 tracking-wide text-sidebar-text">
              Conversation: Mock Interview
            </span>
          </div>

          <div className="mt-1 rounded bg-sidebar-item-selected">
            <div className="flex min-h-[36px] w-full items-center gap-2 rounded bg-sidebar-item-selected p-2 pl-6">
              <span className="flex-1 text-sm font-normal leading-5 tracking-wide text-sidebar-text">
                Agent to Agent
              </span>
            </div>
          </div>
        </div>

        {latestEvaluation != null && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setScoreOpen(!scoreOpen)}
              className="flex min-h-[36px] w-full items-center gap-2 rounded p-2 text-left text-sm font-normal tracking-wide text-sidebar-text hover:bg-sidebar-item-selected"
            >
              <span className="text-base leading-none">🌟</span>
              <span className="flex-1">Latest Score</span>
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
                Resume (optional)
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="Paste your resume. The interview will be tailored to your background."
                  rows={4}
                  className="w-full resize-y rounded border border-nav-border bg-chat-input-background px-2 py-1.5 text-sm text-chat-text placeholder:text-chat-text placeholder:opacity-60"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-sidebar-text">
                Job description (optional)
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description. Questions will align with the role."
                  rows={4}
                  className="w-full resize-y rounded border border-nav-border bg-chat-input-background px-2 py-1.5 text-sm text-chat-text placeholder:text-chat-text placeholder:opacity-60"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
