/**
 * 🔥 리마인드 로그 UI (증빙/감사 대응)
 * "우리는 안내했다"를 시스템 로그로 증명
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare } from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

interface Reminder {
  id: string;
  type: string;
  message: string;
  dueAmount?: number;
  paymentStatus?: string;
  createdAt: any; // Timestamp
}

interface ReminderLogProps {
  associationId: string;
  tournamentId: string;
  applicationId: string;
}

/**
 * 리마인드 로그 컴포넌트
 */
export function ReminderLog({
  associationId,
  tournamentId,
  applicationId,
}: ReminderLogProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 가드: associationId, tournamentId, applicationId 확인
    if (!associationId || !tournamentId || !applicationId) {
      setLoading(false);
      return;
    }
    loadReminders();
  }, [associationId, tournamentId, applicationId]);

  const loadReminders = async () => {
    // 🔥 가드: 다시 한 번 확인 (안전성)
    if (!associationId || !tournamentId || !applicationId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const remindersRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}/reminders`
      );
      
      const q = query(remindersRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      
      const logs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Reminder[];
      
      setReminders(logs);
    } catch (error) {
      console.error("리마인드 로그 조회 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-muted-foreground">
          로딩 중...
        </CardContent>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-muted-foreground">
          알림 이력이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          알림 이력 (증빙)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map((reminder) => {
          const createdAt = reminder.createdAt?.toDate?.() || new Date(reminder.createdAt);
          
          return (
            <div
              key={reminder.id}
              className="border rounded-md p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(createdAt, "yyyy-MM-dd HH:mm:ss")}
                  </span>
                </div>
                <Badge variant="outline">
                  {reminder.type === "PAYMENT_DUE" ? "납부 기한 알림" : "계좌 안내"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {reminder.message}
              </div>
              {reminder.dueAmount !== undefined && reminder.dueAmount > 0 && (
                <div className="text-xs text-orange-600">
                  미납 금액: {reminder.dueAmount.toLocaleString()}원
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

