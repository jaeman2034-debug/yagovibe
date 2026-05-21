/**
 * 🔥 심판 운영 가이드 PDF 생성 버튼
 * Step 2: 심판용 1페이지 매뉴얼 (실무 보호용)
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { generateRefereeGuidePdf } from "@/utils/refereeGuidePdf";

interface RefereeGuideButtonProps {
  tournamentName: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function RefereeGuideButton({
  tournamentName,
  variant = "secondary",
  size = "default",
}: RefereeGuideButtonProps) {
  const handleGenerateGuide = () => {
    generateRefereeGuidePdf(tournamentName);
  };

  return (
    <Button
      onClick={handleGenerateGuide}
      variant={variant}
      size={size}
      className="w-full sm:w-auto"
    >
      <FileText className="w-4 h-4 mr-2" />
      심판 운영 가이드 PDF
    </Button>
  );
}

