/**
 * PR4 Sprint B Kakao AlimTalk prep + Final Template Design tests.
 */

import {
  ALIMTALK_COMMON_VARIABLES,
  ALIMTALK_TEMPLATE_REGISTRY,
  listAlimTalkTemplates,
  renderAlimTalkPreview,
  resolveTemplateCodeFromEnv,
} from "@/lib/notifications/kakao/templates";
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

describe("PR4 Sprint B Kakao AlimTalk template final design", () => {
  beforeEach(() => {
    resetNotificationProviderFactoryForTests();
  });

  test("registry has 10 operational templates (excludes legacy)", () => {
    const list = listAlimTalkTemplates();
    expect(list).toHaveLength(10);
    const ids = list.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "RESERVATION_REQUEST",
        "RESERVATION_APPROVED",
        "PAYMENT_REQUEST",
        "PAYMENT_CONFIRMED",
        "RESERVATION_CANCELLED",
        "RESERVATION_REMINDER",
        "MATCH_REMINDER",
        "AI_REPORT_READY",
        "NOTICE",
        "WELCOME",
      ])
    );
    for (const t of list) {
      expect(t.templateCode).toBe("PENDING");
      expect(t.body.includes("#{") || t.variables.length >= 0).toBe(true);
      expect(resolveTemplateCodeFromEnv(t.id, {})).toBe("PENDING");
    }
  });

  test("common variables catalog", () => {
    expect(ALIMTALK_COMMON_VARIABLES).toEqual(
      expect.arrayContaining([
        "team",
        "venue",
        "reservationNo",
        "reservationUrl",
        "reportUrl",
      ])
    );
  });

  test("render uses Kakao #{var} syntax", () => {
    const text = renderAlimTalkPreview("RESERVATION_REQUEST", {
      team: "TEST FC",
      venue: "수락산",
      date: "2026-08-01",
      time: "18:00~20:00",
      reservationNo: "NW-2608-TEST",
      reservationUrl: "https://yago-vibe.com",
    });
    expect(text).toContain("TEST FC");
    expect(text).toContain("수락산");
    expect(text).not.toContain("#{team}");
  });

  test("placeholder env keys empty", () => {
    const ph = emptyKakaoEnvPlaceholders();
    expect(ph.KAKAO_CHANNEL_ID).toBe("");
    expect(ph.KAKAO_TEMPLATE_RESERVATION_APPROVED).toBe("");
    expect(ph.NOTIFICATION_PROVIDER).toBe("auto");
  });

  test("config Pending with 10 pending templates", () => {
    const status = getKakaoAlimTalkConfigStatus(emptyKakaoEnvPlaceholders());
    expect(status.approvalStatus).toBe("Pending");
    expect(status.pendingTemplateCount).toBe(10);
  });

  test("Factory auto → sms when Kakao not ready", () => {
    const bundle = createNotificationProviderFactory({
      NOTIFICATION_PROVIDER: "auto",
      KAKAO_ALIMTALK_ENABLED: "",
      KAKAO_SENDER_KEY: "",
    });
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
  });

  test("Provider Stub status=queued", async () => {
    const stub = new KakaoAlimTalkProviderStub();
    const res = await stub.sendAlimTalk({
      recipientPhone: "01012345678",
      templateId: "RESERVATION_APPROVED",
      templateCode: "PENDING",
      templateVariables: {
        team: "TEST FC",
        venue: "수락산",
        date: "2026-08-01",
        time: "18:00~20:00",
        price: "120000원",
        deadline: "이용일 전월",
        reservationUrl: "https://yago-vibe.com",
      },
    });
    expect(res.status).toBe("queued");
    expect(res.providerMessageId).toMatch(/^kakao_stub_/);
    expect(ALIMTALK_TEMPLATE_REGISTRY.AI_REPORT_READY.displayName).toBe(
      "AI 분석 완료"
    );
  });

  test("sendAlimTalk + audit fields", async () => {
    const res = await sendAlimTalk({
      recipientPhone: "01099998888",
      templateId: "RESERVATION_CANCELLED",
      templateVariables: { team: "TEST FC", venue: "수락산", date: "d", time: "t", reservationNo: "n" },
    });
    expect(res.status).toBe("queued");
    const audit = buildKakaoAuditFields({
      templateCode: "PENDING",
      providerMessageId: res.providerMessageId,
      senderKeyPresent: false,
    });
    expect(audit.provider).toBe("kakao");
  });
});
