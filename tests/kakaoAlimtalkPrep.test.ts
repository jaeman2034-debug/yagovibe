/**
 * PR4 Sprint B prep — Kakao AlimTalk unit tests (no network).
 */

import {
  ALIMTALK_TEMPLATE_REGISTRY,
  listAlimTalkTemplates,
  resolveTemplateCodeFromEnv,
} from "@/lib/notifications/alimtalkTemplates";
import {
  emptyKakaoEnvPlaceholders,
  getKakaoAlimTalkConfigStatus,
  buildKakaoAuditFields,
} from "@/lib/notifications/kakaoAlimTalkConfig";
import {
  KakaoAlimTalkProviderStub,
  sendAlimTalk,
} from "@/lib/notifications/kakaoAlimTalkProvider";
import {
  createNotificationProviderFactory,
  resolveNotificationProviderMode,
  resolveOutboundProvider,
  resetNotificationProviderFactoryForTests,
} from "@/lib/notifications/notificationProviderFactory";

describe("PR4 Sprint B Kakao AlimTalk prep", () => {
  beforeEach(() => {
    resetNotificationProviderFactoryForTests();
  });

  test("template registry has 4 templates with PENDING codes", () => {
    const list = listAlimTalkTemplates();
    expect(list).toHaveLength(4);
    expect(ALIMTALK_TEMPLATE_REGISTRY.RESERVATION_COMPLETE.templateCode).toBe(
      "PENDING"
    );
    expect(ALIMTALK_TEMPLATE_REGISTRY.PAYMENT_REQUEST.placeholders).toEqual(
      expect.arrayContaining(["price", "deadline", "link"])
    );
    expect(ALIMTALK_TEMPLATE_REGISTRY.AI_REPORT_READY.templateName).toBe(
      "AI분석완료"
    );
    for (const t of list) {
      expect(resolveTemplateCodeFromEnv(t.id, {})).toBe("PENDING");
    }
  });

  test("placeholder env keys are empty by default", () => {
    const ph = emptyKakaoEnvPlaceholders();
    expect(ph.KAKAO_CHANNEL_ID).toBe("");
    expect(ph.KAKAO_SENDER_KEY).toBe("");
    expect(ph.KAKAO_API_KEY).toBe("");
    expect(ph.KAKAO_TEMPLATE_RESERVATION).toBe("");
    expect(ph.NOTIFICATION_PROVIDER).toBe("auto");
  });

  test("config status is Pending without secrets", () => {
    const status = getKakaoAlimTalkConfigStatus(emptyKakaoEnvPlaceholders());
    expect(status.approvalStatus).toBe("Pending");
    expect(status.hasSenderKey).toBe(false);
    expect(status.pendingTemplateCount).toBe(4);
  });

  test("Factory auto → sms when Kakao not ready", () => {
    const bundle = createNotificationProviderFactory({
      NOTIFICATION_PROVIDER: "auto",
      KAKAO_ALIMTALK_ENABLED: "",
      KAKAO_SENDER_KEY: "",
    });
    expect(bundle.mode).toBe("auto");
    expect(bundle.resolved).toBe("sms");
  });

  test("Factory auto → kakao when enabled + SenderKey", () => {
    const status = getKakaoAlimTalkConfigStatus({
      KAKAO_ALIMTALK_ENABLED: "true",
      KAKAO_SENDER_KEY: "test-sender",
      KAKAO_CHANNEL_ID: "ch",
      KAKAO_API_KEY: "key",
    });
    expect(resolveOutboundProvider("auto", status)).toBe("kakao");
    expect(resolveNotificationProviderMode("kakao")).toBe("kakao");
    expect(resolveNotificationProviderMode("sms")).toBe("sms");
  });

  test("Provider Stub returns status=queued", async () => {
    const stub = new KakaoAlimTalkProviderStub();
    const res = await stub.sendAlimTalk({
      recipientPhone: "01012345678",
      templateId: "RESERVATION_COMPLETE",
      templateCode: "PENDING",
      templateVariables: {
        venue: "수락산",
        date: "2026-08-01",
        time: "18:00~20:00",
        team: "TEST FC",
        link: "https://yago-vibe.com",
      },
    });
    expect(res.status).toBe("queued");
    expect(res.dryRun).toBe(true);
    expect(res.provider).toBe("kakao");
    expect(res.providerMessageId).toMatch(/^kakao_stub_/);
    expect(res.templateCode).toBe("PENDING");
  });

  test("sendAlimTalk helper uses stub", async () => {
    const res = await sendAlimTalk({
      recipientPhone: "01099998888",
      templateVariables: { contact: "노원구축구협회" },
      templateId: "RESERVATION_CANCELLED",
    });
    expect(res.status).toBe("queued");
  });

  test("audit fields keep provider kakao", () => {
    const audit = buildKakaoAuditFields({
      templateCode: "PENDING",
      providerMessageId: "kakao_stub_1",
      senderKeyPresent: false,
    });
    expect(audit.provider).toBe("kakao");
    expect(audit.templateCode).toBe("PENDING");
    expect(audit.senderKey).toBe("[PENDING]");
    expect(audit.providerMessageId).toBe("kakao_stub_1");
  });
});
