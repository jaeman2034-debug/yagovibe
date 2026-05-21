import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { db, auth, storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAddressFromLatLngThrottled } from "@/utils/getAddressFromLatLng";
import MapPickerModal from "@/components/schedule/MapPickerModal";
import { publishMarketListingToHub } from "@/services/marketListingHubSync";
import type { Sport } from "@/features/market/types";
import { normalizeSportId } from "@/constants/sports";
import { isHomeSportsCategorySportId, sportsCategories } from "@/data/sportsCategories";
import { sportChipActiveClass, sportChipInactiveClass } from "@/constants/sportChipStyles";

type CreateType = "sale" | "share" | "lost";
const MAX_IMAGES = 5;
type LocalImage = { file: File; previewUrl: string };
type SelectedLocation = { lat: number; lng: number; address: string | null };
const createTypes: CreateType[] = ["sale", "share", "lost"];

const typeLabelMap: Record<CreateType, string> = {
  sale: "상품 등록",
  share: "나눔 등록",
  lost: "유실물 등록",
};

const typeCategoryMap: Record<CreateType, string> = {
  sale: "equipment",
  share: "equipment",
  lost: "lost",
};

async function ensureAuthenticated() {
  const current = auth.currentUser;
  if (current) return current;

  return new Promise<NonNullable<typeof auth.currentUser>>((resolve, reject) => {
    let triedAnonymous = false;
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsub();
          resolve(user);
          return;
        }
        if (triedAnonymous) {
          unsub();
          reject(new Error("로그인이 필요합니다."));
          return;
        }
        triedAnonymous = true;
        signInAnonymously(auth).catch((err) => {
          unsub();
          reject(err);
        });
      },
      (err) => {
        unsub();
        reject(err);
      }
    );
  });
}

export default function MarketCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sport: sportParam = "soccer" } = useParams<{ sport: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get("type");
  const type: CreateType = createTypes.includes(typeParam as CreateType)
    ? (typeParam as CreateType)
    : "sale";
  const listCategoryParam = searchParams.get("listCategory");
  const listCategoryLabel =
    listCategoryParam === "equipment"
      ? "중고"
      : listCategoryParam === "recruit"
        ? "모집"
        : listCategoryParam === "match"
          ? "매칭"
          : listCategoryParam === "all"
            ? "전체"
            : null;
  const modeLabel = typeLabelMap[type] ?? typeLabelMap.sale;

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<LocalImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [uploadError, setUploadError] = useState<boolean[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<(string | null)[]>([]);
  const [isUploadDone, setIsUploadDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationInfo, setLocationInfo] = useState<SelectedLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showLostMapPicker, setShowLostMapPicker] = useState(false);
  const [error, setError] = useState("");
  const [selectedSportId, setSelectedSportId] = useState<Sport | null>(null);

  const navState = (location.state as { from?: "hub" | "category" | "market"; sport?: string } | null) ?? null;
  const from = navState?.from;
  const targetSport = String(navState?.sport || selectedSportId || sportParam || "soccer");

  const resolveAfterSubmitPath = () => {
    if (from === "hub") return "/hub";
    if (from === "category") return `/sports/${targetSport}`;
    return `/sports/${targetSport}/market`;
  };

  const helperText = useMemo(() => {
    if (type === "share") return "나눔은 가격 없이 등록할 수 있습니다.";
    if (type === "lost") return "유실물은 특징과 습득/분실 위치를 자세히 적어주세요.";
    return "상품명/가격/설명을 입력하고 등록하세요.";
  }, [type]);

  const isValid = useMemo(() => {
    if (!selectedSportId) return false;
    const hasName = Boolean(name.trim());
    if (!hasName) return false;
    if (type === "sale") return Boolean(price.trim());
    if (type === "lost") return Boolean(locationInfo);
    return true; // share
  }, [selectedSportId, name, price, type, locationInfo]);

  useEffect(() => {
    const n = normalizeSportId(sportParam);
    if (n && isHomeSportsCategorySportId(n)) {
      setSelectedSportId(n);
    } else {
      setSelectedSportId(null);
    }
  }, [sportParam]);

  const handleSelectSport = (next: Sport) => {
    setSelectedSportId(next);
    setError("");
    navigate(
      {
        pathname: `/sports/${encodeURIComponent(next)}/market/create`,
        search: location.search,
        state: location.state,
      },
      { replace: true }
    );
  };

  const handleChangeType = (nextType: CreateType) => {
    if (loading || nextType === type) return;
    const next = new URLSearchParams(searchParams);
    next.set("type", nextType);
    setSearchParams(next, { replace: true });
    setError("");
  };

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  useEffect(() => {
    setUploadProgress(new Array(images.length).fill(0));
    setUploadError(new Array(images.length).fill(false));
    setUploadedUrls(new Array(images.length).fill(null));
    setIsUploadDone(false);
  }, [images]);

  const handleAddImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지 업로드 가능합니다.`);
      e.target.value = "";
      return;
    }

    const nextImages = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setError("");
    setImages((prev) => [...prev, ...nextImages]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    if (loading) return;
    setImages((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const compressImage = async (file: File): Promise<File> => {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });
      return compressed as File;
    } catch {
      return file;
    }
  };

  const uploadImageWithProgress = async (file: File, userId: string, index: number): Promise<string> => {
    const compressedFile = await compressImage(file);
    const ext = compressedFile.name?.includes(".") ? compressedFile.name.split(".").pop() || "jpg" : "jpg";
    const path = `marketProducts/${userId}/${Date.now()}-${index}.${ext}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, compressedFile);

    setUploadError((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });

    return new Promise<string>((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          const percent = snapshot.totalBytes
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          setUploadProgress((prev) => {
            const next = [...prev];
            next[index] = percent;
            return next;
          });
        },
        (err) => {
          setUploadError((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
          });
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setUploadProgress((prev) => {
            const next = [...prev];
            next[index] = 100;
            return next;
          });
          setUploadedUrls((prev) => {
            const next = [...prev];
            next[index] = url;
            return next;
          });
          resolve(url);
        }
      );
    });
  };

  const retryUpload = async (index: number) => {
    if (loading || !images[index]) return;
    try {
      const user = await ensureAuthenticated();
      await uploadImageWithProgress(images[index].file, user.uid, index);
      setError("");
    } catch {
      setError("이미지 재업로드에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleGetCurrentLocation = () => {
    if (loading || isLocating) return;
    if (!navigator.geolocation) {
      setError("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
      return;
    }

    setError("");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const addr = await getAddressFromLatLngThrottled(lat, lng);
        const address = addr?.short || [addr?.si, addr?.gu, addr?.dong].filter(Boolean).join(" ") || null;
        setLocationInfo({ lat, lng, address });
        setIsLocating(false);
      },
      () => {
        setError("위치 정보를 가져오지 못했습니다. 권한을 확인해주세요.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async () => {
    setError("");
    if (!selectedSportId) {
      setError("스포츠 카테고리를 선택해주세요.");
      return;
    }
    if (!name.trim()) {
      setError("상품명을 입력해주세요.");
      return;
    }
    if (type === "sale" && !price.trim()) {
      setError("판매 등록은 가격이 필요합니다.");
      return;
    }
    if (type === "lost" && !locationInfo) {
      setError("유실물 등록은 위치 정보가 필수입니다.");
      return;
    }

    setLoading(true);
    setIsUploadDone(false);
    try {
      const user = await ensureAuthenticated();
      const urlBuffer = [...uploadedUrls];
      if (images.length > 0) {
        for (let i = 0; i < images.length; i += 1) {
          if (urlBuffer[i]) continue;
          try {
            urlBuffer[i] = await uploadImageWithProgress(images[i].file, user.uid, i);
          } catch {
            // 각 이미지 실패는 상태로 표시하고 마지막에 일괄 에러 처리
          }
        }
      }

      if (images.length > 0 && urlBuffer.some((url) => !url)) {
        setUploadedUrls(urlBuffer);
        setError("일부 이미지 업로드에 실패했습니다. 실패한 이미지에서 다시 업로드를 눌러주세요.");
        return;
      }
      const numericPrice = Number((price || "0").replace(/[^\d.-]/g, ""));
      const safePrice = Number.isFinite(numericPrice) ? numericPrice : 0;
      const finalUrls = urlBuffer.filter((url): url is string => Boolean(url));

      const docRef = await addDoc(collection(db, "marketProducts"), {
        name: name.trim(),
        price: type === "share" ? 0 : safePrice,
        description: description.trim(),
        category: typeCategoryMap[type],
        type,
        sport: selectedSportId,
        /** 홈과 동일 종목 키(필터/추천용). `category`는 거래 유형(equipment 등) 유지 */
        sportCategory: selectedSportId,
        userId: user.uid,
        imageUrl: finalUrls[0] || null,
        imageUrls: finalUrls,
        latitude: locationInfo?.lat ?? null,
        longitude: locationInfo?.lng ?? null,
        address: locationInfo?.address ?? null,
        location: locationInfo
          ? {
              lat: locationInfo.lat,
              lng: locationInfo.lng,
              address: locationInfo.address,
            }
          : null,
        createdAt: serverTimestamp(),
        viewCount: 0,
      });

      try {
        await publishMarketListingToHub({
          postId: docRef.id,
          author: user,
          sport: selectedSportId,
          title: name.trim(),
          description: description.trim(),
          price: type === "share" ? 0 : safePrice,
          images: finalUrls,
          createType: type,
          locationLabel: locationInfo?.address ?? null,
        });
      } catch (syncErr) {
        console.warn("[MarketCreatePage] 허브/activities 동기화 실패 (무시):", syncErr);
      }

      setIsUploadDone(true);
      navigate(resolveAfterSubmitPath(), { replace: true });
    } catch (err: any) {
      console.error("❌ [MarketCreatePage] 저장 실패:", err);
      setError(err?.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const overallProgress = useMemo(() => {
    if (uploadProgress.length === 0) return 0;
    const total = uploadProgress.reduce((acc, cur) => acc + cur, 0);
    return Math.round(total / uploadProgress.length);
  }, [uploadProgress]);

  return (
    <div className="mx-auto w-full max-w-none md:max-w-3xl space-y-4 px-4 pb-36 pt-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
        <h1 className="text-xl font-bold text-gray-900">🛒 {modeLabel}</h1>
        {listCategoryLabel ? (
          <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
            마켓 목록에서 &quot;{listCategoryLabel}&quot;을(를) 보고 들어왔어요. 같은 맥락으로 등록하면 검색에 잘 맞아요.
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-500">간단하게 등록하고 바로 거래하세요.</p>
        )}
        <p className="mt-1 text-xs text-gray-400">{helperText}</p>

        <section
          className="mt-4 rounded-xl border-2 border-amber-300/90 bg-amber-50/90 p-3 shadow-sm dark:border-amber-600/80 dark:bg-amber-950/30"
          aria-label="스포츠 카테고리 선택"
          data-testid="market-register-sport-picker"
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-gray-100">
              <span>스포츠 선택</span>
              <span className="text-red-500" aria-hidden>
                *
              </span>
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">필수 · 홈과 동일 종목</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {sportsCategories.map((row) => {
                const selected = selectedSportId === row.sportId;
                return (
                  <button
                    key={`${row.sportId}-${row.name}`}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSelectSport(row.sportId)}
                    title={row.name}
                    className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 text-center text-xs font-semibold transition sm:text-sm ${
                      selected ? sportChipActiveClass : sportChipInactiveClass
                    } disabled:cursor-not-allowed disabled:opacity-50 dark:disabled:opacity-50`}
                  >
                    <span className="text-lg sm:text-xl" aria-hidden>
                      {row.icon}
                    </span>
                    <span className="line-clamp-2 leading-tight">{row.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {!selectedSportId ? (
            <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
              스포츠를 선택해야 등록할 수 있습니다.
            </p>
          ) : null}
        </section>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => handleChangeType("sale")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              type === "sale" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            판매
          </button>
          <button
            type="button"
            onClick={() => handleChangeType("share")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              type === "share" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            나눔
          </button>
          <button
            type="button"
            onClick={() => handleChangeType("lost")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              type === "lost" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            유실물
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
            <label
              htmlFor="market-create-image"
              className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>📷 이미지 추가 ({images.length}/{MAX_IMAGES})</span>
              <span className="text-xs text-gray-500">최대 {MAX_IMAGES}장</span>
            </label>
            <input
              id="market-create-image"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddImages}
              disabled={loading}
            />
          </div>

          {images.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={`${img.previewUrl}-${idx}`} className="relative">
                  <img src={img.previewUrl} alt={`업로드 미리보기 ${idx + 1}`} className="h-24 w-full rounded-lg object-cover" />
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 text-xs font-semibold text-white">
                      {uploadProgress[idx] ?? 0}%
                    </div>
                  ) : null}
                  {uploadError[idx] ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-red-500/70 text-[10px] font-semibold text-white">
                      <span>실패</span>
                      <button
                        type="button"
                        onClick={() => retryUpload(idx)}
                        className="mt-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] text-white"
                      >
                        다시 업로드
                      </button>
                    </div>
                  ) : null}
                  {idx === 0 ? (
                    <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      대표
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white disabled:opacity-50"
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {images.length === 0 ? (
            <p className="mt-2 text-center text-xs text-gray-400">이미지를 추가하면 거래 성사율이 올라갑니다.</p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">첫 번째 이미지가 대표 이미지로 설정됩니다.</p>
          )}
          {loading && images.length > 0 ? (
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-gray-500">이미지 업로드 {overallProgress}%</p>
            </div>
          ) : null}

          <Input
            placeholder={type === "lost" ? "예: 검정색 축구화(좌/우 한 켤레)" : "예: 나이키 축구화 머큐리얼"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="focus-visible:ring-2 focus-visible:ring-blue-500"
          />

          {type === "sale" ? (
            <Input
              type="number"
              placeholder="예: 50,000원"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          ) : null}
          {type === "share" ? (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">💝 나눔은 무료로 제공됩니다.</p>
          ) : null}
          {type === "lost" ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">⚠️ 유실물은 발견/분실 위치를 꼭 입력해주세요.</p>
          ) : null}

          <div className="mt-1 rounded-lg border border-gray-200 p-3">
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={loading || isLocating}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLocating ? "위치 확인 중..." : "📍 현재 위치 가져오기"}
            </button>
            {locationInfo ? (
              <div className="mt-2 text-xs text-gray-500">
                <p>{locationInfo.address || "주소 변환 실패 (좌표만 저장)"}</p>
                <p className="mt-0.5">
                  위도 {locationInfo.lat.toFixed(6)} / 경도 {locationInfo.lng.toFixed(6)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400">위치를 등록하면 근처 거래 탐색에 도움이 됩니다.</p>
            )}
            {type === "lost" && !locationInfo ? (
              <p className="mt-2 text-xs font-medium text-red-500">위치 정보는 필수입니다.</p>
            ) : null}
            {type === "lost" ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowLostMapPicker(true)}
                  disabled={loading}
                  className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  🗺️ 지도에서 위치 선택
                </button>
                <p className="mt-1 text-xs text-gray-500">유실물은 지도에서 정확한 위치를 선택하면 찾기 쉬워집니다.</p>
              </div>
            ) : null}
          </div>

          <Textarea
            placeholder={
              type === "lost"
                ? "예: 상계구장 A코트 앞에서 습득. 이름 적힌 파우치 포함."
                : "예: 사용감 적고 하자 없습니다. 직거래 우선입니다."
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[120px] focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-[70] bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-[480px] p-4">
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValid}
            className="h-12 w-full rounded-2xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
          >
            {loading ? `업로드 중... ${overallProgress}%` : isUploadDone ? "등록 완료" : `${modeLabel}하기`}
          </Button>
        </div>
      </div>
      {showLostMapPicker ? (
        <MapPickerModal
          onClose={() => setShowLostMapPicker(false)}
          onSelect={(lat, lng, name) => {
            setLocationInfo({ lat, lng, address: name || null });
            setShowLostMapPicker(false);
          }}
        />
      ) : null}
    </div>
  );
}

