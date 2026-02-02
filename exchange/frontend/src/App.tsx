/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React, { useState, useEffect } from "react"
import { Maximize2, Minimize2, PanelLeft, PanelLeftClose } from "lucide-react"
import ChatArea from "@/components/Chat/ChatArea"

import Navigation from "@/components/Navigation/Navigation"
import MainArea from "@/components/MainArea/MainArea"
import Sidebar from "@/components/Sidebar/Sidebar"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { Message, Evaluation, Report, Session } from "./types/Message"
import ReportModal from "@/components/ReportModal"
import { requestFinish } from "@/hooks/useAgentAPI"
import { v4 as uuid } from "uuid"

const SESSIONS_STORAGE_KEY = "mock_interview_sessions"
const REPORTS_STORAGE_KEY = "mock_interview_reports"
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
  const [isChatFullscreen, setIsChatFullscreen] = useState<boolean>(true)
  const [reports, setReports] = useState<Report[]>([])
  const [reportToShow, setReportToShow] = useState<Report | null>(null)
  const [isFinishLoading, setIsFinishLoading] = useState<boolean>(false)
  const [mode, setMode] = useState<"free" | "timed" | "simulation">("free")
  const [timedDurationMinutes, setTimedDurationMinutes] = useState<number>(10)
  const [timedStartedAt, setTimedStartedAt] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
  const { sendMessageWithCallback } = useAgentAPI()

  const {
    height: chatHeight,
    isExpanded,
    chatRef,
  } = useChatAreaMeasurement({
    debounceMs: 100,
  })

  useEffect(() => {
    const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY)
    if (storedSessions) {
      try {
        setSessions(JSON.parse(storedSessions))
      } catch {
        // ignore invalid stored sessions
      }
    }
    const storedReports = localStorage.getItem(REPORTS_STORAGE_KEY)
    if (storedReports) {
      try {
        setReports(JSON.parse(storedReports))
      } catch {
        // ignore invalid stored reports
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports))
  }, [reports])

  useEffect(() => {
    if (mode !== "timed") setTimedStartedAt(null)
  }, [mode])

  const [timedTick, setTimedTick] = useState(0)
  useEffect(() => {
    if (mode !== "timed" || timedStartedAt == null) return
    const id = setInterval(() => setTimedTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [mode, timedStartedAt])

  const timedRemainingSeconds =
    mode === "timed" && timedStartedAt != null && timedDurationMinutes > 0
      ? Math.max(
          0,
          timedDurationMinutes * 60 - Math.floor((Date.now() - timedStartedAt) / 1000),
        )
      : null

  useEffect(() => {
    if (timedRemainingSeconds === null) return
    if (timedRemainingSeconds <= 0) {
      setTimedStartedAt(null)
      handleFinish()
    }
  }, [timedRemainingSeconds])

  const latestEvaluation: Evaluation | null = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === "assistant" && msg.evaluation) return msg.evaluation
    }
    return null
  })()

  const chatHeightValue = currentUserMessage || agentResponse ? chatHeight : 76

  const handleApiResponse = (
    response: string,
    isError: boolean = false,
    updatedMessages?: Message[],
  ) => {
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

    if (
      !isError &&
      mode === "simulation" &&
      updatedMessages != null &&
      updatedMessages.filter((m) => m.role === "assistant").length >= 5
    ) {
      handleFinish(updatedMessages)
    }
  }

  const handleUserInput = (query: string) => {
    setCurrentUserMessage(query)
    setIsAgentLoading(true)
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
    setTimedStartedAt(null)
  }

  const handleLoadSession = (session: Session) => {
    setMessages(
      session.messages.map((m) => ({ ...m, animate: false })),
    )
    setCurrentUserMessage("")
    setAgentResponse("")
    setIsAgentLoading(false)
  }

  const handleDeleteSession = (session: Session) => {
    setSessions((prev) => prev.filter((s) => s.id !== session.id))
  }

  const addReport = (content: string, title?: string) => {
    const id = uuid()
    const createdAt = Date.now()
    const report: Report = {
      id,
      title: title ?? `Mock Interview Report ${new Date(createdAt).toLocaleString()}`,
      createdAt,
      content,
    }
    setReports((prev) => [report, ...prev])
    setReportToShow(report)
  }

  const deleteReport = (report: Report) => {
    setReports((prev) => prev.filter((r) => r.id !== report.id))
    if (reportToShow?.id === report.id) setReportToShow(null)
  }

  const handleFinish = async (overrideMessages?: Message[]) => {
    const source = overrideMessages ?? messages
    const conversationHistory = source.map((m) => ({ role: m.role, content: m.content }))
    if (conversationHistory.length === 0) return
    setIsFinishLoading(true)
    try {
      const { report } = await requestFinish(
        conversationHistory,
        resume?.trim() || undefined,
        jobDescription?.trim() || undefined,
      )
      const title =
        report.slice(0, 60).trim() + (report.length > 60 ? "…" : "") ||
        "Mock Interview Report"
      addReport(report, title)
    } catch (err) {
      if (import.meta.env.DEV) logger.apiError("/agent/finish", err)
    } finally {
      setIsFinishLoading(false)
    }
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-app-background">
        <Navigation
          timedRemainingSeconds={timedRemainingSeconds}
          onEndEarly={() => {
            setTimedStartedAt(null)
            handleFinish()
          }}
        />

        <ReportModal
          report={reportToShow}
          onClose={() => setReportToShow(null)}
        />
        <div className="relative flex flex-1 overflow-hidden">
          <div
            className={`flex shrink-0 flex-row transition-[width] duration-200 ease-out ${
              sidebarOpen ? "w-64 lg:w-[320px]" : "w-0 min-w-0 overflow-hidden"
            }`}
          >
            <Sidebar
              resume={resume}
              setResume={setResume}
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              latestEvaluation={latestEvaluation}
              sessions={sessions}
              onLoadSession={handleLoadSession}
              onDeleteSession={handleDeleteSession}
              onNewSession={handleClearConversation}
            reports={reports}
            onOpenReport={setReportToShow}
            onDeleteReport={deleteReport}
            mode={mode}
            onModeChange={setMode}
            timedDurationMinutes={timedDurationMinutes}
            onTimedDurationChange={setTimedDurationMinutes}
          />
          </div>
          <div className="absolute right-4 top-[52px] z-30 flex flex-row items-center gap-2">
            <button
              type="button"
              onClick={() => setIsChatFullscreen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-background text-sidebar-text shadow-sm transition-colors hover:bg-sidebar-item-selected"
              aria-label={isChatFullscreen ? "Show agents" : "Fullscreen chat"}
              title={isChatFullscreen ? "Show agents" : "Fullscreen chat"}
            >
              {isChatFullscreen ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-background text-sidebar-text shadow-sm transition-colors hover:bg-sidebar-item-selected"
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-action-background bg-app-background">
            {!isChatFullscreen && (
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
            )}

            <div
              className={
                isChatFullscreen
                  ? "relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-end gap-0 overflow-hidden bg-overlay-background p-0"
                  : messages.length > 0
                    ? "relative flex min-h-0 w-full min-w-0 shrink-0 basis-[60%] flex-col items-center justify-end gap-0 overflow-hidden bg-overlay-background p-0"
                    : "relative flex min-h-[76px] w-full min-w-0 flex-1 flex-col items-center justify-end gap-0 overflow-hidden bg-overlay-background p-0 md:min-h-[96px]"
              }
            >
              <ChatArea
                messages={messages}
                setMessages={setMessages}
                setButtonClicked={setButtonClicked}
                setAiReplied={setAiReplied}
                isBottomLayout={true}
                resume={resume}
                jobDescription={jobDescription}
                onUserInput={handleUserInput}
                onApiResponse={handleApiResponse}
                onClearConversation={handleClearConversation}
                currentUserMessage={currentUserMessage}
                agentResponse={agentResponse}
                isAgentLoading={isAgentLoading}
                chatRef={chatRef}
                onFinish={handleFinish}
                isFinishLoading={isFinishLoading}
                mode={mode}
                onStartTimed={() => {
                  if (mode === "timed" && timedStartedAt === null) {
                    setTimedStartedAt(Date.now())
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
