import { useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { AlertTriangle, Play, Send, ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { functions } from "@/lib/firebase";
import { useRoleGate } from "@/hooks/useRoleGate";

const FEDERATION_SLUG = "nowon-football";
const APPROVED_RESERVATION_ID = "canary-test-20260902-1900-v1";

type CanaryDryRunResponse = {
  ok: boolean;
  recipient: string;
  canaryExecutionId: string;
  reservationId: string;
  providerMessageId: null;
  requestId: null;
  status: "dry-run";
  dryRun: true;
};

type CanarySendResponse = Omit<CanaryDryRunResponse, "dryRun" | "status"> & {
  dryRun: false;
  status: string;
};

export default function NcpAlimTalkCanaryDryRunPage() {
  const { user, loading: roleLoading, isPlatformAdmin } = useRoleGate();
  const [recipientPhone, setRecipientPhone] = useState("");
  const [canaryExecutionId] = useState(() => crypto.randomUUID());
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CanaryDryRunResponse | null>(null);
  const [verifiedRecipient, setVerifiedRecipient] = useState<string | null>(null);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [sendResult, setSendResult] = useState<CanarySendResponse | null>(null);
  const [sendAttempted, setSendAttempted] = useState(false);
  const sendLocked = useRef(false);

  const canSend = result?.ok === true && verifiedRecipient === recipientPhone.trim() && !sendAttempted;

  const canaryPayload = (recipient: string, dryRun: boolean) => ({
    canaryMode: true as const,
    canaryExecutionId,
    dryRun,
    federationSlug: FEDERATION_SLUG,
    reservationId: APPROVED_RESERVATION_ID,
    recipientPhone: recipient,
  });

  const runDryRun = async () => {
    const recipient = recipientPhone.trim();
    if (!recipient) {
      toast.error("수신자 전화번호를 입력해 주세요.");
      return;
    }

    setRunning(true);
    setResult(null);
    setVerifiedRecipient(null);
    try {
      const callable = httpsCallable<
        {
          canaryMode: true;
          canaryExecutionId: string;
          dryRun: boolean;
          federationSlug: typeof FEDERATION_SLUG;
          reservationId: typeof APPROVED_RESERVATION_ID;
          recipientPhone: string;
        },
        CanaryDryRunResponse
      >(functions, "executeNcpAlimTalkCanary");
      const response = await callable(canaryPayload(recipient, true));
      setResult(response.data);
      setVerifiedRecipient(recipient);
      toast.success("드라이런 검증을 완료했습니다.");
    } catch (error: unknown) {
      console.error("[NcpAlimTalkCanaryDryRunPage] dry-run failed", error);
      toast.error(error instanceof Error ? error.message : "드라이런 검증에 실패했습니다.");
    } finally {
      setRunning(false);
    }
  };

  const sendLiveCanary = async () => {
    const recipient = recipientPhone.trim();
    if (!canSend || sendLocked.current) return;

    sendLocked.current = true;
    setSendAttempted(true);
    setConfirmSendOpen(false);
    setRunning(true);
    try {
      const callable = httpsCallable<
        {
          canaryMode: true;
          canaryExecutionId: string;
          dryRun: boolean;
          federationSlug: typeof FEDERATION_SLUG;
          reservationId: typeof APPROVED_RESERVATION_ID;
          recipientPhone: string;
        },
        CanarySendResponse
      >(functions, "executeNcpAlimTalkCanary");
      const response = await callable(canaryPayload(recipient, false));
      setSendResult(response.data);
      toast.success("Canary 알림톡 전송 요청을 완료했습니다.");
    } catch (error: unknown) {
      console.error("[NcpAlimTalkCanaryDryRunPage] live send failed", error);
      toast.error(error instanceof Error ? error.message : "Canary 알림톡 전송에 실패했습니다.");
    } finally {
      setRunning(false);
    }
  };

  if (roleLoading) {
    return <div className="mx-auto max-w-xl p-6 text-center text-sm text-muted-foreground">권한 확인 중…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="flex gap-3 pt-6 text-sm text-red-800 dark:text-red-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            플랫폼 관리자만 이 도구를 사용할 수 있습니다.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">NCP 알림톡 Canary</h1>
        <p className="mt-1 text-sm text-muted-foreground">승인된 예약 데이터로 먼저 검증한 뒤, 같은 수신자에게 한 번만 전송합니다.</p>
      </header>

      <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="flex gap-3 pt-6 text-sm text-amber-950 dark:text-amber-100">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <p>
            실제 전송은 이 세션에서 성공한 드라이런과 동일한 수신자에 한해, 확인 절차 후 한 번만 호출할 수 있습니다.
            수신자 번호는 브라우저 메모리와 요청 중에만 사용됩니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">수신자</CardTitle>
          <CardDescription>전화번호는 현재 브라우저 메모리와 요청 중에만 사용됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium" htmlFor="canary-recipient">
            전화번호
            <input
              id="canary-recipient"
              type="tel"
              autoComplete="off"
              inputMode="tel"
              value={recipientPhone}
              onChange={(event) => {
                setRecipientPhone(event.target.value);
                setResult(null);
                setVerifiedRecipient(null);
              }}
              placeholder="01012345678"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={running}
            />
          </label>
          <dl className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between gap-3">
              <dt>연맹</dt>
              <dd>{FEDERATION_SLUG}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>승인된 예약 ID</dt>
              <dd className="break-all text-right">{APPROVED_RESERVATION_ID}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>이번 실행 ID</dt>
              <dd className="break-all text-right">{canaryExecutionId}</dd>
            </div>
          </dl>
          <Button className="w-full" onClick={() => void runDryRun()} disabled={running}>
            <Play className="mr-2 h-4 w-4" />
            {running ? "드라이런 검증 중…" : "드라이런 실행"}
          </Button>
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => setConfirmSendOpen(true)}
            disabled={!canSend || running}
          >
            <Send className="mr-2 h-4 w-4" />
            실제 Canary 알림톡 전송
          </Button>
          {!canSend && (
            <p className="text-xs text-muted-foreground">
              {sendAttempted
                ? "이 세션에서는 실제 전송 호출을 이미 한 번 실행했습니다."
                : "실제 전송은 이 세션에서 현재 수신자로 드라이런 검증이 성공한 뒤 활성화됩니다."}
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-base">검증 완료</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-emerald-900 dark:text-emerald-100">
            <p>수신자: {result.recipient}</p>
            <p>상태: {result.status}</p>
            <p>제공자 전송: 없음</p>
          </CardContent>
        </Card>
      )}

      {sendResult && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-base">실제 전송 요청 완료</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-emerald-900 dark:text-emerald-100">
            <p>수신자: {sendResult.recipient}</p>
            <p>상태: {sendResult.status}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>실제 Canary 알림톡을 전송할까요?</DialogTitle>
            <DialogDescription>
              {result?.recipient}에게 승인된 Canary 템플릿을 실제 발송합니다. 이 수신자·예약 조합은 한 번만 전송할 수
              있으며, 실행 후 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSendOpen(false)} disabled={running}>
              취소
            </Button>
            <Button variant="destructive" onClick={() => void sendLiveCanary()} disabled={!canSend || running}>
              {running ? "전송 중…" : "전송 확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
