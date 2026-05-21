import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Props = {
  propMyUid: string;
  opponentUid: string;
  sessionPlayerUids: [string, string];
  playerIndex?: 0 | 1;
};

/** DEV: 1v1 - compare auth.uid on both browsers */
export function LiveMatchDevAuthStrip({
  propMyUid,
  opponentUid,
  sessionPlayerUids,
  playerIndex,
}: Props) {
  const [authUid, setAuthUid] = useState(() => auth.currentUser?.uid?.trim() ?? "");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUid(u?.uid?.trim() ?? "");
    });
    return unsub;
  }, []);

  if (!import.meta.env.DEV) return null;

  const short = (u: string) => (u ? `${u.slice(0, 8)}..` : "-");
  const authMismatch = Boolean(authUid && propMyUid && authUid !== propMyUid);
  const authNotInSession = Boolean(authUid) && !sessionPlayerUids.includes(authUid);
  const sameAsOpponent = Boolean(authUid && opponentUid && authUid === opponentUid);
  const warn = authMismatch || authNotInSession || sameAsOpponent;
  const boxClass = `pointer-events-auto max-w-[min(100%,18rem)] rounded-lg border px-2 py-1.5 font-mono text-[9px] leading-snug backdrop-blur-md ${
    warn
      ? "border-rose-500/60 bg-rose-950/90 text-rose-100"
      : "border-white/15 bg-[#070b14]/85 text-slate-400"
  }`;

  return (
    <section className={boxClass}>
      <p>
        <span className="text-slate-500">AUTH</span> {short(authUid)}
        <span className="mx-1 text-slate-600">|</span>
        <span className="text-slate-500">OPP</span> {short(opponentUid)}
      </p>
      <p className="text-slate-500">
        session {short(sessionPlayerUids[0])} / {short(sessionPlayerUids[1])}
      </p>
      {playerIndex !== undefined ? (
        <p className="text-slate-500">
          idx {playerIndex} � me={playerIndex === 0 ? "cyan" : "pink"} � opp=
          {playerIndex === 0 ? "pink" : "cyan"}
        </p>
      ) : null}
      {authMismatch ? (
        <p className="mt-0.5 font-bold text-rose-200">auth != props.myUid</p>
      ) : null}
      {authNotInSession ? (
        <p className="mt-0.5 font-bold text-rose-200">not a session participant</p>
      ) : null}
      {sameAsOpponent ? (
        <p className="mt-0.5 font-bold text-rose-200">auth === opponentUid</p>
      ) : null}
      {!warn ? (
        <p className="mt-0.5 text-amber-200/90">
          1v1: Chrome + Edge (or InPrivate). Same profile = same AUTH.
        </p>
      ) : null}
    </section>
  );
}
