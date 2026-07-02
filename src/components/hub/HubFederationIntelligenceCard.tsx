import { FederationIntelligenceSection } from "@/components/ai-growth/FederationIntelligenceSection";

type Props = {
  className?: string;
};

export function HubFederationIntelligenceCard({ className }: Props) {
  return <FederationIntelligenceSection className={className} />;
}
