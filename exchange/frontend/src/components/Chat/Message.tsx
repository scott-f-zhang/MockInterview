/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React, { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { HiUser } from "react-icons/hi"
import { RiRobot2Fill } from "react-icons/ri"
import { Waveform } from "ldrs/react"
import "ldrs/react/Waveform.css"
import { Evaluation } from "@/types/Message"
import EvaluationCard from "./EvaluationCard"

/** Normalize API evaluation so final_score and aspect_scores are always numbers (handles string from JSON). */
function normalizeEvaluation(raw: unknown): Evaluation | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const aspect_scores = o.aspect_scores
  if (!aspect_scores || typeof aspect_scores !== "object") return null
  const scores: Record<string, number> = {}
  for (const [k, v] of Object.entries(aspect_scores)) {
    const n = typeof v === "number" ? v : Number(v)
    if (Number.isFinite(n)) scores[k] = n
  }
  if (Object.keys(scores).length === 0) return null
  const final_score =
    typeof o.final_score === "number"
      ? o.final_score
      : Number(o.final_score)
  const normalized: Evaluation = {
    aspect_scores: scores,
    final_score: Number.isFinite(final_score) ? final_score : 0,
    feedback: typeof o.feedback === "string" ? o.feedback : "",
  }
  if (typeof o.aspect_comments === "object" && o.aspect_comments !== null) {
    const comments: Record<string, string> = {}
    for (const [k, v] of Object.entries(o.aspect_comments)) {
      if (typeof v === "string") comments[k] = v
    }
    normalized.aspect_comments = comments
  }
  return normalized
}

interface SlowTextProps {
  text: string
  speed?: number
}

const SlowText: React.FC<SlowTextProps> = ({ text, speed = 25 }) => {
  const [displayedText, setDisplayedText] = useState<string>("")
  const idx = useRef<number>(-1)

  useEffect(() => {
    function tick(): void {
      idx.current++
      setDisplayedText((prev: string) => prev + text[idx.current])
    }

    if (idx.current < text.length - 1) {
      const addChar = setInterval(tick, speed)
      return () => clearInterval(addChar)
    }
  }, [displayedText, speed, text])

  return (
    <div className="chat-markdown">
      <ReactMarkdown>{displayedText}</ReactMarkdown>
    </div>
  )
}

interface MessageProps {
  content: string
  aiMessage: boolean
  animate: boolean
  loading: boolean
  evaluation?: Evaluation
}

const Message: React.FC<MessageProps> = ({
  content,
  aiMessage,
  animate,
  loading,
  evaluation,
}) => {
  return (
    <div
      className={`flex w-full items-start gap-2 px-4 py-6 sm:px-8 md:px-16 md:py-[30px] lg:px-[120px] ${aiMessage ? "bg-[rgb(247,247,248)]" : ""}`}
    >
      <div className="flex h-[35px] w-[35px] flex-shrink-0 items-center justify-center">
        {aiMessage ? <RiRobot2Fill color="#049FD9" /> : <HiUser />}
      </div>
      <div className="ml-2 min-w-0 flex-1 break-words">
        {aiMessage && (() => {
          const normalized = evaluation ? normalizeEvaluation(evaluation) : null
          return normalized ? <EvaluationCard evaluation={normalized} /> : null
        })()}
        {loading ? (
          <div style={{ opacity: 0.5 }}>
            <Waveform size="20" stroke="3.5" speed="1" color="#049FD9" />
          </div>
        ) : animate ? (
          <SlowText speed={20} text={content} />
        ) : (
          <div className="chat-markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(Message)
