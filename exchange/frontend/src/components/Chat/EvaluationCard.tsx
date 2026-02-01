/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React from "react"
import { RiRobot2Fill } from "react-icons/ri"
import { Evaluation } from "@/types/Message"

const ASPECT_AGENT_LABELS: Record<string, string> = {
  relevance: "Relevance Agent",
  depth: "Depth Agent",
  clarity: "Clarity Agent",
  structure: "Structure Agent",
  professionalism: "Professionalism Agent",
}

interface EvaluationCardProps {
  evaluation: Evaluation
}

const EvaluationCard: React.FC<EvaluationCardProps> = ({ evaluation }) => {
  const { aspect_scores, aspect_comments, final_score } = evaluation
  const aspectKeys = Object.keys(aspect_scores).length
    ? Object.keys(aspect_scores)
    : ["relevance", "depth", "clarity", "structure", "professionalism"]
  const displayFinalScore = Number.isFinite(final_score) ? final_score : 0

  const hasComments = aspectKeys.some((k) => aspect_comments?.[k]?.trim())

  return (
    <div className="mb-3 rounded-lg border border-[rgb(220,220,220)] bg-white p-3 text-sm">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[rgb(100,100,100)]">
        5 Aspect Evaluator Agents → Final Evaluator
      </div>
      <div className="mb-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
        {aspectKeys.map((key) => {
          const rawScore = aspect_scores[key] ?? 0
          const score = Number.isFinite(rawScore) ? rawScore : 0
          const agentLabel = ASPECT_AGENT_LABELS[key] ?? `${key} Agent`
          return (
            <div
              key={key}
              className="flex flex-col gap-1 rounded-md border border-[rgb(235,235,235)] bg-[rgb(250,250,250)] p-2"
              role="article"
              aria-label={`${agentLabel} score ${score}`}
            >
              <div className="flex items-center gap-1.5">
                <RiRobot2Fill className="h-3.5 w-3.5 shrink-0 text-[#049FD9]" aria-hidden />
                <span className="truncate text-xs font-medium text-[rgb(60,60,60)]">
                  {agentLabel}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="font-semibold tabular-nums text-[#049FD9]">
                  {score.toFixed(1)}
                </span>
                <span className="text-xs text-[rgb(120,120,120)]">/ 5</span>
              </div>
              <div
                className="h-1 w-full overflow-hidden rounded-full bg-[rgb(235,235,235)]"
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={5}
              >
                <div
                  className="h-full rounded-full bg-[#049FD9]"
                  style={{ width: `${(score / 5) * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-[#049FD9]/40 bg-[rgb(248,252,254)] px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <RiRobot2Fill className="h-4 w-4 shrink-0 text-[#049FD9]" aria-hidden />
          <span className="text-xs font-semibold text-[rgb(60,60,60)]">
            Final Evaluator Agent
          </span>
        </div>
        <span className="font-semibold tabular-nums text-[#049FD9]">
          Overall: {displayFinalScore.toFixed(1)} / 5
        </span>
      </div>
      {hasComments ? (
        <div className="rounded-md border border-[rgb(235,235,235)] bg-[rgb(250,250,250)] p-2">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[rgb(100,100,100)]">
            Detailed feedback by aspect
          </div>
          <ul className="list-none space-y-1.5 text-xs text-[rgb(60,60,60)]">
            {aspectKeys.map((key) => {
              const comment = aspect_comments?.[key]?.trim()
              const agentLabel = ASPECT_AGENT_LABELS[key] ?? `${key} Agent`
              if (!comment) return null
              return (
                <li key={key} className="flex flex-col gap-0.5">
                  <span className="font-medium text-[rgb(80,80,80)]">{agentLabel}:</span>
                  <span className="leading-relaxed">{comment}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default React.memo(EvaluationCard)
