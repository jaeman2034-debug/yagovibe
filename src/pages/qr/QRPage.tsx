/**
 * 🔥 QR 초대 Preview + Auto-Join 페이지 (v1 LOCK)
 * 
 * 동작:
 * - inviteId 유지/복구 (localStorage)
 * - 로그인 상태면 자동 joinTeam
 * - 비로그인이면 로그인/가입 버튼 노출
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { onAuthStateChanged } from "firebase/auth";
import { db, functions, auth } from "@/lib/firebase";
import { captureInviteFromUrl, getPendingInvite, clearPendingInvite } from "@/lib/inviteContext";
import { handleQREntry } from "@/lib/qrRouter";
import Logo from "@/components/common/Logo";
import { Users, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { track } from "@/lib/analytics";

const joinTeamFn = httpsCallable(functions, "joinTeam");

type Invite = {
  teamId: string;
  role: "member" | "coach" | "staff";
  expiresAt: { toMillis: () => number } | number;
  revoked?: boolean;
  usedCount?: number;
  maxUses?: number;
  allowedDomains?: string[]; // 🔥 H-0: 이메일 도메인 제한
  requireVerifiedEmail?: boolean; // 🔥 H-0: 이메일 인증 필수
};

type Status = "idle" | "loading" | "need_auth" | "joining" | "joined" | "already_member" | "error";

export default function QRPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [teamPublic, setTeamPublic] = useState<any>(null);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const redirectedRef = useRef(false); // 리다이렉트 중복 방지
  const marketRedirectedRef = useRef(false); // market=home 리다이렉트 중복 방지

  // 🔥 QR 통합 라우터: mode 파라미터 우선 처리
  useEffect(() => {
    if (marketRedirectedRef.current) return;
    
    const mode = searchParams.get('mode');
    
    // 🔐 mode=login 처리 (전화번호 로그인)
    if (mode === 'login') {
      const sessionId = searchParams.get('sessionId');
      
      if (sessionId) {
        // sessionId가 있으면 바로 로그인 페이지로 (기존 방식, PC에서 생성한 QR)
        marketRedirectedRef.current = true;
        navigate(`/qr-login?sessionId=${sessionId}`, { replace: true });
        return;
      } else {
        // sessionId가 없으면 새 세션 생성 후 리다이렉트 (직접 접근 케이스)
        // ⚠️ 주의: 이 경우 PC와 모바일 간 세션 동기화가 안 되므로, 
        // 일반적으로는 PC에서 세션을 미리 생성해서 QR에 포함시키는 방식을 권장
        marketRedirectedRef.current = true;
        import('@/lib/qrPhoneLogin').then(({ createQRLoginSession }) => {
          createQRLoginSession(5).then((newSessionId) => {
            navigate(`/qr-login?sessionId=${newSessionId}`, { replace: true });
          }).catch((error) => {
            console.error('[QRPage] QR 로그인 세션 생성 실패:', error);
            navigate('/login', { replace: true });
          });
        });
        return;
      }
    }
    
    // 🔥 기존 QR 파라미터 처리 (market=home, item=xxx 등)
    const destination = handleQREntry(searchParams);
    if (destination) {
      marketRedirectedRef.current = true;
      // market=home 등 QR 파라미터가 있으면 즉시 목적 화면으로 이동
      navigate(destination, { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  // 🔥 WeChat Mode: need_auth 상태면 즉시 회원가입으로 리다이렉트
  useEffect(() => {
    if (status === "need_auth" && !redirectedRef.current && inviteId && invite) {
      redirectedRef.current = true;
      track("invite_auth_started", {
        inviteId,
        teamId: invite.teamId,
        authType: "signup",
      });
      navigate("/qr/signup");
    }
  }, [status, inviteId, invite, navigate]);

  // 1) inviteId 확보 + 저장
  useEffect(() => {
    captureInviteFromUrl();
    const pending = getPendingInvite();
    setInviteId(pending);

    if (!pending) {
      setStatus("error");
      setErrorCode("INVITE_MISSING");
      return;
    }
  }, []);

  // 2) Auth state 감시
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUid(u?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // 3) invite 로드 + 자동 join
  useEffect(() => {
    (async () => {
      if (!inviteId) return;

      try {
        setStatus("loading");

        // invite 로드
        const invSnap = await getDoc(doc(db, "invites", inviteId));
        if (!invSnap.exists()) {
          setStatus("error");
          setErrorCode("INVITE_NOT_FOUND");
          clearPendingInvite();
          return;
        }

        const inv = invSnap.data() as Invite;
        setInvite(inv);

        // 🔥 I-3: 초대 미리보기 조회 이벤트 (클라이언트)
        track("invite_preview_opened", {
          inviteId,
          teamId: inv.teamId,
        });

        // 만료/취소/소진 검증
        const now = Date.now();
        const expiresAt = typeof inv.expiresAt === "object" 
          ? inv.expiresAt.toMillis() 
          : inv.expiresAt;

        if (inv.revoked) {
          setStatus("error");
          setErrorCode("INVITE_REVOKED");
          clearPendingInvite();
          return;
        }

        if (expiresAt < now) {
          setStatus("error");
          setErrorCode("INVITE_EXPIRED");
          clearPendingInvite();
          return;
        }

        if (
          typeof inv.maxUses === "number" &&
          typeof inv.usedCount === "number" &&
          inv.usedCount >= inv.maxUses
        ) {
          setStatus("error");
          setErrorCode("INVITE_USED_UP");
          clearPendingInvite();
          return;
        }

        // 팀 공개정보 로드
        const teamSnap = await getDoc(doc(db, "teams", inv.teamId));
        setTeamPublic(teamSnap.exists() ? teamSnap.data() : null);

        // 로그인 여부에 따라 분기
        if (!authUid) {
          setStatus("need_auth");
          return;
        }

        // 로그인 상태면 자동 join
        setStatus("joining");

        // 🔥 I-3: 합류 시도 이벤트 (클라이언트)
        track("invite_join_attempt", {
          inviteId,
          teamId: inv.teamId,
        });

        const res: any = await joinTeamFn({
          inviteId,
          ua: navigator.userAgent,
        });

        if (res?.data?.ok) {
          clearPendingInvite();
          
          // 🔥 E-3: 이미 멤버인 경우 특별 처리
          if (res.data.alreadyMember) {
            setStatus("already_member");
            // 바로 팀으로 이동 버튼 표시
            return;
          }
          
          setStatus("joined");
          
          // 3초 후 팀 대시보드로 이동
          setTimeout(() => {
            navigate(`/sports/${teamSnap.data()?.sportType || "football"}/team`);
          }, 3000);
          return;
        }

        setStatus("error");
        setErrorCode("JOIN_UNKNOWN");
      } catch (e: any) {
        console.error("QR 페이지 오류:", e);
        setStatus("error");
        setErrorCode(e?.code || e?.message || "JOIN_ERROR");
        
        // 특정 에러 코드는 localStorage 정리
        if (["INVITE_NOT_FOUND", "INVITE_EXPIRED", "INVITE_USED_UP", "INVITE_REVOKED"].includes(e?.code)) {
          clearPendingInvite();
        }
      }
    })();
  }, [inviteId, authUid, navigate]);

  // 에러 메시지 매핑
  const getErrorMessage = (code: string | null): string => {
    const errorMessages: Record<string, string> = {
      INVITE_MISSING: "초대 코드가 없습니다.",
      INVITE_NOT_FOUND: "초대코드가 유효하지 않아요",
      INVITE_EXPIRED: "초대가 만료됐어요. 새 초대를 요청해 주세요.",
      INVITE_USED_UP: "이미 사용된 초대예요. 새 초대를 요청해 주세요.",
      INVITE_REVOKED: "초대가 취소됐어요. 코치에게 문의해 주세요.",
      NOT_ALLOWED_EXISTING_USER: "기존 사용자는 이 초대를 사용할 수 없습니다.",
      NOT_ALLOWED_NEW_SIGNUP: "신규 가입이 허용되지 않은 초대입니다.",
      JOIN_UNKNOWN: "합류에 실패했어요. 잠시 후 다시 시도해 주세요.",
      JOIN_ERROR: "합류에 실패했어요. 잠시 후 다시 시도해 주세요.",
      INVITE_RATE_LIMIT: "초대 생성이 너무 잦아요. 잠시 후 다시 시도해 주세요.",
      JOIN_RATE_LIMIT: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
      SEAT_LIMIT_REACHED: "팀 인원이 가득 찼어요",
      SEAT_LIMIT_EXCEEDED: "팀 인원이 가득 찼어요", // 하위 호환성
      EMAIL_REQUIRED: "이메일 계정으로 로그인해 주세요",
      INVALID_EMAIL: "유효하지 않은 이메일입니다.",
      EMAIL_DOMAIN_NOT_ALLOWED: "회사 이메일로만 합류할 수 있어요",
      EMAIL_NOT_VERIFIED: "이메일 인증 후 다시 시도해 주세요",
      ALLOWED_DOMAIN_REQUIRED: "엔터프라이즈 팀은 이메일 도메인을 지정해야 합니다.",
    };

    return errorMessages[code || ""] || "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  };

  const teamName = teamPublic?.name ?? "팀";
  const region = teamPublic?.region ?? "";

  // 로딩 상태
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Logo size={64} className="mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">불러오는 중…</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (status === "error") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">초대 링크 오류</h1>
          <p className="text-gray-600 mb-6">{getErrorMessage(errorCode)}</p>
          <button
            onClick={() => {
              clearPendingInvite();
              navigate("/");
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  // 인증 필요 상태 → 리다이렉트 중 (WeChat Mode)
  if (status === "need_auth") {
    // 리다이렉트 중이므로 로딩 표시
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Logo size={64} className="mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">이동 중…</p>
        </div>
      </div>
    );
  }

  // 합류 중 상태
  if (status === "joining") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <Logo size={96} className="mx-auto mb-6 animate-pulse" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{teamName}</h1>
          <p className="text-gray-600">팀에 합류 중…</p>
        </div>
      </div>
    );
  }

  // 합류 완료 상태
  if (status === "joined") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{teamName}</h1>
          <p className="text-gray-600 mb-2">참여가 완료되었습니다</p>
          <p className="text-sm text-gray-500">곧 팀 화면으로 이동합니다</p>
        </div>
      </div>
    );
  }

  // 🔥 E-3: 이미 멤버 상태
  if (status === "already_member") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <CheckCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{teamName}</h1>
          <p className="text-gray-600 mb-6">이미 이 팀의 멤버입니다</p>
          <button
            onClick={() => {
              navigate(`/sports/${teamPublic?.sportType || "football"}/team`);
            }}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            팀으로 이동
          </button>
        </div>
      </div>
    );
  }

  return null;
}

