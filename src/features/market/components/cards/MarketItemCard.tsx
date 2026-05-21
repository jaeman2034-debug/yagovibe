import { useNavigate } from "react-router-dom";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";

type ItemType = "sale" | "share" | "lost";

type Props = {
	item: {
		id: string;
		title: string;
		price?: number;
		location?: string;
		thumbnail?: string;
		type: ItemType;
		createdAt: string;
		sport?: string;
    status?: "active" | "reserved" | "done" | string;
	};
};

function formatTime(ts: string) {
	try {
		const d = new Date(ts);
		const now = new Date();
		const diff = now.getTime() - d.getTime();
		const m = Math.floor(diff / 60000);
		const h = Math.floor(diff / 3600000);
		const day = Math.floor(diff / 86400000);
		if (m < 1) return "방금 전";
		if (m < 60) return `${m}분 전`;
		if (h < 24) return `${h}시간 전`;
		if (day < 7) return `${day}일 전`;
		return d.toLocaleDateString("ko-KR");
	} catch {
		return "";
	}
}

function TypeBadge({ type }: { type: ItemType }) {
	const map: Record<ItemType, string> = {
		sale: "bg-blue-100 text-blue-600",
		share: "bg-green-100 text-green-600",
		lost: "bg-red-100 text-red-600",
	};
	const label: Record<ItemType, string> = {
		sale: "판매",
		share: "나눔",
		lost: "유실",
	};
	return <span className={`text-xs px-2 py-1 rounded ${map[type]}`}>{label[type]}</span>;
}

export default function MarketItemCard({ item }: Props) {
	const navigate = useNavigate();
	return (
		<div
			className="flex gap-3 p-3 border-b cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition"
			onClick={() => navigate(sportMarketDetailUrl(item.sport || "soccer", item.id))}
		>
			{/* 썸네일 */}
			<div className="relative w-24 h-24 flex-shrink-0">
				{item.thumbnail ? (
					<>
						<img src={item.thumbnail} className="w-full h-full object-cover rounded-lg" />
						{/* 타입 뱃지 오버레이 */}
						<span className="absolute top-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
							{item.type === "sale" ? "판매" : item.type === "share" ? "나눔" : "유실"}
						</span>
            {/* 상태 뱃지 오버레이 (우상단) */}
            {item.status === "reserved" && (
              <span className="absolute top-1 right-1 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                예약중
              </span>
            )}
            {item.status === "done" && (
              <span className="absolute top-1 right-1 text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                완료
              </span>
            )}
					</>
				) : (
					<div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg text-xs text-gray-400">
						이미지 없음
					</div>
				)}
			</div>

			{/* 텍스트 영역 */}
			<div className="flex flex-col flex-1 justify-between">
				<p className="font-medium text-sm line-clamp-1">{item.title}</p>
				<p className="text-xs text-gray-500">{item.location || "위치 미정"} · {formatTime(item.createdAt)}</p>
				<div className="flex items-center justify-between">
					<p className="font-bold text-base text-gray-900">
						{item.type === "sale" && (item.price ? `${item.price.toLocaleString()}원` : "")}
						{item.type === "share" && "무료 나눔"}
						{item.type === "lost" && "유실물"}
					</p>
					<TypeBadge type={item.type} />
				</div>
			</div>
		</div>
	);
}

