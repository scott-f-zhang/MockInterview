/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import React from "react"
import { X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { Report } from "@/types/Message"

interface ReportModalProps {
  report: Report | null
  onClose: () => void
}

const ReportModal: React.FC<ReportModalProps> = ({ report, onClose }) => {
  if (report === null) return null

  const content = report.content || ""

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-modal-border bg-modal-background shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-modal-border px-4 py-3">
          <h2 id="report-modal-title" className="text-lg font-medium text-modal-text">
            Mock Interview Report
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-modal-text-secondary transition-colors hover:bg-modal-hover hover:text-modal-text"
            aria-label="Close report"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="prose prose-invert max-w-none text-modal-text prose-p:leading-relaxed prose-strong:text-modal-text">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
