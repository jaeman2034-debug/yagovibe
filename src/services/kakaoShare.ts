import { initKakao } from "@/lib/kakaoAuth";
import { buildTeamInviteShareMessage } from "@/lib/team/buildTeamInviteShareMessage";
import {
  buildExternalUrl,
  teamInviteAbsoluteUrlForKakaoShare,
  teamInviteKakaoFeedImageUrl,
} from "@/lib/growth/teamInviteShare";

declare global {
  interface Window {
    Kakao: any;
  }
}

type KakaoReadyFailure = "no_sdk" | "no_key" | "not_initialized";

async function getKakaoTeamShareReadiness(): Promise<{ ok: true } | { ok: false; reason: KakaoReadyFailure }> {
  await initKakao();
  if (typeof window === "undefined" || !window.Kakao) {
    return { ok: false, reason: "no_sdk" };
  }
  const key = (import.meta.env.VITE_KAKAO_JS_KEY as string | undefined)?.trim();
  if (!key) {
    return { ok: false, reason: "no_key" };
  }
  if (!window.Kakao.isInitialized?.()) {
    return { ok: false, reason: "not_initialized" };
  }
  return { ok: true };
}

function describeKakaoTeamShareBlock(reason: KakaoReadyFailure): string {
  switch (reason) {
    case "no_sdk":
      return "카카오톡 공유용 SDK를 불러오지 못했습니다. 인터넷 연결, 광고·추적 차단, VPN을 확인해 주세요.";
    case "no_key":
      return "카카오톡 공유는 빌드에 JavaScript 앱 키(VITE_KAKAO_JS_KEY)가 있어야 합니다. 아래 「링크 복사」로 초대 링크를 보내 주세요.";
    case "not_initialized":
      return "카카오 SDK가 초기화되지 않았습니다. 카카오 개발자 콘솔에서 이 사이트 주소(웹 도메인)를 플랫폼에 등록했는지 확인해 주세요. 당장은 「링크 복사」로 공유할 수 있어요.";
    default:
      return "카카오톡 공유를 사용할 수 없습니다. 「링크 복사」로 초대 링크를 보내 주세요.";
  }
}

export async function shareFederationInviteViaKakao(input: {
  link: string;
  federationName: string;
  imageUrl?: string;
}) {
  await initKakao();
  if (typeof window === "undefined" || !window.Kakao || !window.Kakao.isInitialized?.()) {
    throw new Error(
      "카카오 SDK가 준비되지 않았습니다. 네트워크·애드블록을 확인하고, 카카오 개발자 콘솔에 이 사이트 도메인을 등록했는지 확인해 주세요."
    );
  }

  const link = input.link;
  const title = `${input.federationName} 관리자 초대`;
  const description = "관리자로 초대되었습니다. 아래 링크를 눌러 참여하세요.";
  const imageUrl = input.imageUrl || buildExternalUrl("/icons/icon-maskable-512.png");

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl,
      link: {
        mobileWebUrl: link,
        webUrl: link,
      },
    },
    buttons: [
      {
        title: "참여하기",
        link: {
          mobileWebUrl: link,
          webUrl: link,
        },
      },
    ],
  });
}

/** 팀 초대 링크 (/invite/:id) — Kakao Talk 공유 */
export async function shareTeamInviteViaKakao(input: {
  inviteLink: string;
  teamName: string;
  teamIntro?: string | null;
  imageUrl?: string;
}) {
  const ready = await getKakaoTeamShareReadiness();
  if (!ready.ok) {
    throw new Error(describeKakaoTeamShareBlock(ready.reason));
  }
  /** 카카오 카드·버튼 클릭 URL — 콘솔에 `inviteUrl` 직접 입력하면 ReferenceError 남(함수 스코프). 버튼 클릭 시 아래 로그로 확인 */
  const inviteUrl = teamInviteAbsoluteUrlForKakaoShare(input.inviteLink);
  const title = `⚽ ${(input.teamName || "팀").trim() || "팀"} 팀 초대`;
  const intro = (input.teamIntro ?? "").trim().replace(/\s+/g, " ");
  const description =
    intro.length > 0
      ? `${intro.slice(0, 160)}${intro.length > 160 ? "…" : ""}\n링크에서 가입 요청을 진행해 주세요.`
      : "함께 활동할 팀원을 모집합니다. 링크에서 가입 요청을 해 주세요.";
  const imageUrl = teamInviteKakaoFeedImageUrl(input.imageUrl ?? null);

  console.log("🔥 최종 카카오 URL:", inviteUrl);

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl,
      link: {
        mobileWebUrl: inviteUrl,
        webUrl: inviteUrl,
      },
    },
    buttons: [
      {
        title: "가입 요청하기",
        link: {
          mobileWebUrl: inviteUrl,
          webUrl: inviteUrl,
        },
      },
    ],
  });
}

export type TeamInviteShareChannel = "kakao" | "web_share" | "cancelled";

/**
 * 카카오 공유 → 실패 시 모바일 Web Share API (카카오 앱·문자 등 선택)
 */
export async function shareTeamInviteKakaoOrWebShare(input: {
  inviteLink: string;
  teamName: string;
  teamIntro?: string | null;
  imageUrl?: string;
}): Promise<{ channel: TeamInviteShareChannel }> {
  /** 배포/캐시 분기: 이 로그가 없으면 구버전 번들이거나 이 함수를 안 탄 것 */
  console.log("✅ 팀 초대 카카오 버튼 클릭", input.inviteLink);
  try {
    await shareTeamInviteViaKakao(input);
    return { channel: "kakao" };
  } catch {
    const inviteUrl = teamInviteAbsoluteUrlForKakaoShare(input.inviteLink);
    console.log("🔥 최종 카카오 URL (Web Share 폴백):", inviteUrl);
    const body = buildTeamInviteShareMessage({
      teamName: input.teamName,
      teamIntro: input.teamIntro,
      inviteLink: inviteUrl,
    });
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${(input.teamName || "팀").trim() || "팀"} 팀 초대`,
          text: body,
          url: inviteUrl,
        });
        return { channel: "web_share" };
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") {
          return { channel: "cancelled" };
        }
      }
    }
    throw new Error(
      "카카오톡 공유와 기기 공유를 모두 쓸 수 없었어요. 아래 「링크 복사」 또는 「공유 문구 복사」로 보내 주세요."
    );
  }
}

export async function shareOverdueReceivablesViaKakao(input: {
  federationId: string;
  federationName?: string;
  count: number;
  totalRemaining: number;
}) {
  await initKakao();
  if (typeof window === "undefined" || !window.Kakao || !window.Kakao.isInitialized?.()) {
    throw new Error(
      "카카오 SDK가 준비되지 않았습니다. 네트워크·애드블록을 확인하고, 카카오 개발자 콘솔에 이 사이트 도메인을 등록했는지 확인해 주세요."
    );
  }
  const origin = window.location.origin;
  const shareUrl = `${origin}/share/overdue?fedId=${encodeURIComponent(input.federationId)}`;
  const imageUrl = `${origin}/share/overdue/image?fedId=${encodeURIComponent(input.federationId)}&count=${Math.max(
    0,
    Math.floor(input.count)
  )}&total=${Math.max(0, Math.floor(input.totalRemaining))}&t=${Date.now()}`;
  const title = `⚠️ 미수금 ${Math.max(0, Math.floor(input.count))}건`;
  const description = `총 ${Math.max(0, Math.floor(input.totalRemaining)).toLocaleString("ko-KR")}원 미납`;

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl,
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
    buttons: [
      {
        title: "지금 확인하기",
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
  });
}

export type PublicTeamHubShareChannel = "kakao" | "web_share" | "clipboard" | "cancelled";

/** 공개 팀 허브 URL(`/team/:id/public`) — 카카오·공유·복사 */
export async function sharePublicTeamHubKakaoOrWebShare(input: {
  teamId: string;
  teamName: string;
  blurb?: string | null;
  imageUrl?: string | null;
}): Promise<{ channel: PublicTeamHubShareChannel }> {
  const tid = input.teamId.trim();
  if (!tid) throw new Error("teamId가 필요합니다.");

  const pageUrl = buildExternalUrl(`/team/${encodeURIComponent(tid)}/public`);
  const title = `${(input.teamName || "팀").trim() || "팀"} — 함께해요`;
  const blurb = (input.blurb ?? "").trim().replace(/\s+/g, " ");
  const description =
    blurb.length > 0
      ? `${blurb.slice(0, 180)}${blurb.length > 180 ? "…" : ""}\n아래 링크에서 팀 소개와 일정을 확인해 보세요.`
      : "팀 소개와 일정을 확인하고, 가입·문의를 남겨 주세요.";
  const imageUrl = teamInviteKakaoFeedImageUrl(input.imageUrl ?? null);

  const ready = await getKakaoTeamShareReadiness();
  if (ready.ok && typeof window !== "undefined" && window.Kakao?.Share?.sendDefault) {
    try {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title,
          description,
          imageUrl,
          link: {
            mobileWebUrl: pageUrl,
            webUrl: pageUrl,
          },
        },
        buttons: [
          {
            title: "팀 페이지 열기",
            link: {
              mobileWebUrl: pageUrl,
              webUrl: pageUrl,
            },
          },
        ],
      });
      return { channel: "kakao" };
    } catch {
      /* fall through */
    }
  }

  const shareBody = `${title}\n\n${description}\n\n${pageUrl}`;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title,
        text: shareBody,
        url: pageUrl,
      });
      return { channel: "web_share" };
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        return { channel: "cancelled" };
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareBody);
    return { channel: "clipboard" };
  }

  throw new Error(
    !ready.ok
      ? describeKakaoTeamShareBlock(ready.reason)
      : "이 환경에서는 공유·복사를 모두 쓸 수 없었어요. 주소창 링크를 복사해 카카오톡으로 보내 주세요."
  );
}

export type ParentGrowthReportShareChannel = "kakao" | "web_share" | "clipboard" | "cancelled";

/** 학부모 성장 리포트 공유 URL — 카카오 · Web Share · 클립보드 폴백 */
export async function shareParentGrowthReportKakaoOrWebShare(input: {
  shareUrl: string;
  title: string;
  description: string;
  clipText: string;
}): Promise<{ channel: ParentGrowthReportShareChannel }> {
  const pageUrl = input.shareUrl.trim();
  if (!pageUrl) throw new Error("공유 링크가 없습니다.");

  const title = input.title.trim() || "성장 리포트";
  const description = input.description.trim() || "코치가 확인한 이번 훈련 성장 리포트입니다.";
  const imageUrl = teamInviteKakaoFeedImageUrl(null);

  const ready = await getKakaoTeamShareReadiness();
  if (ready.ok && typeof window !== "undefined" && window.Kakao?.Share?.sendDefault) {
    try {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title,
          description,
          imageUrl,
          link: {
            mobileWebUrl: pageUrl,
            webUrl: pageUrl,
          },
        },
        buttons: [
          {
            title: "리포트 보기",
            link: {
              mobileWebUrl: pageUrl,
              webUrl: pageUrl,
            },
          },
        ],
      });
      return { channel: "kakao" };
    } catch {
      /* fall through */
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title,
        text: input.clipText.trim() || `${title}\n\n${description}\n\n${pageUrl}`,
        url: pageUrl,
      });
      return { channel: "web_share" };
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        return { channel: "cancelled" };
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(
      input.clipText.trim() || `${title}\n\n${description}\n\n${pageUrl}`
    );
    return { channel: "clipboard" };
  }

  throw new Error(
    !ready.ok
      ? describeKakaoTeamShareBlock(ready.reason)
      : "카카오톡 공유와 기기 공유를 모두 쓸 수 없었어요. 「전달 문구 복사」로 보내 주세요."
  );
}
