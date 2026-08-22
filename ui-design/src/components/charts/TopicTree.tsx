import type { TopicNode } from "@/lib/mock-data";

function statusColor(accuracy: number) {
  if (accuracy >= 80) return "text-chart-green";
  if (accuracy >= 60) return "text-chart-amber";
  return "text-mark";
}

function statusLabel(accuracy: number) {
  if (accuracy >= 80) return "Strong";
  if (accuracy >= 60) return "Needs practice";
  return "Weak";
}

function Row({ node, depth }: { node: TopicNode; depth: number }) {
  const children = node.children
    ? [...node.children].sort((a, b) => a.accuracy - b.accuracy)
    : undefined;

  return (
    <li>
      <div className="flex items-center gap-3 py-2.5" style={{ paddingLeft: depth * 20 }}>
        {depth > 0 && (
          <span aria-hidden className="h-px w-4 shrink-0 bg-ink/15 dark:bg-paper/15" />
        )}
        <span className="flex-1 truncate text-sm font-medium text-ink dark:text-paper">
          {node.name}
        </span>
        {node.studentsStruggling !== undefined && node.studentsTotal !== undefined && (
          <span className="hidden font-utility text-xs text-ink/45 sm:inline dark:text-paper/45">
            {node.studentsStruggling}/{node.studentsTotal} struggling
          </span>
        )}
        <span className={`font-utility text-[11px] font-semibold uppercase tracking-wide ${statusColor(node.accuracy)}`}>
          {statusLabel(node.accuracy)}
        </span>
        <span className={`w-12 shrink-0 text-right font-body text-sm font-semibold ${statusColor(node.accuracy)}`}>
          {node.accuracy}%
        </span>
      </div>
      {children && (
        <ul className="flex flex-col">
          {children.map((child) => (
            <Row key={child.name} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TopicTree({ nodes }: { nodes: TopicNode[] }) {
  const sorted = [...nodes].sort((a, b) => a.accuracy - b.accuracy);
  return (
    <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
      {sorted.map((node) => (
        <Row key={node.name} node={node} depth={0} />
      ))}
    </ul>
  );
}
