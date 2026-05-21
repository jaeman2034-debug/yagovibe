import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAssociation, type AssociationDoc, type AssociationPayload, updateAssociation } from "@/services/associationService";
import { useAuth } from "@/context/AuthProvider";

type AssociationFormProps = {
  initialData?: AssociationDoc | null;
  mode: "create" | "edit";
};

export default function AssociationForm({ initialData, mode }: AssociationFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [sport, setSport] = useState("축구");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    setName(initialData?.name ?? "");
    setSport(initialData?.sport ?? "축구");
    setRegion(initialData?.region ?? "");
    setDescription(initialData?.description ?? "");
    setLogoUrl(initialData?.logoUrl ?? "");
  }, [initialData]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !sport.trim() || !region.trim()) return;

    const payload: AssociationPayload = {
      name: name.trim(),
      sport: sport.trim(),
      region: region.trim(),
      description: description.trim(),
      logoUrl: logoUrl.trim(),
    };

    setSubmitting(true);
    try {
      let associationId = initialData?.id ?? "";
      if (mode === "create") {
        if (!user?.uid) {
          alert("로그인이 필요합니다.");
          return;
        }
        associationId = await createAssociation({ ...payload, ownerUid: user.uid });
      } else {
        if (!associationId) {
          alert("협회 ID가 없습니다.");
          return;
        }
        await updateAssociation(associationId, payload);
      }
      navigate(`/association/${associationId}`);
    } catch (error) {
      console.error("[AssociationForm] 저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">협회명</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">종목</label>
        <input value={sport} onChange={(e) => setSport(e.target.value)} className="w-full rounded-md border px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">지역</label>
        <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-md border px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">대표 이미지 URL</label>
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full rounded-md border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border px-3 py-2 min-h-28" />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 text-white py-3 font-semibold disabled:opacity-50"
      >
        {submitting ? "저장 중..." : mode === "create" ? "협회 생성" : "수정 저장"}
      </button>
    </form>
  );
}

