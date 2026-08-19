import {
  assertReservationEligibleForCanary,
  buildCanonicalReservationAssignedTemplateVariables,
  CANONICAL_RESERVATION_ASSIGNED_TEMPLATE_VARIABLE_NAMES,
  executeReservationAssignedControlledCanaryCore,
  renderCanonicalReservationAssignedTemplate,
  resolveExactReservationAssignedCanaryTargets,
  type ControlledCanaryNotification,
  type ControlledCanaryReservationSnapshot,
  type ControlledCanaryStore,
} from "../functions/src/federation/reservationAssignedControlledCanaryCore";
import { validateNcpTemplateInput } from "../functions/src/lib/kakao/ncpAlimTalkProvider";

const federationSlug = "nowon-football";
const reservationId = "local-canary-reservation-001";

const defaultReservation: ControlledCanaryReservationSnapshot = {
  pricingStatus: "QUOTED",
  totalAmount: 140250,
  baseAmount: 140250,
  lightingAmount: 0,
  pricingPolicyId: "nowon-pricing-v2-2026-09-01--local",
  pricingPolicyVersion: 2,
  pricingSnapshot: { policyVersion: 2, version: 2 },
  venueName: "LOCAL_CANARY_VENUE",
  bookingDate: "2026-09-10",
  time: "19:00~21:00",
  teamName: "LOCAL_CANARY_TEAM",
};

function notification(role: string, suffix: string, overrides: Record<string, unknown> = {}): ControlledCanaryNotification {
  const raw = {
    notificationType: "RESERVATION_ASSIGNED",
    templateKey: "RESERVATION_ASSIGNED",
    alimTalkTemplateId: "RESERVATION_APPROVED",
    federationSlug,
    recipientRole: role,
    recipientPhone: `010-0000-00${suffix}`,
    teamName: "LOCAL_CANARY_TEAM",
    payload: {
      reservationId,
      venueName: "LOCAL_CANARY_VENUE",
      bookingDate: "2026-09-10",
      time: "19:00~21:00",
      amount: "140,250",
      accountNumber: "123-456-7890",
    },
    ...overrides,
  };
  return {
    id: `notification-${role}-${suffix}`,
    recipientPhone: String(raw.recipientPhone),
    recipientRole: role,
    templateKey: String(raw.templateKey),
    templateId: String(raw.alimTalkTemplateId),
    federationSlug,
    reservationId,
    raw,
  };
}

function createHarness(options: {
  reservationExists?: boolean;
  reservation?: ControlledCanaryReservationSnapshot | null;
  notifications?: ControlledCanaryNotification[];
  providerFails?: boolean;
  crashAfterFirstProviderCall?: boolean;
  adminRejects?: boolean;
  guardExists?: boolean;
  reservationIdOverride?: string;
} = {}) {
  let now = new Date("2026-09-10T10:00:00.000Z");
  const attempts = new Map<string, Record<string, unknown>>();
  const invocations = new Map<string, { reservationId: string; targets: ControlledCanaryNotification[] }>();
  const guards = new Map<string, string>();
  const writeLog: string[] = [];
  const activeReservationId = options.reservationIdOverride || reservationId;
  const sourceNotifications =
    options.notifications ||
    [notification("chairman", "01"), notification("manager", "02")].map((entry) => ({
      ...entry,
      reservationId: activeReservationId,
      raw: {
        ...entry.raw,
        payload: { ...(entry.raw.payload as Record<string, unknown>), reservationId: activeReservationId },
      },
    }));
  const reservationSnapshot =
    options.reservation === undefined ? defaultReservation : options.reservation;
  const provider = {
    sendAlimTalk: jest.fn(async () =>
      options.providerFails
        ? {
            providerMessageId: null,
            requestId: "failed-request",
            status: "failed" as const,
            error: { code: "NCP_REJECTED", message: "fake provider rejection" },
            provider: "kakao" as const,
            templateCode: "NOWONRESERVATIONNOTICE01",
            dryRun: false,
          }
        : {
            providerMessageId: `accepted-${provider.sendAlimTalk.mock.calls.length}`,
            requestId: `request-${provider.sendAlimTalk.mock.calls.length}`,
            status: "sent" as const,
            provider: "kakao" as const,
            templateCode: "NOWONRESERVATIONNOTICE01",
            dryRun: false,
          }
    ),
  };
  const store: ControlledCanaryStore = {
    reservationExists: async () => options.reservationExists !== false,
    readReservation: async () =>
      options.reservationExists === false ? null : reservationSnapshot,
    readInvocationGuard: async (_federationSlug, _reservationId) => ({
      exists: options.guardExists === true,
      invocationId: options.guardExists ? "existing-invocation" : undefined,
    }),
    findReservationNotifications: async () => sourceNotifications,
    createInvocation: async (input) => {
      writeLog.push("createInvocation");
      const guardKey = `${input.federationSlug}:${input.reservationId}`;
      const existing = guards.get(guardKey);
      if (existing) return { created: false as const, invocationId: existing };
      guards.set(guardKey, input.invocationId);
      invocations.set(input.invocationId, { reservationId: input.reservationId, targets: input.targets });
      input.targets.forEach((target) => {
        attempts.set(`${input.invocationId}:${target.id}`, {
          state: "pending",
          notificationId: target.id,
          role: target.role,
          attemptCount: 0,
        });
      });
      return { created: true as const };
    },
    claimAttempt: async (input) => {
      writeLog.push("claimAttempt");
      const key = `${input.invocationId}:${input.notificationId}`;
      const attempt = attempts.get(key);
      if (!attempt) return { claimed: false as const, state: "missing" };
      if (attempt.state === "attempting") {
        if (Number(attempt.leaseExpiresAt) <= input.now.getTime()) {
          attempt.state = "unknown_outcome";
          return { claimed: false as const, state: "unknown_outcome" };
        }
        return { claimed: false as const, state: "attempting" };
      }
      if (attempt.state !== "pending") return { claimed: false as const, state: String(attempt.state) };
      const attemptId = `attempt-${input.notificationId}`;
      attempt.state = "attempting";
      attempt.attemptId = attemptId;
      attempt.attemptCount = Number(attempt.attemptCount) + 1;
      attempt.leaseExpiresAt = input.now.getTime() + input.leaseDurationMs;
      return { claimed: true as const, attemptId, attemptedAt: input.now };
    },
    completeAttempt: async (input) => {
      writeLog.push("completeAttempt");
      const attempt = attempts.get(`${input.invocationId}:${input.notificationId}`);
      if (!attempt) throw new Error("MISSING_ATTEMPT");
      attempt.state = input.state;
      attempt.providerMessageId = input.result.providerMessageId;
      attempt.requestId = input.result.requestId;
      attempt.deliveryState = "not_confirmed";
    },
    markExpiredAttemptsUnknown: async (input) => {
      writeLog.push("markExpiredAttemptsUnknown");
      let marked = 0;
      for (const [key, attempt] of attempts) {
        if (
          key.startsWith(`${input.invocationId}:`) &&
          attempt.state === "attempting" &&
          Number(attempt.leaseExpiresAt) <= input.now.getTime()
        ) {
          attempt.state = "unknown_outcome";
          marked += 1;
        }
      }
      return marked;
    },
  };
  const request = {
    auth: { uid: "platform-admin", token: { admin: true } },
    data: { federationSlug, reservationId: activeReservationId },
  };
  const deps = {
    store,
    provider,
    runtimeEnv: {
      KAKAO_TEMPLATE_RESERVATION_APPROVED: "NOWONRESERVATIONNOTICE01",
      NCP_ACCESS_KEY: "present",
      NCP_SECRET_KEY: "present",
      NCP_SENS_SERVICE_ID: "ncp:service",
      NCP_KAKAO_PLUS_FRIEND_ID: "@nowonfootball",
    },
    assertPlatformAdmin: jest.fn(async () => {
      if (options.adminRejects) throw Object.assign(new Error("DENIED"), { code: "permission-denied" });
    }),
    now: () => now,
    randomId: () => "invocation-001",
    afterProviderCallBeforeEvidenceWrite: options.crashAfterFirstProviderCall
      ? jest.fn(async () => {
          throw new Error("SIMULATED_CRASH_AFTER_PROVIDER");
        })
      : undefined,
  };
  return {
    deps,
    request,
    provider,
    attempts,
    writeLog,
    advanceLease: () => {
      now = new Date(now.getTime() + 3 * 60 * 1000);
    },
  };
}

async function expectCode(action: () => Promise<unknown>, code: string) {
  await expect(action()).rejects.toMatchObject({ code });
}

describe("reservation-assigned controlled canary core", () => {
  test("selects chairman and manager from chairman + coach + manager without coach send eligibility", () => {
    const result = resolveExactReservationAssignedCanaryTargets({
      federationSlug,
      reservationId,
      templateCode: "NOWONRESERVATIONNOTICE01",
      notifications: [
        notification("chairman", "01"),
        notification("coach", "02"),
        notification("manager", "03"),
      ],
    });

    expect(result.targets.map((target) => target.role)).toEqual(["chairman", "manager"]);
    expect(result.excluded).toEqual([
      {
        role: "coach",
        notificationId: "notification-coach-02",
        reason: "CANARY_SCOPE_EXCLUDED",
      },
    ]);
  });

  test("rejects unauthenticated and non-admin callers before provider access", async () => {
    const unauthenticated = createHarness();
    await expectCode(
      () =>
        executeReservationAssignedControlledCanaryCore(
          { data: { federationSlug, reservationId } },
          unauthenticated.deps
        ),
      "unauthenticated"
    );
    expect(unauthenticated.provider.sendAlimTalk).not.toHaveBeenCalled();

    const nonAdmin = createHarness({ adminRejects: true });
    await expectCode(
      () => executeReservationAssignedControlledCanaryCore(nonAdmin.request, nonAdmin.deps),
      "permission-denied"
    );
    expect(nonAdmin.provider.sendAlimTalk).not.toHaveBeenCalled();
  });

  test("rejects missing reservation and invalid target cardinality without sends", async () => {
    const missing = createHarness({ reservationExists: false, reservation: null });
    await expectCode(
      () => executeReservationAssignedControlledCanaryCore(missing.request, missing.deps),
      "not-found"
    );
    expect(missing.provider.sendAlimTalk).not.toHaveBeenCalled();

    for (const targets of [
      [notification("chairman", "01")],
      [notification("chairman", "01"), notification("manager", "02"), notification("manager", "03")],
    ]) {
      const harness = createHarness({ notifications: targets });
      await expectCode(
        () => executeReservationAssignedControlledCanaryCore(harness.request, harness.deps),
        "failed-precondition"
      );
      expect(harness.provider.sendAlimTalk).not.toHaveBeenCalled();
    }
  });

  test("rejects missing chairman or manager and duplicate roles without sends", async () => {
    const cases: Array<[ControlledCanaryNotification[], string]> = [
      [[notification("chairman", "01"), notification("coach", "02")], "failed-precondition"],
      [[notification("coach", "01"), notification("manager", "02")], "failed-precondition"],
      [[notification("chairman", "01"), notification("chairman", "02")], "failed-precondition"],
      [[notification("manager", "01"), notification("manager", "02")], "failed-precondition"],
      [
        [
          notification("chairman", "01"),
          notification("manager", "02", { templateKey: "OTHER_TEMPLATE" }),
        ],
        "failed-precondition",
      ],
      [
        [
          notification("chairman", "01"),
          notification("manager", "02", { notificationType: "OTHER_TYPE" }),
        ],
        "failed-precondition",
      ],
      [
        [
          notification("chairman", "01"),
          notification("manager", "02", { recipientPhone: "" }),
        ],
        "failed-precondition",
      ],
      [
        [
          notification("chairman", "01"),
          notification("manager", "02", { providerMessageId: "already-accepted" }),
        ],
        "already-exists",
      ],
    ];
    for (const [targets, expectedCode] of cases) {
      const harness = createHarness({ notifications: targets });
      await expectCode(
        () => executeReservationAssignedControlledCanaryCore(harness.request, harness.deps),
        expectedCode
      );
      expect(harness.provider.sendAlimTalk).not.toHaveBeenCalled();
    }
  });

  test("uses payload venueName and rejects root-only venueName", async () => {
    const payloadVenue = createHarness();
    await executeReservationAssignedControlledCanaryCore(payloadVenue.request, payloadVenue.deps);
    expect(payloadVenue.provider.sendAlimTalk).toHaveBeenCalledTimes(2);

    const rootOnlyPayload = {
      reservationId,
      bookingDate: "2026-09-10",
      time: "19:00~21:00",
      amount: "140,250",
      accountNumber: "123-456-7890",
    };
    const rootOnly = createHarness({
      notifications: [
        notification("chairman", "01", {
          venueName: "ROOT_ONLY_VENUE",
          payload: rootOnlyPayload,
        }),
        notification("manager", "02", {
          venueName: "ROOT_ONLY_VENUE",
          payload: rootOnlyPayload,
        }),
      ],
    });
    await expectCode(
      () => executeReservationAssignedControlledCanaryCore(rootOnly.request, rootOnly.deps),
      "failed-precondition"
    );
    expect(rootOnly.provider.sendAlimTalk).not.toHaveBeenCalled();
  });

  test("snapshots exactly chairman and manager from 3-role queue, then performs exactly two provider attempts", async () => {
    const harness = createHarness({
      notifications: [
        notification("chairman", "01"),
        notification("coach", "02"),
        notification("manager", "03"),
      ],
    });
    const result = await executeReservationAssignedControlledCanaryCore(harness.request, harness.deps);

    expect(result.dryRun).toBe(false);
    if (result.dryRun) throw new Error("expected live result");
    expect(result.targetCount).toBe(2);
    expect(result.states).toEqual([
      expect.objectContaining({ role: "chairman", state: "provider_accepted" }),
      expect.objectContaining({ role: "manager", state: "provider_accepted" }),
    ]);
    expect(harness.provider.sendAlimTalk).toHaveBeenCalledTimes(2);
    expect(harness.provider.sendAlimTalk.mock.calls.every((call) => call[0].recipientPhone.startsWith("010"))).toBe(
      true
    );
    expect(
      harness.provider.sendAlimTalk.mock.calls.some((call) => String(call[0].recipientPhone).includes("002"))
    ).toBe(false);
  });

  test("dryRun performs read/validate/render only with zero provider calls and zero writes", async () => {
    const harness = createHarness({
      notifications: [
        notification("chairman", "01"),
        notification("coach", "02"),
        notification("manager", "03"),
      ],
    });
    const result = await executeReservationAssignedControlledCanaryCore(
      { ...harness.request, data: { ...harness.request.data, dryRun: true } },
      harness.deps
    );

    expect(result.dryRun).toBe(true);
    if (!result.dryRun) throw new Error("expected dry-run result");
    expect(result.recipientCount).toBe(2);
    expect(result.rolesSelected).toEqual(["chairman", "manager"]);
    expect(result.excludedRoles).toEqual([
      {
        role: "coach",
        notificationId: "notification-coach-02",
        reason: "CANARY_SCOPE_EXCLUDED",
      },
    ]);
    expect(result.venueName).toBe("LOCAL_CANARY_VENUE");
    expect(result.amount).toBe("140,250");
    expect(result.pricingStatus).toBe("QUOTED");
    expect(result.recipients.every((recipient) => recipient.phoneSha256.length === 64)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/010-/);
    expect(harness.provider.sendAlimTalk).not.toHaveBeenCalled();
    expect(harness.writeLog).toEqual([]);
  });

  test("dryRun rejects non-QUOTED pricing and historical forbidden reservations", async () => {
    const reviewRequired = createHarness({
      reservation: {
        ...defaultReservation,
        pricingStatus: "REVIEW_REQUIRED",
      },
    });
    await expectCode(
      () =>
        executeReservationAssignedControlledCanaryCore(
          { ...reviewRequired.request, data: { ...reviewRequired.request.data, dryRun: true } },
          reviewRequired.deps
        ),
      "failed-precondition"
    );

    const frozen = createHarness({
      reservationIdOverride: "slot_nowon-suraksan_2026-09-04_1000",
      reservation: {
        ...defaultReservation,
        bookingDate: "2026-09-04",
      },
    });
    await expectCode(
      () =>
        executeReservationAssignedControlledCanaryCore(
          {
            ...frozen.request,
            data: { ...frozen.request.data, reservationId: "slot_nowon-suraksan_2026-09-04_1000", dryRun: true },
          },
          frozen.deps
        ),
      "failed-precondition"
    );

    expect(() =>
      assertReservationEligibleForCanary({
        reservationId: "slot_nowon-suraksan_2026-09-03_1000",
        bookingDate: "2026-09-03",
      })
    ).toThrow();
  });

  test("persists explicit provider failures without retrying", async () => {
    const harness = createHarness({ providerFails: true });
    const result = await executeReservationAssignedControlledCanaryCore(harness.request, harness.deps);
    expect(result.dryRun).toBe(false);
    if (result.dryRun) throw new Error("expected live result");
    expect(result.states.every((state) => state.state === "explicit_failed")).toBe(true);
    expect(harness.provider.sendAlimTalk).toHaveBeenCalledTimes(2);
  });

  test("crash after provider leaves an attempt for unknown-outcome reconciliation and replay sends zero", async () => {
    const harness = createHarness({ crashAfterFirstProviderCall: true });
    await expect(
      executeReservationAssignedControlledCanaryCore(harness.request, harness.deps)
    ).rejects.toThrow("SIMULATED_CRASH_AFTER_PROVIDER");
    expect(harness.provider.sendAlimTalk).toHaveBeenCalledTimes(1);

    harness.advanceLease();
    await expectCode(
      () => executeReservationAssignedControlledCanaryCore(harness.request, harness.deps),
      "already-exists"
    );
    expect(harness.provider.sendAlimTalk).toHaveBeenCalledTimes(1);
    expect([...harness.attempts.values()].some((attempt) => attempt.state === "unknown_outcome")).toBe(true);
  });

  test("second invocation for the same reservation is guarded before provider access", async () => {
    const harness = createHarness();
    await executeReservationAssignedControlledCanaryCore(harness.request, harness.deps);
    await expectCode(
      () => executeReservationAssignedControlledCanaryCore(harness.request, harness.deps),
      "already-exists"
    );
    expect(harness.provider.sendAlimTalk).toHaveBeenCalledTimes(2);
  });

  test("dryRun exposes all six canonical template variables", async () => {
    const harness = createHarness({
      notifications: [
        notification("chairman", "01"),
        notification("coach", "02"),
        notification("manager", "03"),
      ],
    });
    const chairman = notification("chairman", "01");
    const variables = buildCanonicalReservationAssignedTemplateVariables({
      raw: chairman.raw,
    });
    expect(Object.keys(variables).sort()).toEqual(
      [...CANONICAL_RESERVATION_ASSIGNED_TEMPLATE_VARIABLE_NAMES].sort()
    );
    for (const key of CANONICAL_RESERVATION_ASSIGNED_TEMPLATE_VARIABLE_NAMES) {
      expect(String(variables[key]).length).toBeGreaterThan(0);
    }

    const result = await executeReservationAssignedControlledCanaryCore(
      { ...harness.request, data: { ...harness.request.data, dryRun: true } },
      harness.deps
    );
    expect(result.dryRun).toBe(true);
    if (!result.dryRun) throw new Error("expected dry-run result");
    expect(result.renderedVariableNames).toEqual([
      ...CANONICAL_RESERVATION_ASSIGNED_TEMPLATE_VARIABLE_NAMES,
    ]);
  });

  test("live path passes exact six templateVariables to sendAlimTalk", async () => {
    const harness = createHarness({
      notifications: [
        notification("chairman", "01"),
        notification("coach", "02"),
        notification("manager", "03"),
      ],
    });
    await executeReservationAssignedControlledCanaryCore(harness.request, harness.deps);

    expect(harness.provider.sendAlimTalk).toHaveBeenCalledTimes(2);
    for (const call of harness.provider.sendAlimTalk.mock.calls) {
      const input = call[0];
      expect(Object.keys(input.templateVariables).sort()).toEqual(
        [...CANONICAL_RESERVATION_ASSIGNED_TEMPLATE_VARIABLE_NAMES].sort()
      );
      for (const key of CANONICAL_RESERVATION_ASSIGNED_TEMPLATE_VARIABLE_NAMES) {
        expect(String(input.templateVariables[key]).length).toBeGreaterThan(0);
      }
      expect(String(input.content || "").length).toBeGreaterThan(0);
    }
  });

  test("adapter validation rejects empty templateVariables and missing required fields", () => {
    expect(
      validateNcpTemplateInput({
        templateId: "RESERVATION_APPROVED",
        templateVariables: {},
        content: "pre-rendered-content",
      })
    ).toBe("MISSING_TEMPLATE_VARIABLES:teamName,venueName,date,time,amount,accountNumber");

    expect(
      validateNcpTemplateInput({
        templateId: "RESERVATION_APPROVED",
        templateVariables: {
          venueName: "LOCAL_CANARY_VENUE",
          date: "2026-09-10",
          time: "19:00~21:00",
          amount: "140,250",
          accountNumber: "123-456-7890",
        },
        content: "pre-rendered-content",
      })
    ).toBe("MISSING_TEMPLATE_VARIABLES:teamName");

    expect(
      validateNcpTemplateInput({
        templateId: "RESERVATION_APPROVED",
        templateVariables: {
          teamName: "LOCAL_CANARY_TEAM",
          date: "2026-09-10",
          time: "19:00~21:00",
          amount: "140,250",
          accountNumber: "123-456-7890",
        },
        content: "pre-rendered-content",
      })
    ).toBe("MISSING_TEMPLATE_VARIABLES:venueName");

    expect(
      validateNcpTemplateInput({
        templateId: "RESERVATION_APPROVED",
        templateVariables: {
          teamName: "LOCAL_CANARY_TEAM",
          venueName: "LOCAL_CANARY_VENUE",
          date: "2026-09-10",
          time: "19:00~21:00",
          accountNumber: "123-456-7890",
        },
        content: "pre-rendered-content",
      })
    ).toBe("MISSING_TEMPLATE_VARIABLES:amount");
  });

  test("dryRun and live share the same rendered content fingerprint", async () => {
    const chairman = notification("chairman", "01");
    const dryRendered = renderCanonicalReservationAssignedTemplate(
      { raw: chairman.raw },
      "NOWONRESERVATIONNOTICE01"
    );

    const harness = createHarness({
      notifications: [
        notification("chairman", "01"),
        notification("coach", "02"),
        notification("manager", "03"),
      ],
    });
    await executeReservationAssignedControlledCanaryCore(harness.request, harness.deps);

    const liveChairmanCall = harness.provider.sendAlimTalk.mock.calls[0][0];
    expect(liveChairmanCall.content).toBe(dryRendered.content);
    expect(liveChairmanCall.templateVariables).toEqual(dryRendered.templateVariables);
  });

  test("blocks consumed 2026-09-07 candidate without provider access", async () => {
    const consumed = createHarness({
      reservationIdOverride: "slot_nowon-suraksan_2026-09-07_1000",
      reservation: {
        ...defaultReservation,
        bookingDate: "2026-09-07",
      },
    });
    await expectCode(
      () =>
        executeReservationAssignedControlledCanaryCore(
          {
            ...consumed.request,
            data: {
              ...consumed.request.data,
              reservationId: "slot_nowon-suraksan_2026-09-07_1000",
              dryRun: true,
            },
          },
          consumed.deps
        ),
      "failed-precondition"
    );
    expect(consumed.provider.sendAlimTalk).not.toHaveBeenCalled();
  });
});
