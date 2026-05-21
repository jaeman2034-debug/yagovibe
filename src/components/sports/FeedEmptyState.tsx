import { Button } from "@/components/ui/button";

interface FeedEmptyStateProps {
  title: string;
  description?: string;
  ctaText: string;
  onClick: () => void;
  secondaryCtaText?: string;
  onSecondaryClick?: () => void;
}

export default function FeedEmptyState({
  title,
  description,
  ctaText,
  onClick,
  secondaryCtaText,
  onSecondaryClick,
}: FeedEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <p className="text-lg font-semibold text-gray-900">{title}</p>
      {description ? <p className="mt-2 text-sm text-gray-500">{description}</p> : null}
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onClick}>{ctaText}</Button>
        {secondaryCtaText && onSecondaryClick ? (
          <Button variant="outline" onClick={onSecondaryClick}>
            {secondaryCtaText}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
