/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React, { useState } from "react"
import airplaneSvg from "@/assets/airplane.svg"
import { useAgentAPI } from "@/hooks/useAgentAPI"
import ChatHeader from "./ChatHeader"
import Messages from "./Messages"
import { Message } from "@/types/Message"
import { logger } from "@/utils/logger"

interface ChatAreaProps {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setButtonClicked: (clicked: boolean) => void
  setAiReplied: (replied: boolean) => void
  isBottomLayout: boolean
  resume?: string
  jobDescription?: string
  onUserInput?: (query: string) => void
  onApiResponse?: (response: string, isError?: boolean) => void
  onClearConversation?: () => void
  currentUserMessage?: string
  agentResponse?: string
  isAgentLoading?: boolean
  chatRef?: React.RefObject<HTMLDivElement | null>
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  setMessages,
  setButtonClicked,
  setAiReplied,
  isBottomLayout,
  resume,
  jobDescription,
  onUserInput,
  onApiResponse,
  onClearConversation,
  currentUserMessage,
  agentResponse,
  isAgentLoading,
  chatRef,
}) => {
  const [content, setContent] = useState<string>("")
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const { loading, sendMessageWithCallback } = useAgentAPI()

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  const handleRestore = () => {
    setIsMinimized(false)
  }

  const processMessageWithQuery = async (
    messageContent: string,
  ): Promise<void> => {
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    await sendMessageWithCallback(messageContent, setMessages, {
      conversationHistory,
      resume: resume?.trim() || undefined,
      job_description: jobDescription?.trim() || undefined,
      onStart: () => {
        setContent("")
        setButtonClicked(true)
      },
      onSuccess: (response) => {
        setAiReplied(true)
        if (onApiResponse) {
          onApiResponse(response, false)
        }
      },
      onError: (error) => {
        if (import.meta.env.DEV) {
          logger.apiError("/agent/prompt", error)
        }
        if (onApiResponse) {
          onApiResponse("Sorry, I encountered an error.", true)
        }
      },
    })
  }

  const processMessage = async (): Promise<void> => {
    if (isMinimized) {
      setIsMinimized(false)
    }

    if (onUserInput) {
      onUserInput(content)
    }
    await processMessageWithQuery(content)
    setContent("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      processMessage()
    }
  }

  if (!isBottomLayout) {
    return null
  }

  return (
    <div
      ref={chatRef}
      className="relative flex min-h-0 w-full flex-1 flex-col"
      style={{ backgroundColor: "var(--overlay-background)" }}
    >
      {messages.length > 0 && (
        <ChatHeader
          onMinimize={isMinimized ? handleRestore : handleMinimize}
          onClearConversation={onClearConversation}
          isMinimized={isMinimized}
          showActions={!!agentResponse && !isAgentLoading}
        />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center px-4 py-8 sm:px-8 md:px-16 lg:px-[120px]">
            <div className="w-full max-w-[640px] rounded-xl border border-sidebar-border bg-sidebar-background/80 p-6 text-left shadow-inner">
              <p className="mb-3 text-base font-medium text-sidebar-text">
                Welcome to the mock interview.
              </p>
              <p className="mb-4 text-sm leading-relaxed text-sidebar-text/90">
                You can fill in your resume and job description in the left
                sidebar. When you are ready, type to start the interview.
              </p>
              <p className="text-xs text-sidebar-text/70">
                Your first reply will not be scored; the interviewer will greet
                you and ask the first question.
              </p>
            </div>
          </div>
        ) : (
          <Messages messages={messages} />
        )}
      </div>

      <div className="flex w-full flex-none flex-col items-center justify-center gap-2 px-4 py-4 sm:px-8 md:px-16 lg:px-[120px]">
        <div className="flex w-full max-w-[880px] flex-col items-stretch gap-4 p-0 sm:flex-row sm:items-end">
          <div className="box-border flex min-h-[44px] max-w-[814px] flex-1 flex-row items-stretch rounded border border-node-background bg-chat-input-background px-0 py-[5px]">
            <div className="flex w-full flex-row items-stretch gap-[10px] px-4 py-2">
              <textarea
                rows={2}
                className="min-h-[34px] max-h-[200px] min-w-0 flex-1 resize-none border-none bg-transparent font-cisco text-[15px] font-medium leading-5 tracking-[0.005em] text-chat-text outline-none placeholder:text-chat-text placeholder:opacity-60 py-1"
                placeholder="Type a prompt to interact with the agents"
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setContent(e.target.value)
                }
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex h-11 min-h-[44px] w-[50px] flex-none flex-row items-center justify-center p-0 sm:items-end sm:pb-1">
            <button
              onClick={() => {
                if (content.trim() && !loading) {
                  processMessage()
                }
              }}
              className="flex h-11 w-[50px] cursor-pointer flex-row items-center justify-center gap-[10px] rounded-md border-none bg-gradient-to-r from-[#834DD7] via-[#7670D5] to-[#58C0D0] px-4 py-[15px]"
            >
              <img src={airplaneSvg} alt="Send" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


export default ChatArea
