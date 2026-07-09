export interface StatusInput {
  status: string;
  previousStatus: string | null;
}

export interface StatusUpdate {
  status: string;
  previousStatus: string | null;
}

/**
 * Decides the new status/previousStatus after a vote changes suppression
 * state. Returns null if no DB write is needed (status is already correct).
 */
export function resolveStatusAfterVotes(current: StatusInput, suppressed: boolean): StatusUpdate | null {
  if (suppressed && current.status !== "SUPPRESSED") {
    return { status: "SUPPRESSED", previousStatus: current.status };
  }
  if (!suppressed && current.status === "SUPPRESSED") {
    return { status: current.previousStatus ?? "PENDING", previousStatus: null };
  }
  return null;
}
