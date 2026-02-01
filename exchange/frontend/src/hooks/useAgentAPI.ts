/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React, { useState } from "react"
import axios from "axios"
import { v4 as uuid } from "uuid"
import { Role } from "@/utils/const"
import { Message, Evaluation } from "@/types/Message"

const DEFAULT_EXCHANGE_APP_API_URL = "http://127.0.0.1:8000"
const EXCHANGE_APP_API_URL =
  import.meta.env["VITE_EXCHANGE_APP_API_URL"] || DEFAULT_EXCHANGE_APP_API_URL

interface ApiResponse {
  response: string
  evaluation?: Evaluation
}

interface ConversationTurn {
  role: string
  content: string
}

interface SendMessageCallbacks {
  conversationHistory?: ConversationTurn[]
  resume?: string
  job_description?: string
  onStart?: () => void
  onSuccess?: (response: string) => void
  onError?: (error: any) => void
}

interface UseAgentAPIReturn {
  loading: boolean
  sendMessage: (prompt: string, conversationHistory?: ConversationTurn[]) => Promise<string>
  sendMessageWithCallback: (
    prompt: string,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    callbacks?: SendMessageCallbacks,
  ) => Promise<void>
}

export const useAgentAPI = (): UseAgentAPIReturn => {
  const [loading, setLoading] = useState<boolean>(false)

  const sendMessage = async (
    prompt: string,
    conversationHistory?: ConversationTurn[],
    resume?: string,
    job_description?: string,
  ): Promise<string> => {
    if (!prompt.trim()) {
      throw new Error("Prompt cannot be empty")
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        prompt,
        conversation_history: conversationHistory ?? [],
      }
      if (resume?.trim()) body.resume = resume.trim()
      if (job_description?.trim()) body.job_description = job_description.trim()
      const response = await axios.post<ApiResponse>(
        `${EXCHANGE_APP_API_URL}/agent/prompt`,
        body,
      )
      return response.data.response
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const sendMessageWithCallback = async (
    prompt: string,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    callbacks?: SendMessageCallbacks,
  ): Promise<void> => {
    if (!prompt.trim()) return

    const userMessage: Message = {
      role: Role.USER,
      content: prompt,
      id: uuid(),
      animate: false,
    }

    const loadingMessage: Message = {
      role: "assistant",
      content: "...",
      id: uuid(),
      animate: true,
    }

    setMessages((prevMessages: Message[]) => [
      ...prevMessages,
      userMessage,
      loadingMessage,
    ])
    setLoading(true)

    if (callbacks?.onStart) {
      callbacks.onStart()
    }

    const conversationHistory = callbacks?.conversationHistory?.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const body: Record<string, unknown> = {
      prompt,
      conversation_history: conversationHistory ?? [],
    }
    if (callbacks?.resume?.trim()) body.resume = callbacks.resume.trim()
    if (callbacks?.job_description?.trim()) body.job_description = callbacks.job_description.trim()

    try {
      const response = await axios.post<ApiResponse>(
        `${EXCHANGE_APP_API_URL}/agent/prompt`,
        body,
      )

      setMessages((prevMessages: Message[]) => {
        const updatedMessages = [...prevMessages]
        updatedMessages[updatedMessages.length - 1] = {
          role: "assistant",
          content: response.data.response,
          id: uuid(),
          animate: true,
          evaluation: response.data.evaluation,
        }
        return updatedMessages
      })

      if (callbacks?.onSuccess) {
        callbacks.onSuccess(response.data.response)
      }
    } catch (error) {
      setMessages((prevMessages: Message[]) => {
        const updatedMessages = [...prevMessages]
        updatedMessages[updatedMessages.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error.",
          id: uuid(),
          animate: false,
        }
        return updatedMessages
      })

      if (callbacks?.onError) {
        callbacks.onError(error)
      }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    sendMessage,
    sendMessageWithCallback,
  }
}
