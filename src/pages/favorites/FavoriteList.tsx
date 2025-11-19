import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, HeartOff, ShoppingCart, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type SortOption = "latest" | "price";
type CategoryFilter = "all" | "electronics" | "fashion" | "home";

type FavoriteItem = {
  id: string;
  name?: string;
  imageUrl?: string | null;
  price?: number | null;
  category?: string | null;
  createdAt?: { toDate?: () => Date } | null;
};

export default function FavoriteList() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [rawFavorites, setRawFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1_000_000]);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setRawFavorites([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const baseCollection = collection(db, "users", user.uid, "favorites");
    const constraints: QueryConstraint[] = [];

    if (categoryFilter !== "all") {
      constraints.push(where("category", "==", categoryFilter));
    }

    if (sortOption === "price") {
      constraints.push(orderBy("price", "asc"));
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }

    const q = query(baseCollection, ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FavoriteItem, "id">),
        }));
        setRawFavorites(items);
        setLoading(false);
      },
      (error) => {
        console.error("찜 목록을 불러오는 중 오류가 발생했습니다.", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, sortOption, categoryFilter]);

  const favorites = useMemo(() => {
    return rawFavorites.filter((item) => {
      const price = typeof item.price === "number" ? item.price : 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });
  }, [rawFavorites, priceRange]);

  const removeFavorite = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "favorites", id));
    } catch (error) {
      console.error("찜 해제 실패:", error);
    }
  };

  const handleAddToCart = async (item: FavoriteItem) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "cart"), {
        name: item.name ?? "",
        price: item.price ?? 0,
        imageUrl: item.imageUrl ?? null,
        quantity: 1,
        createdAt: new Date(),
      });
      setAddedItemId(item.id);
      setTimeout(() => setAddedItemId((current) => (current === item.id ? null : current)), 800);
    } catch (error) {
      console.error("장바구니 추가 실패:", error);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-gray-600">
        <p className="text-lg font-semibold">로그인이 필요합니다.</p>
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-gray-500">
        ❤️ 찜한 상품이 없습니다.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">❤️ 내 찜한 상품</h1>
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                정렬: {sortOption === "latest" ? "최신순" : "가격순"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortOption("latest")}>최신순</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("price")}>가격순</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                카테고리: {categoryFilter === "all" ? "전체" : categoryFilter}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCategoryFilter("all")}>전체</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("electronics")}>전자기기</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("fashion")}>패션</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("home")}>생활용품</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-60">
            <div className="mb-1 text-sm text-gray-600 dark:text-gray-400">
              가격 범위: ₩{priceRange[0].toLocaleString()} ~ ₩{priceRange[1].toLocaleString()}
            </div>
            <Slider
              value={priceRange}
              max={1_000_000}
              step={10_000}
              onValueChange={(val) => setPriceRange(val as [number, number])}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {favorites.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="group relative overflow-hidden shadow-sm transition hover:shadow-lg">
                <CardContent className="p-4">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name ?? "favorite item"}
                      className="h-40 w-full rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-md bg-gray-200 text-sm text-gray-500">
                      이미지 없음
                    </div>
                  )}
                  <div className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {item.name ?? "이름 없는 상품"}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {typeof item.price === "number" ? `₩${item.price.toLocaleString()}` : "가격 미정"}
                  </div>
                </CardContent>

                <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Button size="icon" variant="outline" onClick={() => removeFavorite(item.id)}>
                    <HeartOff className="h-4 w-4 text-red-500" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => handleAddToCart(item)}>
                    <ShoppingCart className="h-4 w-4 text-blue-500" />
                  </Button>
                </div>

                <AnimatePresence>
                  {addedItemId === item.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 flex items-center justify-center bg-white/85"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                        <CheckCircle2 className="h-6 w-6" />
                        장바구니에 담겼습니다!
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
