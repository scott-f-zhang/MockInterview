/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React from "react"
import { Evaluation } from "@/types/Message"

const ASPECT_LABELS: Record<string, string> = {
  relevance: "Relevance",
  depth: "Depth",
  clarity: "Clarity",
  structure: "Structure",
  professionalism: "Professionalism",
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

  return (
    <div className="mb-3 rounded-lg border border-[rgb(220,220,220)] bg-white p-3 text-sm">
      <div className="mb-2 font-semibold text-[rgb(60,60,60)]">
        Overall: {displayFinalScore.toFixed(1)} / 5
      </div>
      <div className="space-y-1.5">
        {aspectKeys.map((key) => {
          const rawScore = aspect_scores[key] ?? 0
          const score = Number.isFinite(rawScore) ? rawScore : 0
          const label = ASPECT_LABELS[key] ?? key
          const comment = aspect_comments?.[key]
          return (
            <div key={key} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[rgb(80,80,80)]">{label}</span>
                <span className="font-medium tabular-nums">{score.toFixed(1)}</span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(235,235,235)]"
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
              {comment ? (
                <p className="text-xs text-[rgb(100,100,100)]">{comment}</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default React.memo(EvaluationCard)
