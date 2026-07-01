import { ParentHomeGrowthCardV2 } from "@/components/ai-growth/ParentHomeGrowthCardV2";

type Props = {
  className?: string;
};

/** @deprecated D-4.4-c — ParentHomeGrowthCardV2로 통합 */
export function ParentHomeAvatarGrowthCard(props: Props) {
  return <ParentHomeGrowthCardV2 {...props} />;
}
