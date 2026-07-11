/**
 * 외부 브라우저로 강제 리디렉션 유틸리티
 *
 * P1 (E2 HOLD): Intent 실패 시 /home 으로 deep link를 버리지 않는다.
 * 실패 시 현재 페이지에 머물러 CTA로 재시도할 수 있게 한다.
 *
 * PAI-001 (BETA-ISSUE-001): iOS 카카오 인앱은 동일 URL location.href만으로는
 * Safari로 나가지 못하는 경우가 많아, 카카오 openExternal 스킴을 우선 시도한다.
 * (자동 bounce/동일 URL 리로드 금지 — CTA·명시적 호출에서만 사용)
 */

function openChromeIntent(url: string, fallbackDelay: number = 1000): void {
  try {
    const urlWithoutProtocol = url.replace(/^https?:\/\//, "");
    // Deep link 보존 — /home 폴백 금지 (E2-PV-003/004 VOC)
    const fallbackUrl = url;

    // Android Chrome Intent 표준: #Intent;...;end (/?Intent 오타 금지)
    const intentUrl =
      `intent://${urlWithoutProtocol}#Intent;scheme=https;package=com.android.chrome;` +
      `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;

    console.log("🚨 [openExternalBrowser] Android Chrome Intent (#Intent, fallback=current URL):", {
      intentUrl,
      fallbackUrl,
    });

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.src = intentUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      try {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      } catch (e) {
        console.warn("⚠️ [openExternalBrowser] iframe 제거 중 오류 (무시 가능):", e);
      }
      // Intent 실패 시 /home·동일 URL 강제 리로드 금지 — 인앱에 남아 CTA 사용
      console.warn(
        "⚠️ [openExternalBrowser] Intent 시도 종료 — 페이지 유지 (deep link 보존, bounce 방지)"
      );
    }, fallbackDelay);
  } catch (e) {
    console.error("❌ [openExternalBrowser] iframe Intent 스킴 오류:", e);
  }
}

/** iOS 카카오톡 인앱 → 시스템 브라우저(Safari) 유도 */
function openKakaoExternalOnIOS(url: string): boolean {
  try {
    const scheme = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    console.log("🚨 [openExternalBrowser] iOS Kakao openExternal:", { scheme });
    window.location.href = scheme;
    return true;
  } catch (e) {
    console.warn("⚠️ [openExternalBrowser] Kakao openExternal 실패:", e);
    return false;
  }
}

/**
 * 외부 브라우저로 강제 리디렉션
 */
export function openExternalBrowser(
  url?: string,
  options?: {
    fallbackDelay?: number;
    useSafariOnIOS?: boolean;
  }
): void {
  try {
    const targetUrl =
      url ||
      (typeof window !== "undefined" ? window.location.href : "https://www.yagovibe.com");

    const fallbackDelay = options?.fallbackDelay ?? 1000;
    const useSafariOnIOS = options?.useSafariOnIOS ?? true;

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isAndroid = /Android/.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isKakao = /KAKAOTALK/i.test(userAgent);

    if (isAndroid) {
      openChromeIntent(targetUrl, fallbackDelay);
    } else if (isIOS && useSafariOnIOS && isKakao) {
      // PAI-001: 카카오 전용 스킴 우선 (동일 URL href는 인앱에 남는 경우가 많음)
      if (!openKakaoExternalOnIOS(targetUrl)) {
        window.location.href = targetUrl;
      }
    } else if (isIOS && useSafariOnIOS) {
      console.log("🚨 [openExternalBrowser] iOS 감지 → Safari 유도 (동일 URL)");
      window.location.href = targetUrl;
    } else {
      console.log("🚨 [openExternalBrowser] 기타 플랫폼 → URL 이동");
      window.location.href = targetUrl;
    }
  } catch (e) {
    console.error("❌ [openExternalBrowser] 외부 브라우저 이동 오류:", e);
  }
}

export function openExternalBrowserSync(
  url?: string,
  options?: {
    fallbackDelay?: number;
    useSafariOnIOS?: boolean;
  }
): void {
  openExternalBrowser(url, options);
}

export default openExternalBrowser;
