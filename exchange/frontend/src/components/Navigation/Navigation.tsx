/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/
import React, { useState } from "react"
import { HelpCircle } from "lucide-react"
import ThemeToggleIcon from "../icons/ThemeToggleIcon"
import { useTheme } from "@/hooks/useTheme"
import InfoModal from "./InfoModal"

interface NavigationProps {
  timedRemainingSeconds?: number | null
  onEndEarly?: () => void
}

const Navigation: React.FC<NavigationProps> = ({
  timedRemainingSeconds = null,
  onEndEarly,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isLightMode, toggleTheme } = useTheme()

  const formattedTime =
    timedRemainingSeconds != null
      ? `${String(Math.floor(timedRemainingSeconds / 60)).padStart(2, "0")}:${String(timedRemainingSeconds % 60).padStart(2, "0")}`
      : null

  const handleHelpClick = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleThemeToggle = () => {
    toggleTheme()
  }
  return (
    <div className="order-0 box-border flex h-[52px] w-full flex-none flex-grow-0 flex-col items-start self-stretch border-r border-nav-border bg-nav-background p-0">
      <div className="order-0 box-border flex h-[52px] w-full flex-none flex-grow-0 flex-row items-center justify-between gap-2 self-stretch border-b border-nav-border bg-nav-background-secondary px-2 py-[10px] sm:px-4">
        <div className="order-0 ml-2 flex h-[45px] w-32 flex-none flex-grow-0 flex-row items-center gap-2 p-0 opacity-100 sm:ml-4 sm:w-40">
          <div className="order-0 flex h-[45px] w-32 flex-none flex-grow-0 flex-row items-center gap-1 p-0 opacity-100 sm:w-40">
            <div className="order-0 flex h-[42px] w-auto flex-none flex-grow-0 items-center justify-center gap-0.5 opacity-100">
              <span className="text-lg font-semibold text-nav-text sm:text-xl">
                Mock Interview
              </span>
            </div>
          </div>
        </div>

        <div className="order-3 flex flex-none flex-grow-0 flex-row items-center justify-end gap-2 p-0">
          {formattedTime != null && (
            <>
              <span className="text-sm font-medium tabular-nums text-nav-text">
                {formattedTime}
              </span>
              {onEndEarly && (
                <button
                  type="button"
                  onClick={onEndEarly}
                  className="rounded border border-nav-border bg-nav-background px-2 py-1 text-xs font-medium text-nav-text transition-colors hover:bg-nav-background-secondary"
                >
                  End early
                </button>
              )}
            </>
          )}
          <button
            className="order-0 flex h-8 w-8 flex-none flex-grow-0 items-center justify-center rounded p-1.5 transition-opacity hover:opacity-80"
            title={`Switch between dark and light mode (currently ${isLightMode ? "light" : "dark"} mode)`}
            aria-label={`Switch between dark and light mode (currently ${isLightMode ? "light" : "dark"} mode)`}
            onClick={handleThemeToggle}
          >
            <ThemeToggleIcon className="h-5 w-5 text-nav-text" />
          </button>
          <button
            className="order-0 flex h-8 w-8 flex-none flex-grow-0 items-center justify-center rounded p-1.5 transition-opacity hover:opacity-80"
            title="Help"
            onClick={handleHelpClick}
          >
            <HelpCircle className="h-5 w-5 text-nav-text" />
          </button>
        </div>
      </div>

      <InfoModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  )
}

export default Navigation
