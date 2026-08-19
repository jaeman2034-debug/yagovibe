export type AdminPreAllocationInput = {
  federationSlug: string;
  venueId: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  teamId: string;
  teamName: string;
  platformTeamId?: string;
  teamKind?: "platform" | "guest";
};

export type CreateQuote = { requestId: string; pricingStatus: "QUOTED" | "REVIEW_REQUIRED" };

export async function runAdminPreAllocation(
  input: AdminPreAllocationInput,
  dependencies: {
    create: (input: Required<Omit<AdminPreAllocationInput, "teamKind">>) => Promise<CreateQuote>;
    allocate: (input: { federationSlug: string; requestId: string }) => Promise<{ slotAllocationId: string }>;
  }
) {
  if (input.teamKind === "guest" || !input.platformTeamId?.trim()) {
    throw new Error("가입 클럽의 플랫폼 팀 연결이 필요합니다.");
  }
  const created = await dependencies.create({ ...input, platformTeamId: input.platformTeamId });
  if (created.pricingStatus !== "QUOTED") {
    throw new Error("가격 검토가 필요합니다. 선배정을 진행하지 않았습니다.");
  }
  const allocation = await dependencies.allocate({
    federationSlug: input.federationSlug,
    requestId: created.requestId,
  });
  return { requestId: created.requestId, slotAllocationId: allocation.slotAllocationId, overriddenPendingCount: 0 };
}
