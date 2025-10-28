import { Link } from "react-router-dom";

type Props = {
    id: string;
    title: string;
    image: string;
    price?: number | null;
    aiCategory?: string | null;
    aiTags?: string[];
};

export default function ProductCard({ id, title, image, price, aiCategory, aiTags }: Props) {
    return (
        <Link
            to={`/market/${id}`}
            className="rounded-lg border bg-white dark:bg-gray-800 overflow-hidden hover:shadow-md transition"
        >
            <img src={image} alt={title} className="w-full aspect-square object-cover" />
            <div className="p-3 space-y-1">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
                {aiCategory && <p className="text-xs text-gray-500 dark:text-gray-400">📦 {aiCategory}</p>}
                {aiTags && aiTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {aiTags.slice(0, 3).map((t: string, idx: number) => (
                            <span
                                key={idx}
                                className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded"
                            >
                                #{t}
                            </span>
                        ))}
                    </div>
                )}
                <div className="text-blue-600 dark:text-blue-400 font-bold">
                    {price ? `${price.toLocaleString()}원` : "가격 미정"}
                </div>
            </div>
        </Link>
    );
}

