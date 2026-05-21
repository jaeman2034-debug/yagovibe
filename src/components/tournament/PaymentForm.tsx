/**
 * 🔥 결제 등록 폼 (ADMIN 전용)
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Payment } from "@/types/tournament";
import { CreditCard } from "lucide-react";

interface PaymentFormProps {
  associationId: string;
  tournamentId: string;
  applicationId: string;
  dueAmount: number;
  onSubmit: (params: {
    amount: number;
    method: Payment["method"];
    memo?: string;
  }) => Promise<void>;
}

/**
 * 결제 등록 폼 컴포넌트
 */
export function PaymentForm({
  associationId,
  tournamentId,
  applicationId,
  dueAmount,
  onSubmit,
}: PaymentFormProps) {
  const [amount, setAmount] = useState(dueAmount);
  const [method, setMethod] = useState<Payment["method"]>("TRANSFER");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (amount <= 0) {
      alert("결제 금액은 0원보다 커야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ amount, method, memo: memo.trim() || undefined });
      setAmount(dueAmount);
      setMemo("");
    } catch (error: any) {
      console.error("결제 등록 오류:", error);
      alert(error.message || "결제 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          결제 등록
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          미납 금액: {dueAmount.toLocaleString()}원
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">결제 금액</Label>
          <Input
            id="amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => {
              const value = Number(e.target.value);
              setAmount(isNaN(value) || value < 1 ? 1 : value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">결제 방법</Label>
          <Select
            value={method}
            onValueChange={(value) => setMethod(value as Payment["method"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">현금</SelectItem>
              <SelectItem value="TRANSFER">계좌이체</SelectItem>
              <SelectItem value="CARD">카드</SelectItem>
              <SelectItem value="OTHER">기타</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="memo">비고 (선택)</Label>
          <Textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="결제 관련 메모"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? "등록 중..." : "결제 등록"}
        </Button>
      </CardContent>
    </Card>
  );
}

