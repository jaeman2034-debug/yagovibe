import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, PlusCircle, Save, Upload, X } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebaseConfig";

type AdminProduct = {
  id: number;
  title: string;
  price: string;
  location: string;
  image: string;
  description: string;
};

type FormState = Omit<AdminProduct, "id"> & { id: number | null };

const INITIAL_PRODUCTS: AdminProduct[] = [
  {
    id: 1,
    title: "MacBook Air M2",
    price: "1490000",
    location: "서울",
    image: "/img/mac1.jpg",
    description: "M2 칩 탑재 노트북",
  },
];

const INITIAL_FORM: FormState = {
  id: null,
  title: "",
  price: "",
  location: "",
  image: "",
  description: "",
};

export default function AdminDashboard() {
  const [products, setProducts] = useState<AdminProduct[]>(INITIAL_PRODUCTS);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const lowered = search.toLowerCase();
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(lowered) ||
        product.location.toLowerCase().includes(lowered)
    );
  }, [products, search]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditing(false);
    setFile(null);
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.price.trim()) return;

    if (editing && form.id !== null) {
      setProducts((prev) =>
        prev.map((product) =>
          product.id === form.id ? { ...(product as any), ...form, id: form.id } : product
        )
      );
    } else {
      setProducts((prev) => [
        ...prev,
        {
          id: Date.now(),
          title: form.title,
          price: form.price || "0",
          location: form.location,
          image: form.image,
          description: form.description,
        },
      ]);
    }
    resetForm();
  };

  const handleEdit = (item: AdminProduct) => {
    setForm(item);
    setEditing(true);
    setFile(null);
    setPreview(item.image || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      setProducts((prev) => prev.filter((product) => product.id !== id));
      if (form.id === id) {
        resetForm();
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${file.name}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((prev) => ({ ...prev, image: url }));
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setPreview(url);
      setFile(null);
      setUploading(false);
      alert("✅ 이미지 업로드가 완료되었습니다.");
    } catch (error) {
      console.error(error);
      alert("❌ 이미지 업로드에 실패했습니다.");
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 transition-colors duration-300 dark:bg-gray-950">
      <header className="mx-auto mb-6 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            🛠 관리자 상품 관리 대시보드
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            상품을 등록·수정·삭제하고 미리보기까지 한 번에 관리하세요.
          </p>
        </div>
        <input
          type="search"
          placeholder="상품명 또는 지역 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mb-10 w-full max-w-6xl space-y-4 rounded-2xl bg-white p-6 shadow-md transition dark:bg-gray-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            {editing ? "상품 수정" : "상품 등록"}
          </h2>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-red-500 transition hover:text-red-600"
            >
              취소
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="상품명"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-lg border border-gray-200 bg-white p-3 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            required
          />
          <input
            type="number"
            placeholder="가격 (원)"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            className="rounded-lg border border-gray-200 bg-white p-3 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            required
          />
          <input
            type="text"
            placeholder="지역"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            className="rounded-lg border border-gray-200 bg-white p-3 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <input
            type="text"
            placeholder="이미지 URL"
            value={form.image}
            onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
            className="rounded-lg border border-gray-200 bg-white p-3 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full max-w-md text-sm text-gray-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-600 hover:file:bg-primary-100 dark:text-gray-300 dark:file:bg-gray-700 dark:file:text-gray-100"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "업로드 중..." : "이미지 업로드"}
            </button>
            {preview && (
              <button
                type="button"
                onClick={() => {
                  if (preview.startsWith("blob:")) {
                    URL.revokeObjectURL(preview);
                  }
                  setPreview(null);
                  setFile(null);
                  setForm((prev) => ({ ...prev, image: "" }));
                }}
                className="flex items-center gap-1 text-xs text-red-500 transition hover:text-red-600"
              >
                <X className="h-3 w-3" />
                미리보기 제거
              </button>
            )}
          </div>
        </div>

        {preview && (
          <img
            src={preview}
            alt="preview"
            className="h-40 w-40 rounded-xl object-cover"
          />
        )}

        <textarea
          placeholder="상품 설명"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-white p-3 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-white transition-all duration-200 hover:scale-[1.02] hover:bg-primary-600 active:scale-[0.98]"
        >
          {editing ? <Save className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
          {editing ? "수정 완료" : "상품 등록"}
        </button>
      </form>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((item) => (
          <article
            key={item.id}
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-md transition hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900"
          >
            <img
              src={item.image || "/img/placeholder.jpg"}
              alt={item.title}
              loading="lazy"
              className="mb-3 h-44 w-full rounded-xl object-cover transition duration-300 group-hover:scale-[1.01]"
            />
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{item.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.location || "-"}</p>
            <p className="text-base font-semibold text-primary-500">
              {Number.isNaN(Number(item.price))
                ? `${item.price || "0"}원`
                : `${Number(item.price).toLocaleString()}원`}
            </p>
            <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
              {item.description || "등록된 설명이 없습니다."}
            </p>

            <div className="absolute right-3 top-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleEdit(item)}
                className="rounded-lg bg-yellow-400/80 p-2 text-white transition hover:bg-yellow-400"
                aria-label="수정"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="rounded-lg bg-red-500/80 p-2 text-white transition hover:bg-red-500"
                aria-label="삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}

        {filteredProducts.length === 0 && (
          <p className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
            조건에 맞는 상품이 없습니다. 새로운 상품을 등록해 보세요.
          </p>
        )}
      </section>
    </div>
  );
}

