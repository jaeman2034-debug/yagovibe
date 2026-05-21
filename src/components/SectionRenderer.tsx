type Executive = { name: string; role: string };

export type RenderSection =
  | { type: "intro"; title?: string; content: string; image?: string; presidentName?: string }
  | { type: "history"; title?: string; content: string }
  | { type: "vision"; title?: string; content: string }
  | { type: "activities"; title?: string; items: string[] }
  | { type: "organization"; title?: string; summary?: string; executives?: Executive[] }
  | { type: "text"; title?: string; content: string }
  | { type: "image"; title?: string; image?: string; content?: string }
  | { type: "gallery"; title?: string; images?: string[] };

export default function SectionRenderer({ section }: { section: RenderSection }) {
  if (section.type === "intro") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-4">
          <div className="rounded-2xl border bg-gray-100">
            {section.image ? (
              <div className="w-full md:max-h-[420px] flex items-start">
                <img
                  src={section.image}
                  alt="협회장 사진"
                  className="w-full h-auto md:max-h-[420px] object-contain bg-gray-100 rounded"
                />
              </div>
            ) : (
              <div className="w-full py-16 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                협회장 사진이 없습니다
              </div>
            )}
          </div>
          {section.presidentName ? (
            <div className="mt-3 text-center">
              <p className="font-semibold text-gray-900">{section.presidentName}</p>
              <p className="text-sm text-gray-500">협회장</p>
            </div>
          ) : null}
        </div>
        <div className="md:col-span-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title || "협회장 인사말"}</h2>
          <p className="whitespace-pre-line leading-7 text-gray-800">{section.content || "인사말이 없습니다."}</p>
        </div>
      </div>
    );
  }

  if (section.type === "history" || section.type === "vision" || section.type === "text") {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title || "섹션"}</h2>
        <p className="whitespace-pre-line leading-7 text-gray-800">{section.content || "내용이 없습니다."}</p>
      </div>
    );
  }

  if (section.type === "activities") {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title || "주요 활동"}</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          {section.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (section.type === "organization") {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title || "조직 구성"}</h2>
        {section.summary ? <p className="whitespace-pre-line text-gray-700 mb-4">{section.summary}</p> : null}
        {Array.isArray(section.executives) && section.executives.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.executives.map((e, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg bg-white">
                <div className="font-semibold text-gray-900">{e.name}</div>
                <div className="text-sm text-gray-600">{e.role}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">임원 정보가 없습니다.</p>
        )}
      </div>
    );
  }

  if (section.type === "image") {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title || "이미지 섹션"}</h2>
        {section.image ? (
          <img src={section.image} alt="섹션 이미지" className="w-full max-h-[520px] object-cover rounded-xl border" />
        ) : (
          <div className="w-full aspect-[16/9] rounded-xl bg-gray-100 border flex items-center justify-center text-gray-500">
            이미지가 없습니다
          </div>
        )}
        {section.content ? <p className="mt-3 whitespace-pre-line text-gray-700">{section.content}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title || "갤러리 섹션"}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {(section.images || []).map((src, i) => (
          <img key={i} src={src} alt={`갤러리 이미지 ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border" />
        ))}
      </div>
      {(!section.images || section.images.length === 0) ? (
        <p className="text-gray-500">갤러리 이미지가 없습니다.</p>
      ) : null}
    </div>
  );
}

