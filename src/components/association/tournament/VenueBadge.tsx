/**
 * 경기장 배지 컴포넌트
 * 짧은 표기 + 툴팁으로 전체 명칭 표시
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { getVenueById, type VenueId } from "@/types/venue";

interface VenueBadgeProps {
  venueId?: VenueId | string;
  venueName?: string; // 하위 호환성
  className?: string;
}

export function VenueBadge({ venueId, venueName, className = "" }: VenueBadgeProps) {
  const venue = venueId ? getVenueById(venueId as VenueId) : null;
  const displayName = venue?.shortName || venueName || "미정";
  const fullName = venue?.name || venueName;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <MapPin className="w-3 h-3" />
      <Badge
        variant="outline"
        className="text-xs"
        title={fullName && fullName !== displayName ? fullName : undefined}
      >
        {displayName}
      </Badge>
    </div>
  );
}

