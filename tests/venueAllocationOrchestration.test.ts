import { runAdminPreAllocation } from "../src/lib/federation/venueAllocationOrchestration";

const input = {
  federationSlug: "nowon-football", venueId: "nowon-suraksan", venueName: "수락산",
  bookingDate: "2026-08-27", startTime: "10:00", endTime: "12:00",
  teamId: "team", teamName: "KUFC-TEST-2", platformTeamId: "platform",
};

test("QUOTED creates then allocates once without an amount input", async () => {
  const create = jest.fn().mockResolvedValue({ requestId: "req", pricingStatus: "QUOTED" });
  const allocate = jest.fn().mockResolvedValue({ slotAllocationId: "slot" });
  await expect(runAdminPreAllocation(input, { create, allocate })).resolves.toMatchObject({ requestId: "req" });
  expect(create).toHaveBeenCalledTimes(1); expect(allocate).toHaveBeenCalledWith({ federationSlug: input.federationSlug, requestId: "req" });
  expect(create.mock.calls[0][0]).not.toHaveProperty("amount");
});

test("REVIEW_REQUIRED never allocates", async () => {
  const create = jest.fn().mockResolvedValue({ requestId: "req", pricingStatus: "REVIEW_REQUIRED" });
  const allocate = jest.fn();
  await expect(runAdminPreAllocation(input, { create, allocate })).rejects.toThrow("가격 검토");
  expect(allocate).not.toHaveBeenCalled();
});

test("non-platform never calls either dependency", async () => {
  const create = jest.fn(), allocate = jest.fn();
  await expect(runAdminPreAllocation({ ...input, teamKind: "guest" }, { create, allocate })).rejects.toThrow();
  expect(create).not.toHaveBeenCalled(); expect(allocate).not.toHaveBeenCalled();
});

test("create failure propagates without allocation or retry", async () => {
  const create = jest.fn().mockRejectedValue(new Error("create failed"));
  const allocate = jest.fn();
  await expect(runAdminPreAllocation(input, { create, allocate })).rejects.toThrow("create failed");
  expect(create).toHaveBeenCalledTimes(1); expect(allocate).not.toHaveBeenCalled();
});

test("allocate failure propagates without retry", async () => {
  const create = jest.fn().mockResolvedValue({ requestId: "req", pricingStatus: "QUOTED" });
  const allocate = jest.fn().mockRejectedValue(new Error("allocate failed"));
  await expect(runAdminPreAllocation(input, { create, allocate })).rejects.toThrow("allocate failed");
  expect(create).toHaveBeenCalledTimes(1); expect(allocate).toHaveBeenCalledTimes(1);
});
