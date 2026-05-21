import { memo } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import type { MarketProduct } from "@/types/market";

// 이미지 컴포넌트 (React.memo로 re-render 방지)
const ProductImage = memo(({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    className="w-full h-full object-cover select-none shadow-none bg-transparent"
    loading="eager"
    decoding="sync"
    draggable={false}
  />
));

ProductImage.displayName = "ProductImage";

interface ProductGalleryProps {
  images: string[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  product: MarketProduct;
  productId: string | undefined;
  isOwner: boolean;
  onEdit: () => void;
  onStatusChange: (status: "reserved" | "done" | "open") => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function ProductGallery({
  images,
  activeIndex,
  onIndexChange,
  product,
  productId,
  isOwner,
  onEdit,
  onStatusChange,
  onDelete,
}: ProductGalleryProps) {
  return (
    <div className="relative p-0 bg-transparent w-full lg:w-1/2 flex justify-center">
      <div className="w-full max-w-[600px] aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
        {images.length > 0 ? (
          <ProductImage src={images[activeIndex]} alt={product.name} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            이미지가 없습니다.
          </div>
        )}
      </div>

      {/* 수정/삭제 메뉴 버튼 (이미지 우측 상단 고정) */}
      {isOwner && (
        <div className="absolute top-2 right-2 z-[100]" style={{ pointerEvents: 'auto' }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all active:scale-95"
                aria-label="상품 관리"
              >
                <MoreVertical className="w-5 h-5 text-gray-700" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={onEdit}
                disabled={product?.status === "done"}
                className="cursor-pointer"
              >
                <span className="mr-2">✏️</span>
                수정
              </DropdownMenuItem>
              {product && product.status !== "reserved" && product.status !== "done" && (
                <DropdownMenuItem
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "이 상품을 예약중으로 변경하시겠습니까?\n\n예약중으로 변경하면 다른 사용자가 구매할 수 없습니다."
                    );
                    if (confirmed) {
                      await onStatusChange("reserved");
                    }
                  }}
                  className="cursor-pointer"
                >
                  <span className="mr-2">🔒</span>
                  예약중으로 변경
                </DropdownMenuItem>
              )}
              {product && product.status === "reserved" && (
                <>
                  <DropdownMenuItem
                    onClick={async () => {
                      const confirmed = window.confirm(
                        "이 상품을 거래완료로 변경하시겠습니까?\n\n거래완료로 변경하면 더 이상 수정할 수 없습니다."
                      );
                      if (confirmed) {
                        await onStatusChange("done");
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">✅</span>
                    거래완료로 변경
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      const confirmed = window.confirm("이 상품을 다시 판매중으로 변경하시겠습니까?");
                      if (confirmed) {
                        await onStatusChange("open");
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">🔓</span>
                    다시 판매중으로 변경
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={onDelete}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <span className="mr-2">🗑️</span>
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 좌우 네비게이션 */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-6 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white transition backdrop-blur-md"
            onClick={() => onIndexChange(activeIndex === 0 ? images.length - 1 : activeIndex - 1)}
          >
            ◀
          </button>
          <button
            type="button"
            className="absolute right-6 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white transition backdrop-blur-md"
            onClick={() => onIndexChange(activeIndex === images.length - 1 ? 0 : activeIndex + 1)}
          >
            ▶
          </button>
        </>
      )}

      {/* 하단 도트 */}
      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-full backdrop-blur-sm w-max mx-auto">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`h-1.5 w-1.5 rounded-full transition ${
                idx === activeIndex ? "bg-white" : "bg-white/60"
              }`}
              onClick={() => onIndexChange(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
