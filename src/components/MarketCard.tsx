import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ko";

import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  id: string;
  imageUrl?: string | null;
  name: string;
  price?: number;
  region?: string | null;
  location?: string | null;
  distance?: string | null;
  distanceKm?: number;
  createdAt?: { toDate?: () => Date } | null;
};

dayjs.extend(relativeTime);
dayjs.locale("ko");

export default function MarketCard({ id, imageUrl, name, price, region, location, distance, distanceKm, createdAt }: Props) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, "marketProducts", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.aiSummary) setAiSummary(data.aiSummary);
        }
      } catch {
        // ignore
      }
    })();
  }, [id]);

  const priceLabel = useMemo(() => {
    if (typeof price === "number" && !Number.isNaN(price)) {
      return `${price.toLocaleString()}원`;
    }
    return "가격 미정";
  }, [price]);

  const locationLabel = useMemo(() => {
    if (region) return region;
    if (location) return location;
    if (distance) return distance;
    return "KR";
  }, [region, location, distance]);

  const timeAgo = useMemo(() => {
    const date = createdAt?.toDate?.();
    if (!date) return "방금 전";
    return dayjs(date).fromNow();
  }, [createdAt]);

  return (
    <div className="flex w-full flex-row items-center gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm md:flex-col md:items-start md:gap-2 md:p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex-shrink-0 w-32 overflow-hidden rounded-xl aspect-square md:w-full md:aspect-[4/3]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "data:image/svg+xml;utf8," +
                  encodeURIComponent(
                    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='14'>no image</text></svg>`
                  );
              }}
            className="w-32 h-32 max-w-[8rem] max-h-[8rem] rounded-xl object-cover flex-shrink-0 md:w-full md:h-48 md:max-w-full md:max-h-[12rem] md:object-contain"
            />
          ) : (
          <Skeleton className="w-32 h-32 max-w-[8rem] max-h-[8rem] rounded-xl md:h-48 md:w-full md:max-w-full md:max-h-[12rem] md:rounded-2xl" />
        )}
      </div>

      <div className="flex flex-col justify-center text-left text-sm md:mt-2 md:w-full">
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-gray-100">{name}</h3>
        <p className="mt-1 text-gray-700 dark:text-gray-300">{priceLabel}</p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {locationLabel} · {timeAgo}
            </p>
        {typeof distanceKm === "number" && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            🚶 현재 위치에서 약 {distanceKm.toFixed(1)}km
          </p>
        )}
        {aiSummary && <p className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">🧠 {aiSummary}</p>}
      </div>
    </div>
  );
}
