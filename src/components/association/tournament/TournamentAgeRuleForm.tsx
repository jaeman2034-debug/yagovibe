/**
 * 🔥 대회 연령 기준 입력 폼
 * 
 * 연령 기준을 데이터로 저장하여 자동 판별에 사용
 */

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AgeRuleType = "U" | "OVER" | "OPEN";

export interface AgeRule {
  type: AgeRuleType;
  maxBirthYear?: number; // U대회 (이하)
  minBirthYear?: number; // OVER대회 (이상)
  description: string; // 화면 표시용
}

interface TournamentAgeRuleFormProps {
  value?: AgeRule;
  onChange: (rule: AgeRule) => void;
  fixedType?: AgeRuleType; // 상위에서 이미 선택된 경우 type 선택 UI 숨김
}

export function TournamentAgeRuleForm({
  value,
  onChange,
  fixedType,
}: TournamentAgeRuleFormProps) {
  // fixedType이 있으면 그것을 사용, 없으면 value에서 가져오거나 기본값
  const [type, setType] = useState<AgeRuleType>(
    fixedType || value?.type || "OPEN"
  );
  const [year, setYear] = useState<number | "">(
    value?.maxBirthYear || value?.minBirthYear || ""
  );
  const [description, setDescription] = useState(value?.description || "연령 제한 없음");
  
  // fixedType이 변경되면 type 업데이트
  useEffect(() => {
    if (fixedType) {
      setType(fixedType);
      if (fixedType === "OPEN") {
        setYear("");
      }
    }
  }, [fixedType]);

  useEffect(() => {
    let desc = "연령 제한 없음";
    let rule: AgeRule = { type: "OPEN", description: desc };

    const currentYear = new Date().getFullYear();

    if (type === "U" && year) {
      const age = currentYear - Number(year);
      desc = `U-${age} (${year}년생 이하)`;
      rule = {
        type: "U",
        maxBirthYear: Number(year),
        description: desc,
      };
    }

    if (type === "OVER" && year) {
      desc = `${year}년생 이상`;
      rule = {
        type: "OVER",
        minBirthYear: Number(year),
        description: desc,
      };
    }

    setDescription(desc);
    onChange(rule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, year]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">대회 연령 기준</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* fixedType이 있으면 type 선택 UI 숨김 (상위에서 이미 선택됨) */}
        {!fixedType && (
          <div className="space-y-2">
            <Label htmlFor="ageRuleType">대회 유형</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as AgeRuleType);
                if (v === "OPEN") {
                  setYear("");
                }
              }}
            >
              <SelectTrigger id="ageRuleType">
                <SelectValue placeholder="대회 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">연령 제한 없음</SelectItem>
                <SelectItem value="U">U대회 (이하)</SelectItem>
                <SelectItem value="OVER">OVER대회 (이상)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {fixedType && (
          <div className="text-sm text-gray-700">
            <strong>대회 유형:</strong> {fixedType === "U" ? "U-대회" : fixedType === "OVER" ? "OVER-대회" : "연령 제한 없음"}
          </div>
        )}

        {type !== "OPEN" && (
          <div className="space-y-2">
            <Label htmlFor="birthYear">
              기준 출생연도 {type === "U" ? "(이하)" : "(이상)"}
            </Label>
            <Input
              id="birthYear"
              type="number"
              placeholder="예: 2013"
              value={year}
              onChange={(e) => {
                const val = e.target.value;
                setYear(val ? Number(val) : "");
              }}
              min="1950"
              max={new Date().getFullYear()}
            />
            <p className="text-xs text-muted-foreground">
              {type === "U"
                ? "해당 연도 출생자 이하가 참가 가능합니다."
                : "해당 연도 출생자 이상이 참가 가능합니다."}
            </p>
          </div>
        )}

        <div className="rounded-lg bg-muted p-3">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            자동 생성 설명:
          </div>
          <div className="text-base font-semibold">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

