/**
 * 선수 추가 버튼
 */

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AddPlayerButtonProps {
  onClick: () => void;
}

export function AddPlayerButton({ onClick }: AddPlayerButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="w-full mb-4"
      variant="outline"
    >
      <Plus className="w-4 h-4 mr-2" />
      선수 추가
    </Button>
  );
}
