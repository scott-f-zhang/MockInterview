/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React, { useState, useEffect } from "react"
import { LOCAL_STORAGE_KEY } from "@/components/Chat/Messages"

import ChatArea from "@/components/Chat/ChatArea"

import Navigation from "@/components/Navigation/Navigation"
import MainArea from "@/components/MainArea/MainArea"
import Sidebar from "@/components/Sidebar/Sidebar"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { Message, Evaluation, Session } from "./types/Message"

const SESSIONS_STORAGE_KEY = "mock_interview_sessions"
const MAX_SESSIONS = 50

function sessionTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user")
  if (firstUser?.content) {
    const text = firstUser.content.replace(/\s+/g, " ").trim()
    return text.length > 36 ? `${text.slice(0, 36)}…` : text
  }
  return "Mock Interview"
}
import { useAgentAPI } from "@/hooks/useAgentAPI"
import { useChatAreaMeasurement } from "@/hooks/useChatAreaMeasurement"
import { logger } from "./utils/logger"
import {parseApiError} from "@/utils/const.ts";

const App: React.FC = () => {
  const [aiReplied, setAiReplied] = useState<boolean>(false)
  const [buttonClicked, setButtonClicked] = useState<boolean>(false)
  const [currentUserMessage, setCurrentUserMessage] = useState<string>("")
  const [agentResponse, setAgentResponse] = useState<string>("")
  const [isAgentLoading, setIsAgentLoading] = useState<boolean>(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [resume, setResume] = useState<string>("")
  const [jobDescription, setJobDescription] = useState<string>("")
  const { sendMessageWithCallback } = useAgentAPI()

  const {
    height: chatHeight,
    isExpanded,
    chatRef,
  } = useChatAreaMeasurement({
    debounceMs: 100,
  })

  useEffect(() => {
    const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages))
      } catch {
        // ignore invalid stored messages
      }
    }
    const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY)
    if (storedSessions) {
      try {
        setSessions(JSON.parse(storedSessions))
      } catch {
        // ignore invalid stored sessions
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  const latestEvaluation: Evaluation | null = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === "assistant" && msg.evaluation) return msg.evaluation
    }
    return null
  })()

  const chatHeightValue = currentUserMessage || agentResponse ? chatHeight : 76

  const handleApiResponse = (response: string, isError: boolean = false) => {
    setAgentResponse(response)
    setIsAgentLoading(false)

    setMessages((prev) => {
      const updated = [...prev]
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: response,
        animate: !isError,
      }
      return updated
    })
  }

  const handleUserInput = (query: string) => {
    setCurrentUserMessage(query)
    setIsAgentLoading(true)
  }

  const handleDropdownSelect = async (query: string) => {
      setCurrentUserMessage(query)
      setIsAgentLoading(true)

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      try {
        await sendMessageWithCallback(query, setMessages, {
          conversationHistory,
          resume: resume || undefined,
          job_description: jobDescription || undefined,
          onStart: () => {
            setButtonClicked(true)
          },

          onSuccess: (response) => {
            setAiReplied(true)
            handleApiResponse(response, false)
          },

          onError: (error) => {
            if (import.meta.env.DEV) {
              logger.apiError("/agent/prompt", error)
            }

            const { status, message } = parseApiError(error)

            // 4xx errors
            if (status && status >= 400 && status < 500) {
              handleApiResponse(
                  `HTTP ${status} - ${message}` ||
                  "Sorry, I encountered an error. Please try again later",
                  true
              )
              return
            }

            // all other errors
            handleApiResponse(message, true)
            return
          },
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          logger.apiError("/agent/prompt", error)
        }

        handleApiResponse(
          "Sorry, I encountered an error. Please try again later.",
          true
        )
      }
    }

  const handleClearConversation = () => {
    if (messages.length > 0) {
      const newSession: Session = {
        id: `session_${Date.now()}`,
        title: sessionTitle(messages),
        createdAt: Date.now(),
        messages: [...messages],
      }
      setSessions((prev) => [newSession, ...prev].slice(0, MAX_SESSIONS))
    }
    setMessages([])
    setCurrentUserMessage("")
    setAgentResponse("")
    setIsAgentLoading(false)
    setButtonClicked(false)
    setAiReplied(false)
  }

  const handleLoadSession = (session: Session) => {
    setMessages(session.messages)
    setCurrentUserMessage("")
    setAgentResponse("")
    setIsAgentLoading(false)
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-app-background">
        <Navigation />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            resume={resume}
            setResume={setResume}
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            latestEvaluation={latestEvaluation}
            sessions={sessions}
            onLoadSession={handleLoadSession}
            onNewSession={handleClearConversation}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-action-background bg-app-background">
            <div
              className={
                messages.length > 0
                  ? "relative min-h-0 shrink-0 basis-[40%]"
                  : "relative min-h-0 flex-grow"
              }
            >
              <MainArea
                buttonClicked={buttonClicked}
                setButtonClicked={setButtonClicked}
                aiReplied={aiReplied}
                setAiReplied={setAiReplied}
                chatHeight={chatHeightValue}
                isExpanded={isExpanded}
              />
            </div>

            <div
              className={
                messages.length > 0
                  ? "flex min-h-0 w-full min-w-0 shrink-0 basis-[60%] flex-col items-center justify-end gap-0 overflow-hidden bg-overlay-background p-0"
                  : "flex min-h-[76px] w-full min-w-0 flex-1 flex-col items-center justify-end gap-0 overflow-hidden bg-overlay-background p-0 md:min-h-[96px]"
              }
            >
              <ChatArea
                messages={messages}
                setMessages={setMessages}
                setButtonClicked={setButtonClicked}
                setAiReplied={setAiReplied}
                isBottomLayout={true}
                showSuggestedPrompts={true}
                resume={resume}
                jobDescription={jobDescription}
                onDropdownSelect={handleDropdownSelect}
                onUserInput={handleUserInput}
                onApiResponse={handleApiResponse}
                onClearConversation={handleClearConversation}
                currentUserMessage={currentUserMessage}
                agentResponse={agentResponse}
                isAgentLoading={isAgentLoading}
                chatRef={chatRef}
              />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
