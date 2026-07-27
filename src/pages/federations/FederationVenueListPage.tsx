import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { FederationHeader } from "@/components/federation/FederationHeader";
import { subscribeFederationVenues } from "@/lib/federation/venueRentalService";
import type { FederationVenue } from "@/lib/federation/venueRentalTypes";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function FederationVenueListPage() {
  const { federationSlug = "" } = useParams<{ federationSlug: string }>();
  const [venues, setVenues] = useState<FederationVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fedMeta, setFedMeta] = useState<{ name: string; region: string; logoUrl?: string }>({
    name: federationSlug,
    region: "",
  });

  useEffect(() => {
    if (!federationSlug) return;
    let cancelled = false;
    getDoc(doc(db, "federations", federationSlug)).then((snap) => {
      if (cancelled || !snap.exists()) return;
      const d = snap.data() as Record<string, unknown>;
      setFedMeta({
        name: String(d.name || federationSlug),
        region: String(d.region || ""),
        logoUrl: d.logoUrl != null ? String(d.logoUrl) : undefined,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [federationSlug]);

  useEffect(() => {
    if (!federationSlug) return;
    setLoading(true);
    return subscribeFederationVenues(
      federationSlug,
      (rows) => {
        setVenues(rows);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(e.message || "구장 목록을 불러오지 못했습니다.");
        setLoading(false);
      }
    );
  }, [federationSlug]);

  const headerFed = useMemo(
    () => ({
      id: federationSlug,
      name: fedMeta.name,
      slug: federationSlug,
      logoUrl: fedMeta.logoUrl,
      region: fedMeta.region || "노원구",
    }),
    [federationSlug, fedMeta]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <FederationHeader federation={headerFed} />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link
          to={`/federations/${federationSlug}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          협회 홈
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">축구장 대관</h1>
        <p className="mt-1 text-sm text-gray-600">노원구축구협회 구장 이용 및 대관 신청</p>

        {loading && <p className="mt-8 text-sm text-gray-500">구장을 불러오는 중…</p>}
        {error && <p className="mt-8 text-sm text-red-600">{error}</p>}

        {!loading && !error && venues.length === 0 && (
          <div className="mt-10 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
            등록된 구장이 없습니다.
          </div>
        )}

        <ul className="mt-6 space-y-3">
          {venues.map((v) => (
            <li key={v.id}>
              <Link
                to={`/federations/${federationSlug}/venues/${v.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-primary-300 hover:shadow transition"
              >
                <div className="font-semibold text-gray-900">{v.name}</div>
                {(v.address || v.fieldType) && (
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                    {v.address ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {v.address}
                      </span>
                    ) : null}
                    {v.fieldType ? <span>{v.fieldType}</span> : null}
                  </div>
                )}
                <div className="mt-3 text-sm font-medium text-primary-700">대관 현황 보기 →</div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
