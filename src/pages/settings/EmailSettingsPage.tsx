/**
 * 🔥 Email Settings Page - 이메일 구독 설정
 * 
 * 경로: /settings/email
 * 
 * 역할:
 * - 이메일 구독 활성화/비활성화
 * - 알림 타입별 구독 설정
 * - Digest 설정
 */

import { useState, useEffect } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  getEmailSubscription,
  updateEmailSubscription,
  toggleEmailSubscription,
} from "@/services/emailService";
import type { EmailSubscription, EmailNotificationType } from "@/types/email";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const notificationLabels: Record<EmailNotificationType, string> = {
  match_result: "경기 결과",
  match_started: "경기 시작",
  match_completed: "경기 완료",
  media_uploaded: "새 사진 업로드",
  award_announced: "수상 발표",
  event_started: "이벤트 시작",
  event_completed: "이벤트 완료",
  team_match_scheduled: "팀 경기 일정",
  player_achievement: "선수 성과",
  weekly_digest: "주간 요약",
  monthly_digest: "월간 요약",
};

export default function EmailSettingsPage() {
  const { profile } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<EmailSubscription | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (profile?.uid) {
      loadSubscription();
    }
  }, [profile?.uid]);

  const loadSubscription = async () => {
    if (!profile?.uid) return;

    try {
      setLoading(true);
      const sub = await getEmailSubscription(profile.uid);
      
      if (sub) {
        setSubscription(sub);
        setEmail(sub.email);
      } else {
        // 기본값 설정
        setEmail(profile.email || "");
      }
    } catch (error) {
      console.error("[EmailSettingsPage] 구독 설정 조회 실패:", error);
      toast.error("구독 설정을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!profile?.uid) return;

    try {
      setSaving(true);
      await toggleEmailSubscription(profile.uid, enabled);
      
      setSubscription((prev) => {
        if (!prev) return null;
        return { ...prev, enabled };
      });
      
      toast.success(enabled ? "이메일 알림이 활성화되었습니다" : "이메일 알림이 비활성화되었습니다");
    } catch (error) {
      console.error("[EmailSettingsPage] 구독 설정 변경 실패:", error);
      toast.error("설정 변경에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePreference = async (type: EmailNotificationType, enabled: boolean) => {
    if (!profile?.uid || !subscription) return;

    try {
      setSaving(true);
      await updateEmailSubscription(
        profile.uid,
        email,
        {
          ...subscription.preferences,
          [type]: enabled,
        },
        subscription.digestFrequency
      );
      
      setSubscription((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [type]: enabled,
          },
        };
      });
    } catch (error) {
      console.error("[EmailSettingsPage] 알림 설정 변경 실패:", error);
      toast.error("설정 변경에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.uid) return;

    try {
      setSaving(true);
      await updateEmailSubscription(
        profile.uid,
        email,
        subscription?.preferences || {},
        subscription?.digestFrequency || "none"
      );
      
      toast.success("설정이 저장되었습니다");
      await loadSubscription();
    } catch (error) {
      console.error("[EmailSettingsPage] 설정 저장 실패:", error);
      toast.error("설정 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const enabled = subscription?.enabled ?? false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Mail className="w-8 h-8" />
          이메일 알림 설정
        </h1>
        <p className="text-gray-600 mt-2">받고 싶은 이메일 알림을 선택하세요</p>
      </div>

      {/* Email Address */}
      <Card>
        <CardHeader>
          <CardTitle>이메일 주소</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">이메일</Label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="your@email.com"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle>이메일 알림 활성화</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">이메일 알림 받기</p>
              <p className="text-sm text-gray-500 mt-1">
                모든 이메일 알림을 활성화하거나 비활성화합니다
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {enabled && (
        <Card>
          <CardHeader>
            <CardTitle>알림 타입별 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(notificationLabels).map(([type, label]) => {
                const notificationType = type as EmailNotificationType;
                const checked = subscription?.preferences[notificationType] ?? false;

                return (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{label}</p>
                      {type === "weekly_digest" || type === "monthly_digest" ? (
                        <p className="text-xs text-gray-500 mt-1">
                          {type === "weekly_digest" ? "매주 요약" : "매월 요약"} 이메일을 받습니다
                        </p>
                      ) : null}
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={(enabled) =>
                        handleTogglePreference(notificationType, enabled)
                      }
                      disabled={saving}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">
                이메일 알림 설정을 변경하면 즉시 적용됩니다.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                언제든지 설정을 변경하거나 구독을 취소할 수 있습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
