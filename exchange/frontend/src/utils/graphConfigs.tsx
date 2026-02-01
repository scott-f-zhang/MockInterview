/**
 * Copyright AGNTCY Contributors (https://github.com/agntcy)
 * SPDX-License-Identifier: Apache-2.0
 **/

import { Node, Edge } from "@xyflow/react"
import supervisorIcon from "@/assets/supervisor.png"
import graderIcon from "@/assets/Grader-Agent.png"

export interface GraphConfig {
  title: string
  nodes: Node[]
  edges: Edge[]
  animationSequence: { ids: string[] }[]
}

const FarmAgentIcon = (
  <img
    src={graderIcon}
    alt="Farm Agent Icon"
    style={{
      width: "16px",
      height: "16px",
      objectFit: "contain",
      opacity: 1,
    }}
    className="dark-icon"
  />
)

const SLIM_A2A_CONFIG: GraphConfig = {
  title: "SLIM A2A Mock Interview Agent Communication",
  nodes: [
    {
      id: "1",
      type: "customNode",
      data: {
        icon: (
          <img
            src={supervisorIcon}
            alt="Exchange Icon"
            style={{
              width: "16px",
              height: "16px",
              objectFit: "contain",
            }}
            className="dark-icon"
          />
        ),
        label1: "Exchange Agent",
        label2: "Client",
        handles: "source",
        verificationStatus: "verified",
        githubLink: "https://github.com/agntcy/app-sdk",
        agentDirectoryLink:
          "https://agent-directory.outshift.com/explore/baeareictsvltsvud5w44pjkoqgbb2tqdl3dy2fqkzmsydhap5z5svj5uje",
      },
      position: { x: 420, y: 80 },
    },
    {
      id: "2",
      type: "customNode",
      data: {
        icon: FarmAgentIcon,
        label1: "Context Agent",
        label2: "Resume + JD",
        handles: "all",
        githubLink: "https://github.com/agntcy/app-sdk",
        agentDirectoryLink:
          "https://agent-directory.outshift.com/explore/baeareiaf35jhrvbcdyktkr2qzbp4iarylm6u4ksl4mpgzmq5dh7aerlks4",
      },
      position: { x: 420, y: 280 },
    },
    {
      id: "3",
      type: "customNode",
      data: {
        icon: FarmAgentIcon,
        label1: "Interviewer Agent",
        label2: "Questions & phase",
        handles: "target",
        githubLink: "https://github.com/agntcy/app-sdk",
        agentDirectoryLink:
          "https://agent-directory.outshift.com/explore/baeareiaf35jhrvbcdyktkr2qzbp4iarylm6u4ksl4mpgzmq5dh7aerlks4",
      },
      position: { x: 180, y: 500 },
    },
    {
      id: "4a",
      type: "customNode",
      data: {
        icon: FarmAgentIcon,
        label1: "Relevance Agent",
        label2: "0–5 score",
        handles: "all",
        githubLink: "https://github.com/agntcy/app-sdk",
        agentDirectoryLink:
          "https://agent-directory.outshift.com/explore/baeareiaf35jhrvbcdyktkr2qzbp4iarylm6u4ksl4mpgzmq5dh7aerlks4",
      },
      position: { x: 180, y: 380 },
    },
    {
      id: "4b",
      type: "customNode",
      data: {
        icon: FarmAgentIcon,
        label1: "Depth Agent",
        label2: "0–5 score",
        handles: "all",
        githubLink: "https://github.com/agntcy/app-sdk",
        agentDirectoryLink:
          "https://agent-directory.outshift.com/explore/baeareiaf35jhrvbcdyktkr2qzbp4iarylm6u4ksl4mpgzmq5dh7aerlks4",
      },
      position: { x: 380, y: 380 },
    },
    {
      id: "4c",
      type: "customNode",
      data: {
        icon: FarmAgentIcon,
        label1: "Clarity Agent",
        label2: "0–5 score",
        handles: "all",
        githubLink: "https://github.com/agntcy/app-sdk",
        agentDirectoryLink:
          "https://agent-directory.outshift.com/explore/baeareiaf35jhrvbcdyktkr2qzbp4iarylm6u4ksl4mpgzmq5dh7aerlks4",
      },
      position: { x: 580, y: 380 },
    },
    {
      id: "4d",
      type: "customNode",
      data: {
        icon: FarmAgentIcon,
        label1: "Structure Agent",
        label2: "0–5 score",
        handles: "all",
        githubLink: "https://github.com/agntcy/app-sdk",
        agentDirectoryLink:
          "https://agent-directory.outshift.com/explore/baeareiaf35jhrvbcdyktkr2qzbp4iarylm6u4ksl4mpgzmq5dh7aerlks4",
      },
      position: { x: 780, y: 380 },
    },
    {
      id: "4e",
      type: "customNode",
      data: {
        icon: FarmAgentIcon,
        label1: "Professionalism Agent",
        label2: "0–5 score",
        handles: "all",
        githubLink: "https://github.com/agntcy/app-sdk",
        agentDirectoryLink:
          "https://agent-directory.outshift.com/explore/baeareiaf35jhrvbcdyktkr2qzbp4iarylm6u4ksl4mpgzmq5dh7aerlks4",
      },
      position: { x: 980, y: 380 },
    },
    {
      id: "4",
      type: "customNode",
      data: {
        icon: FarmAgentIcon,
        label1: "Final Evaluator Agent",
        label2: "Average & feedback",
        handles: "target",
        githubLink: "https://github.com/agntcy/app-sdk",
        agentDirectoryLink:
          "https://agent-directory.outshift.com/explore/baeareiaf35jhrvbcdyktkr2qzbp4iarylm6u4ksl4mpgzmq5dh7aerlks4",
      },
      position: { x: 580, y: 500 },
    },
  ],
  edges: [
    {
      id: "1-2",
      source: "1",
      target: "2",
      data: { label: "A2A: SLIM" },
      type: "custom",
    },
    {
      id: "2-3",
      source: "2",
      target: "3",
      data: { label: "context" },
      type: "custom",
    },
    {
      id: "2-4",
      source: "2",
      target: "4",
      data: { label: "context" },
      type: "custom",
    },
    { id: "4a-4", source: "4a", target: "4", data: { label: "score" }, type: "custom" },
    { id: "4b-4", source: "4b", target: "4", data: { label: "score" }, type: "custom" },
    { id: "4c-4", source: "4c", target: "4", data: { label: "score" }, type: "custom" },
    { id: "4d-4", source: "4d", target: "4", data: { label: "score" }, type: "custom" },
    { id: "4e-4", source: "4e", target: "4", data: { label: "score" }, type: "custom" },
  ],
  animationSequence: [
    { ids: ["1"] },
    { ids: ["1-2"] },
    { ids: ["2"] },
    { ids: ["2-3", "2-4"] },
    { ids: ["3"] },
    { ids: ["4a", "4b", "4c", "4d", "4e"] },
    { ids: ["4a-4", "4b-4", "4c-4", "4d-4", "4e-4"] },
    { ids: ["4"] },
  ],
}

export const graphConfig = SLIM_A2A_CONFIG

export const updateA2ALabels = async (
  setEdges: (updater: (edges: any[]) => any[]) => void,
): Promise<void> => {
  setEdges((edges: any[]) =>
    edges.map((edge: any) =>
      edge.id === "1-2"
        ? { ...edge, data: { ...edge.data, label: "A2A: SLIM" } }
        : edge,
    ),
  )
}
