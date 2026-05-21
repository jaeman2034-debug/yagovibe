/**
 * 🔥 사무국 승인 규칙 설정 UI
 * 
 * 연령/JoinKFA 기준으로 자동 승인/반려 규칙 설정
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Save, Info } from "lucide-react";
import type { Tournament } from "@/types/tournament";

interface ApprovalRulesSettingsProps {
  associationId: string;
  tournamentId: string;
  tournament: Tournament;
  onSave?: () => void;
}

export function ApprovalRulesSettings({
  associationId,
  tournamentId,
  tournament,
  onSave,
}: ApprovalRulesSettingsProps) {
  const [saving, setSaving] = useState(false);
  
  // 기본값 설정
  const defaultRules = {
    ageCheck: {
      requireEligible: true,
      allowNeedsReview: false,
    },
    joinKfa: {
      requireVerified: false, // JoinKFA는 기본적으로 선택 사항
      allowMismatch: true, // mismatch는 수기 확인 후 허용 가능
      allowNotFound: true, // not_found도 규정에 따라 허용 가능
    },
    autoApproveEnabled: false, // 기본적으로 자동 승인 비활성화 (안전)
  };

  const [rules, setRules] = useState(
    tournament.approvalRules || defaultRules
  );

  // 규칙 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      const tournamentRef = doc(
        db,
        `associations/${associationId}/tournaments/${tournamentId}`
      );

      await updateDoc(tournamentRef, {
        approvalRules: rules,
        updatedAt: new Date(),
      });

      toast.success("승인 규칙이 저장되었습니다.");
      onSave?.();
    } catch (error: any) {
      console.error("승인 규칙 저장 실패:", error);
      toast.error(`저장 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  // 규칙 미리보기 (예시)
  const getRulePreview = () => {
    const conditions: string[] = [];
    
    if (rules.ageCheck.requireEligible) {
      conditions.push("연령 적합");
    }
    if (!rules.ageCheck.allowNeedsReview) {
      conditions.push("연령 확인필요 제외");
    }
    
    if (rules.joinKfa.requireVerified) {
      conditions.push("JoinKFA 인증됨");
    }
    if (!rules.joinKfa.allowMismatch) {
      conditions.push("JoinKFA 불일치 제외");
    }
    if (!rules.joinKfa.allowNotFound) {
      conditions.push("JoinKFA 없음 제외");
    }

    if (conditions.length === 0) {
      return "모든 선수 자동 승인";
    }

    return conditions.join(" + ");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>사무국 승인 규칙 설정</CardTitle>
        <CardDescription>
          연령 및 JoinKFA 기준으로 자동 승인/반려 규칙을 설정합니다.
          규칙에 맞는 선수는 자동으로 승인됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 연령 기준 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">연령 기준</h3>
            <Badge variant="outline">필수</Badge>
          </div>
          
          <div className="space-y-3 pl-4 border-l-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireEligible"
                checked={rules.ageCheck.requireEligible}
                onCheckedChange={(checked) =>
                  setRules({
                    ...rules,
                    ageCheck: {
                      ...rules.ageCheck,
                      requireEligible: checked === true,
                    },
                  })
                }
              />
              <Label htmlFor="requireEligible" className="cursor-pointer">
                연령 적합 필수 (🟢 출전 가능만 승인)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowNeedsReview"
                checked={rules.ageCheck.allowNeedsReview}
                onCheckedChange={(checked) =>
                  setRules({
                    ...rules,
                    ageCheck: {
                      ...rules.ageCheck,
                      allowNeedsReview: checked === true,
                    },
                  })
                }
              />
              <Label htmlFor="allowNeedsReview" className="cursor-pointer">
                연령 확인필요 허용 (🟡 확인필요도 승인 가능)
              </Label>
            </div>
          </div>
        </div>

        {/* JoinKFA 기준 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">JoinKFA 기준</h3>
            <Badge variant="outline">선택</Badge>
          </div>
          
          <div className="space-y-3 pl-4 border-l-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireVerified"
                checked={rules.joinKfa.requireVerified}
                onCheckedChange={(checked) =>
                  setRules({
                    ...rules,
                    joinKfa: {
                      ...rules.joinKfa,
                      requireVerified: checked === true,
                    },
                  })
                }
              />
              <Label htmlFor="requireVerified" className="cursor-pointer">
                JoinKFA 인증됨 필수 (🟢 인증됨만 승인)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowMismatch"
                checked={rules.joinKfa.allowMismatch}
                onCheckedChange={(checked) =>
                  setRules({
                    ...rules,
                    joinKfa: {
                      ...rules.joinKfa,
                      allowMismatch: checked === true,
                    },
                  })
                }
              />
              <Label htmlFor="allowMismatch" className="cursor-pointer">
                JoinKFA 불일치 허용 (🟡 불일치도 승인 가능, 수기 확인 필요)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowNotFound"
                checked={rules.joinKfa.allowNotFound}
                onCheckedChange={(checked) =>
                  setRules({
                    ...rules,
                    joinKfa: {
                      ...rules.joinKfa,
                      allowNotFound: checked === true,
                    },
                  })
                }
              />
              <Label htmlFor="allowNotFound" className="cursor-pointer">
                JoinKFA 없음 허용 (🔴 없음도 승인 가능, 규정에 따라)
              </Label>
            </div>
          </div>
        </div>

        {/* 자동 승인 활성화 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">자동 승인</h3>
            <Badge variant={rules.autoApproveEnabled ? "default" : "secondary"}>
              {rules.autoApproveEnabled ? "활성화" : "비활성화"}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2 pl-4 border-l-2">
            <Checkbox
              id="autoApproveEnabled"
              checked={rules.autoApproveEnabled}
              onCheckedChange={(checked) =>
                setRules({
                  ...rules,
                  autoApproveEnabled: checked === true,
                })
              }
            />
            <Label htmlFor="autoApproveEnabled" className="cursor-pointer">
              규칙에 맞는 선수 자동 승인 활성화
            </Label>
          </div>
          
          {rules.autoApproveEnabled && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">자동 승인 조건:</p>
                  <p>{getRulePreview()}</p>
                  <p className="mt-2 text-xs text-blue-600">
                    규칙에 맞지 않는 선수는 "대기" 상태로 유지되며, 사무국이 수기로 승인/반려할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "저장 중..." : "규칙 저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

