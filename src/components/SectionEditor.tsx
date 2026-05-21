import { Button } from "@/components/ui/button";

export type SectionEditorKey = "intro" | "history" | "vision";

export type SectionEditorSection = {
  content: string;
  draft?: string | null;
  image?: string;
};

export type SectionEditorProps = {
  sectionKey: SectionEditorKey;
  title: string;
  section: SectionEditorSection;
  canEdit: boolean;
  onRegenerate: (key: SectionEditorKey) => void;
  onApply: (key: SectionEditorKey) => void;
  onUploadImage?: () => void;
  headerExtra?: React.ReactNode;
  /** true면 협회장 사진 크롭/줌 편집 세션이 열린 상태(큰 게시 미리보기는 숨기고 안내만) */
  introImageReplaceSessionOpen?: boolean;
};

export default function SectionEditor({
  sectionKey,
  title,
  section,
  canEdit,
  onRegenerate,
  onApply,
  onUploadImage,
  headerExtra,
  introImageReplaceSessionOpen = false,
}: SectionEditorProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
      {/* 제목 + 액션 */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {canEdit ? (
          <div className="flex flex-wrap gap-2 justify-end shrink-0">
            {headerExtra}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate(sectionKey);
              }}
            >
              AI 다시 생성
            </Button>
            {section.draft ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(sectionKey);
                }}
              >
                적용
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 이미지(인사말) */}
      {sectionKey === "intro" ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-4">
            {introImageReplaceSessionOpen ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">지금 사이트에 게시 중인 사진</p>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">
                    큰 미리보기는 아래 파란 &quot;편집 중&quot; 영역만 보시면 됩니다. 저장 후에만 여기 썸네일이 바뀝니다.
                  </p>
                </div>
                {section.image ? (
                  <img
                    src={section.image}
                    alt="현재 게시 중인 협회장 사진"
                    className="h-20 w-20 object-cover rounded-lg border bg-white shrink-0"
                  />
                ) : (
                  <p className="text-xs text-gray-500">아직 게시된 사진이 없습니다.</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900 mb-2">현재 게시 이미지</p>
                <div className="rounded-2xl border bg-gray-100 p-2">
                  {section.image ? (
                    <div className="w-full md:max-h-[420px] flex items-start">
                      <img
                        src={section.image}
                        alt="협회장 사진"
                        className="w-full h-auto md:max-h-[420px] object-contain rounded-xl bg-gray-100"
                      />
                    </div>
                  ) : (
                    <div className="w-full py-16 flex flex-col items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-xl gap-2">
                      <p>협회장 사진이 없습니다</p>
                    </div>
                  )}
                </div>
              </>
            )}
            {canEdit && onUploadImage ? (
              <div className="mt-3 space-y-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUploadImage();
                  }}
                >
                  {section.image ? "이미지 수정" : "사진 업로드"}
                </Button>
                <p className="text-xs text-gray-500 leading-snug px-0.5">
                  {introImageReplaceSessionOpen
                    ? "저장 또는 취소 후 이 안내가 다시 바뀝니다."
                    : section.image
                      ? "저장하면 미리보기·편집 화면이 닫히는 것이 정상입니다. 다시 바꾸려면 이 버튼으로 새 파일을 선택하세요."
                      : "파일을 고르면 이동·줌으로 맞춘 뒤 저장할 수 있습니다."}
                </p>
              </div>
            ) : null}
          </div>

          <div className="md:col-span-8">
            <div className="rounded-2xl border bg-white p-6">
              <p className="text-sm font-semibold text-gray-500 mb-2">현재 내용</p>
              <p className="whitespace-pre-line leading-7 text-gray-800">
                {section.content || "인사말이 아직 없습니다."}
              </p>
            </div>

            {section.draft ? (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 mt-4">
                <p className="text-sm font-semibold text-yellow-800 mb-2">AI 제안(Draft)</p>
                <p className="whitespace-pre-line leading-7 text-gray-800">{section.draft}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">현재 내용</p>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
              {section.content || "내용이 아직 없습니다."}
            </p>
          </div>
          {section.draft ? (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">AI 제안(Draft)</p>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{section.draft}</p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

