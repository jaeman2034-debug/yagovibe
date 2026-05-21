/**
 * `/invite/:inviteId` — teamMemberInvites OTP 수락 (URL에 전화번호 없음)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizePhoneNumber } from "@/utils/phone";
import { sendSMSCode, confirmSMSCode, cleanupRecaptcha } from "@/utils/authPhone";
import { callClaimTeamMemberInvite } from "@/lib/team/teamMemberInviteCallables";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  inviteId: string;
  teamId: string;
};

export function TeamMemberInviteAcceptCard({ inviteId, teamId }: Props) {
  const navigate = useNavigate();
  const [phoneLocal, setPhoneLocal] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    let e164 = "";
    try {
      e164 = normalizePhoneNumber(phoneLocal.trim());
    } catch {
      toast.error("휴대폰 번호 형식을 확인해 주세요.");
      return;
    }
    if (!e164.startsWith("+")) {
      toast.error("휴대폰 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await sendSMSCode(e164);
      setSent(true);
      toast.success("인증번호를 보냈습니다. 문자를 확인해 주세요.");
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
      const res = await callClaimTeamMemberInvite(inviteId);
      if (res.alreadyAccepted) {
        toast.message("이미 수락된 초대입니다.");
      } else if (res.linked > 0) {
        toast.success("팀에 연결되었습니다.");
      } else {
        toast.message("연결할 초대 상태를 확인했습니다. 목록을 새로고침해 보세요.");
      }
      navigate(`/team/${encodeURIComponent(teamId)}`, { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "처리에 실패했습니다.";
      const code =
        e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      if (code === "functions/permission-denied") {
        toast.error("인증한 번호가 초대에 등록된 번호와 다릅니다. 팀에 등록된 번호로 인증해 주세요.");
      } else if (code === "functions/failed-precondition") {
        toast.error(msg);
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
      <p className="text-xs font-medium text-gray-700">휴대폰 인증</p>
      <p className="mt-1 text-xs text-gray-500">
        팀에 미리 등록된 휴대폰 번호로만 연결할 수 있습니다. 해당 번호로 인증번호를 받아 주세요.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {!sent ? (
          <>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01012345678"
              value={phoneLocal}
              onChange={(e) => setPhoneLocal(e.target.value.replace(/[^\d-]/g, ""))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button type="button" className="w-full" disabled={busy} onClick={() => void handleSend()}>
              {busy ? "요청 중…" : "인증번호 받기"}
            </Button>
          </>
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
