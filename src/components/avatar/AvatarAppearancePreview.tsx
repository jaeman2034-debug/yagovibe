import type { AvatarAppearance } from "@/types/avatar";
import { PlayerAvatar } from "./PlayerAvatar";

/**
 * @deprecated PR-11D 이후 `PlayerAvatar` 사용 권장. 동일 렌더 위임.
 */
export function AvatarAppearancePreview({
  appearance,
  className = "",
}: {
  appearance: AvatarAppearance;
  className?: string;
}) {
  return <PlayerAvatar appearance={appearance} variant="light" size="md" className={className} />;
}
