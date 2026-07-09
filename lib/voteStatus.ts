export interface ReportStatusState {
  status: string;
  previousStatus: string | null;
}

// Suppression is vote-driven and can flip either direction as votes change,
// so this runs on every vote rather than only when a threshold is first
// crossed — the null return is what makes repeated calls with an
// already-correct status a no-op instead of a redundant write.
export function resolveStatusAfterVotes(
  current: ReportStatusState,
  suppressed: boolean
): ReportStatusState | null {
  if (suppressed && current.status !== "SUPPRESSED") {
    return { status: "SUPPRESSED", previousStatus: current.status };
  }
  if (!suppressed && current.status === "SUPPRESSED") {
    return { status: current.previousStatus ?? "PENDING", previousStatus: null };
  }
  return null;
}
