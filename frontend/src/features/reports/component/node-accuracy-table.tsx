"use client";

import { useState } from "react";
import { ChevronIcon } from "@/components/icons";
import type { NodeAccuracy, NodeVerdict } from "../types";

const VERDICT_COLOR: Record<NodeVerdict, string> = {
  strong: "text-chart-green",
  needs_practice: "text-chart-amber",
  weak: "text-mark",
  insufficient_data: "text-ink/40 dark:text-paper/40",
};

const VERDICT_LABEL: Record<NodeVerdict, string> = {
  strong: "Strong",
  needs_practice: "Needs practice",
  weak: "Weak",
  insufficient_data: "Not enough data",
};

export function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function AccuracyBadge({ node }: { node: NodeAccuracy }) {
  return (
    <span className="flex shrink-0 items-center gap-3">
      <span className="font-utility text-xs text-ink/55 dark:text-paper/55">{pct(node.accuracy)}</span>
      <span
        className={`font-utility text-[11px] font-medium uppercase tracking-wide ${VERDICT_COLOR[node.verdict]}`}
      >
        {VERDICT_LABEL[node.verdict]}
      </span>
    </span>
  );
}

type TopicGroup = {
  topicName: string;
  topicNode: NodeAccuracy | null;
  subtopics: NodeAccuracy[];
};

type ChapterGroup = {
  chapterName: string;
  chapterNode: NodeAccuracy | null;
  topics: TopicGroup[];
};

// Nests chapter > topic > subtopic by path prefix rather than relying on input
// order — the backend sorts level-major (all chapters, then all topics, then all
// subtopics, each alphabetically), so a topic never sits next to its own subtopics
// in the raw list.
function groupByChapter(nodes: NodeAccuracy[]): ChapterGroup[] {
  const chapters = new Map<string, { chapterNode: NodeAccuracy | null; topics: Map<string, TopicGroup> }>();
  for (const node of nodes) {
    const [chapterName, topicName] = node.path.split(" > ");
    const chapter = chapters.get(chapterName) ?? { chapterNode: null, topics: new Map() };
    chapters.set(chapterName, chapter);
    if (node.level === "chapter") {
      chapter.chapterNode = node;
      continue;
    }
    const topic = chapter.topics.get(topicName) ?? { topicName, topicNode: null, subtopics: [] };
    chapter.topics.set(topicName, topic);
    if (node.level === "topic") {
      topic.topicNode = node;
    } else {
      topic.subtopics.push(node);
    }
  }
  return Array.from(chapters.entries())
    .map(([chapterName, { chapterNode, topics }]) => ({
      chapterName,
      chapterNode,
      topics: Array.from(topics.values())
        .map((topic) => ({
          ...topic,
          subtopics: [...topic.subtopics].sort((a, b) => a.path.localeCompare(b.path)),
        }))
        .sort((a, b) => a.topicName.localeCompare(b.topicName)),
    }))
    .sort((a, b) => a.chapterName.localeCompare(b.chapterName));
}

function nameOnly(node: NodeAccuracy): string {
  return node.path.split(" > ").at(-1) ?? node.path;
}

function TopicGroupRow({ topic }: { topic: TopicGroup }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = topic.subtopics.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={!hasChildren}
        className="flex w-full items-center justify-between gap-3 py-2 pl-4 text-left disabled:cursor-default"
      >
        <span className="flex items-center gap-2">
          {hasChildren && (
            <ChevronIcon
              className={`h-3 w-3 shrink-0 text-ink/40 transition-transform dark:text-paper/40 ${expanded ? "-rotate-90" : "rotate-180"}`}
            />
          )}
          <span className="text-sm text-ink/85 dark:text-paper/85">{topic.topicName}</span>
        </span>
        {topic.topicNode && <AccuracyBadge node={topic.topicNode} />}
      </button>

      {expanded && hasChildren && (
        <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
          {topic.subtopics.map((subtopic) => (
            <li key={subtopic.node_id} className="flex items-center justify-between gap-3 py-2 pl-8">
              <span className="text-sm text-ink/70 dark:text-paper/70">{nameOnly(subtopic)}</span>
              <AccuracyBadge node={subtopic} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ChapterGroupRow({ group }: { group: ChapterGroup }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = group.topics.length > 0;

  return (
    <li className="py-2.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={!hasChildren}
        className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-default"
      >
        <span className="flex items-center gap-2">
          {hasChildren && (
            <ChevronIcon
              className={`h-3.5 w-3.5 shrink-0 text-ink/40 transition-transform dark:text-paper/40 ${expanded ? "-rotate-90" : "rotate-180"}`}
            />
          )}
          <span className="text-sm font-medium text-ink dark:text-paper">{group.chapterName}</span>
        </span>
        {group.chapterNode && <AccuracyBadge node={group.chapterNode} />}
      </button>

      {expanded && hasChildren && (
        <ul className="mt-1.5 flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
          {group.topics.map((topic) => (
            <TopicGroupRow key={topic.topicName} topic={topic} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function NodeAccuracyTable({ nodes }: { nodes: NodeAccuracy[] }) {
  if (nodes.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-paper/50">No node-mapped answers yet.</p>;
  }

  const groups = groupByChapter(nodes);
  return (
    <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
      {groups.map((group) => (
        <ChapterGroupRow key={group.chapterName} group={group} />
      ))}
    </ul>
  );
}
