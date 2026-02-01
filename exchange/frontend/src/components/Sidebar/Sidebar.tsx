/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React, { useState } from "react"

interface SidebarProps {
  resume: string
  setResume: (value: string) => void
  jobDescription: string
  setJobDescription: (value: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  resume,
  setResume,
  jobDescription,
  setJobDescription,
}) => {
  const [contextOpen, setContextOpen] = useState<boolean>(false)

  return (
    <div className="flex h-full w-64 flex-none flex-col border-r border-sidebar-border bg-sidebar-background font-inter lg:w-[320px]">
      <div className="flex h-full flex-1 flex-col gap-5 overflow-y-auto p-4">
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
