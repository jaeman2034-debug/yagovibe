# 협회 연혁 — 파일 가져오기 & AI 정리

## Firestore / Storage

- **표시 필드**: `federations/{slug}.history` (문자열)
- **원본 파일 보관**: `federations/{slug}/files/history.pdf` | `history.docx` | `history.txt`  
  - 업로드 시 확장자에 맞게 저장 (한 종류만 유지; 새 업로드로 덮어씀)

## Cloud Function

- **`refineFederationHistory`** — 입력 `{ rawText }`, 출력 `{ history }`  
- 배포: `firebase deploy --only functions:refineFederationHistory`

## 클라이언트

- `src/lib/extractDocumentText.ts` — PDF(`pdfjs-dist`), DOCX(`mammoth`), TXT
- `HistoryEditModal` — 연혁 수정 시 파일 업로드 · 기존 불러오기 · AI 재정리

## UX

1. **파일에서 가져오기** → Storage 저장 → 추출 → AI 정리 → textarea
2. **기존 파일 불러오기** → Storage의 `history.*` 중 존재하는 파일로 동일 처리
3. **AI로 다시 정리** — 현재 편집 중인 텍스트 기준 재호출
4. **추출 원문** / **편집본** 전환 및 **원문으로 되돌리기**
