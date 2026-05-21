import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/** Cloud Function `ensureCanonicalTradeChat` 응답 본문 */
export type EnsureCanonicalTradeChatPayload = {
  canonicalChatId: string;
  merged: boolean;
};

export type CallEnsureCanonicalTradeChatOutcome =
  | { ok: true; canonicalChatId: string; merged: boolean }
  | {
      ok: false;
      reason: "invalid_chat_id" | "empty_response" | "callable_error";
      code?: string;
      message?: string;
    };

function firebaseErrorFields(e: unknown): { code?: string; message?: string } {
  if (!e || typeof e !== "object") return {};
  const rec = e as Record<string, unknown>;
  const code = typeof rec.code === "string" ? rec.code : "";
  const message = typeof rec.message === "string" ? rec.message : "";
  return {
    ...(code ? { code } : {}),
    ...(message ? { message } : {}),
  };
}

/**
 * 서버(Admin)에서 동일 거래 중복 `chats` 문서를 정규 chatId 한 방으로 병합·승격.
 * 실패 시 null 대신 `ok: false` + Firebase 오류 code/message — 호출부에서 무시하지 말 것.
 */
export async function callEnsureCanonicalTradeChat(
  chatId: string
): Promise<CallEnsureCanonicalTradeChatOutcome> {
  const id = String(chatId ?? "").trim();
  if (!id) {
    console.warn("[callEnsureCanonicalTradeChat] 빈 chatId");
    return { ok: false, reason: "invalid_chat_id" };
  }

  try {
    const fn = httpsCallable<{ chatId: string }, EnsureCanonicalTradeChatPayload>(
      functions,
      "ensureCanonicalTradeChat"
    );
    const res = await fn({ chatId: id });
    const data = res.data;
    if (!data?.canonicalChatId) {
      console.error("[callEnsureCanonicalTradeChat] 응답에 canonicalChatId 없음", {
        chatId: id,
        data,
      });
      return {
        ok: false,
        reason: "empty_response",
        message: "callable returned empty canonicalChatId",
      };
    }

    if (import.meta.env.DEV) {
      console.log("[callEnsureCanonicalTradeChat] 결과", {
        requestedChatId: id,
        canonicalChatId: data.canonicalChatId,
        merged: data.merged,
      });
    }

    return {
      ok: true,
      canonicalChatId: data.canonicalChatId,
      merged: !!data.merged,
    };
  } catch (e: unknown) {
    const { code, message } = firebaseErrorFields(e);
    console.error("[callEnsureCanonicalTradeChat] callable 실패 — 함수 배포·로그인·참가자 쌍·리전(asia-northeast3) 확인", {
      chatId: id,
      code,
      message,
      error: e,
    });
    return {
      ok: false,
      reason: "callable_error",
      code,
      message,
    };
  }
}
