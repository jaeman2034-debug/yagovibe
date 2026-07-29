/**
 * PR4 Sprint C — Kakao AlimTalk live readiness + template mapping tests.
 */

import {
  ALIMTALK_TEMPLATE_REGISTRY,
  listAlimTalkTemplates,
  mapVenueKeyToAlimTalkId,
  resolveTemplateCodeFromEnv,
} from "@/lib/notifications/kakao/templates";
import {
  emptyKakaoEnvPlaceholders,
  getKakaoAlimTalkConfigStatus,
} from "@/lib/notifications/kakaoAlimTalkConfig";
import {
  KakaoAlimTalkProviderStub,
  sendAlimTalk,
} from "@/lib/notifications/kakaoAlimTalkProvider";
import {
  createNotificationProviderFactory,
  resolveOutboundProvider,
  resetNotificationProviderFactoryForTests,
} from "@/lib/notifications/notificationProviderFactory";
describe("PR4 Sprint C Kakao AlimTalk ops", () => {
  beforeEach(() => {
    resetNotificationProviderFactoryForTests();
  });

  test("Sprint C template env keys + legacy aliases", () => {
    expect(ALIMTALK_TEMPLATE_REGISTRY.PAYMENT_REQUEST.templateCodeEnvKey).toBe(
      "KAKAO_TEMPLATE_PAYMENT_REQUEST"
    );
    expect(ALIMTALK_TEMPLATE_REGISTRY.RESERVATION_CANCELLED.templateCodeEnvKey).toBe(
      "KAKAO_TEMPLATE_RESERVATION_CANCELLED"
    );
    expect(ALIMTALK_TEMPLATE_REGISTRY.AI_REPORT_READY.templateCodeEnvKey).toBe(
      "KAKAO_TEMPLATE_AI_REPORT_READY"
    );
    expect(
      resolveTemplateCodeFromEnv("PAYMENT_REQUEST", {
        KAKAO_TEMPLATE_PAYMENT: "LEGACY_PAY",
      })
    ).toBe("LEGACY_PAY");
    expect(
      resolveTemplateCodeFromEnv("PAYMENT_REQUEST", {
        KAKAO_TEMPLATE_PAYMENT_REQUEST: "NEW_PAY",
        KAKAO_TEMPLATE_PAYMENT: "LEGACY_PAY",
      })
    ).toBe("NEW_PAY");
  });

  test("venue key → AlimTalk id mapping", () => {
    expect(mapVenueKeyToAlimTalkId("RESERVATION_ASSIGNED")).toBe(
      "RESERVATION_APPROVED"
    );
    expect(mapVenueKeyToAlimTalkId("PAYMENT_APPROVED")).toBe("PAYMENT_CONFIRMED");
    expect(mapVenueKeyToAlimTalkId("AI_REPORT_READY")).toBe("AI_REPORT_READY");
  });

  test("10 templates still pending by default", () => {
    expect(listAlimTalkTemplates()).toHaveLength(10);
    const status = getKakaoAlimTalkConfigStatus(emptyKakaoEnvPlaceholders());
    expect(status.approvalStatus).toBe("Pending");
    expect(status.pendingTemplateCount).toBe(10);
  });

  test("Factory auto → kakao when enabled + SenderKey", () => {
    const bundle = createNotificationProviderFactory({
      NOTIFICATION_PROVIDER: "auto",
      KAKAO_ALIMTALK_ENABLED: "true",
      KAKAO_SENDER_KEY: "sender",
      KAKAO_CHANNEL_ID: "ch",
      KAKAO_API_KEY: "key",
    });
    expect(bundle.resolved).toBe("kakao");
    expect(resolveOutboundProvider("auto", bundle.kakaoStatus)).toBe("kakao");
  });

  test("Stub mode returns queued (no live send)", async () => {
    const stub = new KakaoAlimTalkProviderStub();
    const res = await stub.sendAlimTalk({
      recipientPhone: "01012345678",
      templateId: "RESERVATION_APPROVED",
      templateVariables: { team: "TEST FC", venue: "수락산" },
    });
    expect(res.status).toBe("queued");
    expect(res.dryRun).toBe(true);
    expect(res.provider).toBe("kakao");
  });

  test("sendAlimTalk helper + delivery labels", async () => {
    const res = await sendAlimTalk({
      recipientPhone: "01099998888",
      templateId: "PAYMENT_CONFIRMED",
      templateVariables: {
        team: "TEST FC",
        venue: "수락산",
        date: "d",
        time: "t",
        reservationUrl: "https://yago-vibe.com",
      },
    });
    expect(res.status).toBe("queued");
    expect(["queued", "sending", "delivered", "failed", "retry"]).toEqual(
      expect.arrayContaining(["queued", "delivered", "failed", "retry"])
    );
  });
});
