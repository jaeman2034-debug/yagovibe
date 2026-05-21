import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

function getOrCreateTabClientId(): string {
  const key = "yago_dev_tab_client_id";
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `tab-${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "tab-?";
  }
}

type Props = {
  /** matchmaking | session | quickplay */
  context?: string;
};

/**
 * DEV: 이 브라우저 프로필의 Firebase uid — 탭 두 개(같은 Chrome)면 값이 동일함.
 * 5v5/1v1 스모크 전 A uid ≠ B uid 필수.
 */
export function DevAuthUidBanner({ context = "app" }: Props) {
  const { user } = useAuth();
  const tabClientId = getOrCreateTabClientId();
  const [authUid, setAuthUid] = useState(() => auth.currentUser?.uid?.trim() ?? "");
  const [crossTabOverwrite, setCrossTabOverwrite] = useState(false);
  const mountedUidRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const next = u?.uid?.trim() ?? "";
      if (!bootstrappedRef.current) {
        bootstrappedRef.current = true;
        mountedUidRef.current = next;
      } else if (mountedUidRef.current && next && mountedUidRef.current !== next) {
        setCrossTabOverwrite(true);
        console.warn(
          "[auth] 다른 탭에서 로그인됨 — 이 Chrome 프로필 전체가 마지막 계정으로 바뀜",
          { was: mountedUidRef.current.slice(0, 8), now: next.slice(0, 8), tab: tabClientId },
        );
        mountedUidRef.current = next;
      }
      setAuthUid(next);
    });
    return unsub;
  }, [tabClientId]);

  if (!import.meta.env.DEV) return null;

  const uid = authUid || user?.uid?.trim() || "";
  const short = uid ? `${uid.slice(0, 8)}…${uid.slice(-4)}` : "(로그아웃)";
  const email = user?.email?.trim() || auth.currentUser?.email?.trim() || "";

  return (
    <div
      className="rounded-lg border border-amber-500/40 bg-amber-950/80 px-3 py-2 font-mono text-[10px] leading-relaxed text-amber-100"
      role="status"
    >
      <p className="font-bold text-amber-200">
        DEV · 이 브라우저 AUTH uid ({context})
      </p>
      <p className="mt-1 break-all text-white">{short}</p>
      {email ? <p className="break-all text-amber-200/80">{email}</p> : null}
      <p className="text-slate-500">탭 id: {tabClientId} (탭마다 다름 · Auth는 브라우저 공유)</p>
      {crossTabOverwrite ? (
        <p className="mt-1.5 font-bold text-rose-300">
          방금 다른 탭 로그인으로 이 창 계정이 덮어씌워짐 — 새로고침해도 마지막 로그인 계정만 남음
        </p>
      ) : null}
      <p className="mt-1.5 text-amber-200/90">
        기본: <strong className="text-white">Chrome 탭 2개 = 같은 계정</strong> (local/IndexedDB 공유).
        A=Chrome + B=Edge(또는 Chrome 프로필 2개) 권장.
      </p>
      {import.meta.env.VITE_AUTH_SESSION_PERSISTENCE_DEV?.trim().toLowerCase() === "true" ? (
        <p className="text-emerald-300/90">session persistence DEV ON — 탭별 계정 분리 시도 중</p>
      ) : (
        <p className="text-slate-500">
          Chrome만: <code className="text-cyan-300">.env.local</code>에{" "}
          <code className="text-cyan-300">VITE_AUTH_SESSION_PERSISTENCE_DEV=true</code> 후 dev 재시작
        </p>
      )}
      <p className="text-slate-400">
        콘솔: <code className="text-cyan-300">yagoAuthUid()</code> ·{" "}
        <code className="text-cyan-300">window.__AUTH_UID__</code>
      </p>
    </div>
  );
}
