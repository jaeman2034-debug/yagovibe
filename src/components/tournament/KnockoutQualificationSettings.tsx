/**
 * 🔥 본선 진출 규칙 설정 컴포넌트
 * 
 * 설정 항목:
 * - 각 조 상위 N팀 진출
 * - 동률 처리 기준 (승점, 득실차, 다득점, 추첨)
 * - 같은 조 1·2위 회피 규칙
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type { KnockoutQualificationRule } from "@/types/tournament";

interface KnockoutQualificationSettingsProps {
  initialRule?: KnockoutQualificationRule;
  onSave: (rule: KnockoutQualificationRule) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

const DEFAULT_RULE: KnockoutQualificationRule = {
  teamsPerGroup: 2,
  tiebreakerOrder: ["points", "goalDifference", "goalsFor", "draw"],
  avoidSameGroupInFirstRound: true,
};

export function KnockoutQualificationSettings({
  initialRule,
  onSave,
  onCancel,
  disabled = false,
}: KnockoutQualificationSettingsProps) {
  const [rule, setRule] = useState<KnockoutQualificationRule>(
    initialRule || DEFAULT_RULE
  );
  const [tiebreakerOrder, setTiebreakerOrder] = useState<string[]>(
    rule.tiebreakerOrder || DEFAULT_RULE.tiebreakerOrder
  );

  const handleSave = () => {
    onSave({
      ...rule,
      tiebreakerOrder: tiebreakerOrder as KnockoutQualificationRule["tiebreakerOrder"],
    });
  };

  const addTiebreaker = (type: string) => {
    if (!tiebreakerOrder.includes(type)) {
      setTiebreakerOrder([...tiebreakerOrder, type]);
    }
  };

  const removeTiebreaker = (index: number) => {
    setTiebreakerOrder(tiebreakerOrder.filter((_, i) => i !== index));
  };

  const moveTiebreaker = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const newOrder = [...tiebreakerOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setTiebreakerOrder(newOrder);
    } else if (direction === "down" && index < tiebreakerOrder.length - 1) {
      const newOrder = [...tiebreakerOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setTiebreakerOrder(newOrder);
    }
  };

  const tiebreakerLabels: Record<string, string> = {
    points: "승점",
    goalDifference: "득실차",
    goalsFor: "다득점",
    headToHead: "상대전적",
    draw: "추첨",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>본선 진출 규칙 설정</CardTitle>
        <CardDescription>
          조별리그 종료 후 본선 진출팀을 자동으로 선별하는 규칙을 설정합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 각 조 상위 N팀 진출 */}
        <div className="space-y-2">
          <Label htmlFor="teamsPerGroup">각 조 상위 진출 팀 수</Label>
          <Input
            id="teamsPerGroup"
            type="number"
            min="1"
            max="4"
            value={rule.teamsPerGroup}
            onChange={(e) =>
              setRule({ ...rule, teamsPerGroup: parseInt(e.target.value) || 1 })
            }
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            각 조에서 상위 몇 팀이 본선에 진출할지 설정합니다. (기본값: 2팀)
          </p>
        </div>

        {/* 동률 처리 기준 */}
        <div className="space-y-2">
          <Label>동률 처리 기준 (우선순위 순서)</Label>
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              동일한 승점일 때 순위를 결정하는 기준을 우선순위 순서대로 설정합니다.
            </AlertDescription>
          </Alert>

          {/* 현재 순서 표시 */}
          <div className="space-y-2 mt-3">
            {tiebreakerOrder.map((type, index) => (
              <div
                key={`${type}-${index}`}
                className="flex items-center gap-2 p-2 border rounded-lg"
              >
                <span className="text-sm font-medium w-8">{index + 1}.</span>
                <span className="flex-1 text-sm">{tiebreakerLabels[type]}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTiebreaker(index, "up")}
                    disabled={disabled || index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTiebreaker(index, "down")}
                    disabled={disabled || index === tiebreakerOrder.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTiebreaker(index)}
                    disabled={disabled || tiebreakerOrder.length <= 1}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 추가 옵션 */}
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground mb-2 block">
              추가 기준 선택
            </Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(tiebreakerLabels).map(([type, label]) => (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTiebreaker(type)}
                  disabled={disabled || tiebreakerOrder.includes(type)}
                >
                  + {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 같은 조 1·2위 회피 규칙 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="avoidSameGroup"
            checked={rule.avoidSameGroupInFirstRound}
            onCheckedChange={(checked) =>
              setRule({ ...rule, avoidSameGroupInFirstRound: checked as boolean })
            }
            disabled={disabled}
          />
          <Label
            htmlFor="avoidSameGroup"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            같은 조 1·2위는 첫 경기에서 만나지 않음
          </Label>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          예: A조 1위 vs B조 2위, B조 1위 vs A조 2위 (공정성 확보)
        </p>

        {/* 저장/취소 버튼 */}
        {!disabled && (
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              저장
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="flex-1">
                취소
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

