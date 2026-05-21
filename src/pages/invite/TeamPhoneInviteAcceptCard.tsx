/**
 * 팀 전화 초대: 링크의 번호로 Firebase Phone Auth(OTP) 후 Callable로 멤버 연결
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizePhoneNumber } from "@/utils/phone";
import { sendSMSCode, confirmSMSCode, cleanupRecaptcha } from "@/utils/authPhone";
import { callClaimPhoneInvitedTeamMemberships } from "@/lib/team/phoneInviteCallables";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  teamId: string;
  /** 링크에 포함된 번호(E.164 권장) */
  expectedPhoneFromUrl: string;
};

export function TeamPhoneInviteAcceptCard({ teamId, expectedPhoneFromUrl }: Props) {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const displayPhone = normalizePhoneNumber(expectedPhoneFromUrl);

  const handleSend = async () => {
    setBusy(true);
    try {
      await sendSMSCode(displayPhone);
      setSent(true);
      toast.success("인증번호를 보냈어요. 문자를 확인해 주세요.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "문자 발송에 실패했습니다.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await confirmSMSCode(otp.trim());
      const res = await callClaimPhoneInvitedTeamMemberships({ teamId });
      toast.success(
        res.linked > 0
          ? "팀에 연결되었습니다."
          : "연결할 초대가 없거나 이미 처리되었습니다."
      );
      navigate(`/team/${encodeURIComponent(teamId)}`, { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "처리에 실패했습니다.";
      const code =
        e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      if (code === "functions/failed-precondition") {
        toast.error("휴대폰 인증이 확인되지 않았어요. OTP를 다시 확인해 주세요.");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
      cleanupRecaptcha();
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
      <p className="text-xs font-medium text-gray-700">휴대폰 인증 (OTP)</p>
      <p className="mt-1 text-xs text-gray-500">
        초대된 번호: <span className="font-mono text-gray-800">{displayPhone}</span>
        <br />
        다른 번호로는 이 팀 초대에 연결할 수 없습니다.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {!sent ? (
          <Button type="button" className="w-full" disabled={busy} onClick={() => void handleSend()}>
            {busy ? "요청 중…" : "인증번호 받기"}
          </Button>
        ) : (
          <>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6자리 인증번호"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button
              type="button"
              className="w-full"
              disabled={busy || otp.trim().length < 6}
              onClick={() => void handleConfirm()}
            >
              {busy ? "확인 중…" : "인증하고 팀 연결"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              disabled={busy}
              onClick={() => void handleSend()}
            >
              인증번호 다시 받기
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
