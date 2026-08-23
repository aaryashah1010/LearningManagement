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

export function NodeAccuracyTable({ nodes }: { nodes: NodeAccuracy[] }) {
  if (nodes.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-paper/50">No node-mapped answers yet.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
      {nodes.map((node) => (
        <li key={node.node_id} className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-sm text-ink dark:text-paper">{node.path}</span>
          <span className="flex items-center gap-3">
            <span className="font-utility text-xs text-ink/55 dark:text-paper/55">
              {pct(node.accuracy)}
            </span>
            <span
              className={`font-utility text-[11px] font-medium uppercase tracking-wide ${VERDICT_COLOR[node.verdict]}`}
            >
              {VERDICT_LABEL[node.verdict]}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
