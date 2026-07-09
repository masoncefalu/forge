import { describe, it, expect } from "vitest";
import { resolveStatusAfterVotes } from "@/lib/voteStatus";

describe("resolveStatusAfterVotes", () => {
  it("suppresses a PENDING report once dead votes outnumber confirms", () => {
    expect(resolveStatusAfterVotes({ status: "PENDING", previousStatus: null }, true)).toEqual({
      status: "SUPPRESSED",
      previousStatus: "PENDING",
    });
  });

  it("suppresses an APPROVED report and remembers its prior status", () => {
    expect(resolveStatusAfterVotes({ status: "APPROVED", previousStatus: null }, true)).toEqual({
      status: "SUPPRESSED",
      previousStatus: "APPROVED",
    });
  });

  it("is a no-op when already SUPPRESSED and votes stay suppressed", () => {
    expect(
      resolveStatusAfterVotes({ status: "SUPPRESSED", previousStatus: "APPROVED" }, true)
    ).toBeNull();
  });

  it("restores the prior status when confirms bring it out of suppression", () => {
    expect(
      resolveStatusAfterVotes({ status: "SUPPRESSED", previousStatus: "APPROVED" }, false)
    ).toEqual({ status: "APPROVED", previousStatus: null });
  });

  it("falls back to PENDING when restoring from suppression with no saved previousStatus", () => {
    expect(
      resolveStatusAfterVotes({ status: "SUPPRESSED", previousStatus: null }, false)
    ).toEqual({ status: "PENDING", previousStatus: null });
  });

  it("is a no-op for non-suppressed statuses when votes stay unsuppressed", () => {
    expect(resolveStatusAfterVotes({ status: "PENDING", previousStatus: null }, false)).toBeNull();
    expect(resolveStatusAfterVotes({ status: "APPROVED", previousStatus: null }, false)).toBeNull();
    expect(resolveStatusAfterVotes({ status: "REJECTED", previousStatus: null }, false)).toBeNull();
  });
});
