import { useMemo } from "react";
import { diff_match_patch } from "diff-match-patch";
import "../styles/diff-viewer.css";

interface DiffViewerProps {
  original: string;
  proposed: string;
}

interface DiffSegment {
  type: "unchanged" | "added" | "removed";
  text: string;
}

export default function DiffViewer({ original, proposed }: DiffViewerProps) {
  const diffs = useMemo(() => {
    const dmp = new diff_match_patch();
    const rawDiffs = dmp.diff_main(original, proposed);
    dmp.diff_cleanupSemantic(rawDiffs);

    // Convert raw diffs to our segment format
    const segments: DiffSegment[] = rawDiffs.map(([type, text]) => {
      const typeMap: Record<number, DiffSegment["type"]> = {
        [-1]: "removed",
        [0]: "unchanged",
        [1]: "added",
      };
      return {
        type: typeMap[type] || "unchanged",
        text,
      };
    });

    return segments;
  }, [original, proposed]);

  const renderDiffContent = (segments: DiffSegment[]) => {
    return (
      <div className="diff-text">
        {segments.map((segment, idx) => (
          <span
            key={idx}
            className={`diff-segment diff-segment-${segment.type}`}
          >
            {segment.text}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="diff-viewer">
      <div className="diff-column diff-original">
        <div className="diff-column-label">Current</div>
        <div className="diff-content">{original}</div>
      </div>
      <div className="diff-column diff-proposed">
        <div className="diff-column-label">Proposed</div>
        <div className="diff-content">{renderDiffContent(diffs)}</div>
      </div>
    </div>
  );
}
