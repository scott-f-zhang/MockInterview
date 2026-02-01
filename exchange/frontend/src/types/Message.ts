/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

export interface Evaluation {
  aspect_scores: Record<string, number>
  aspect_comments?: Record<string, string>
  final_score: number
  feedback: string
}

export interface Message {
  role: "assistant" | "user"
  content: string
  id: string
  animate: boolean
  evaluation?: Evaluation
}
