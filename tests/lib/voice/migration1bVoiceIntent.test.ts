import { describe, expect, it } from "vitest";
import { matchVoiceMapIntentLocally, resolveVoiceMapIntent } from "@/lib/voice/resolveVoiceMapIntent";

const FIXTURES = [
  { id: "canonical-map", utterance: "지도 열어줘" },
  { id: "short-map", utterance: "맵 보여줘" },
  { id: "convenience", utterance: "근처 편의점 찾아줘" },
  { id: "soccer-nlu-only", utterance: "근처 축구장" },
  { id: "abbrev-near-cafe", utterance: "주변 카페 좀" },
  { id: "compound", utterance: "지도 열고 현재 위치로" },
  { id: "date-meeting", utterance: "내일 3시 협회 회의" },
  { id: "team-venue", utterance: "중평FC 경기장 찾아줘" },
  { id: "venue-rental", utterance: "노원구장 대관" },
  { id: "polite-search", utterance: "편의점 검색 부탁해요" },
  { id: "unsupported-fee", utterance: "이번 주 회비 정산해줘" },
  { id: "natural-paraphrase", utterance: "주변에 마트 있어?" },
];

describe("MIGRATION 1B voice map intent (local + optional server)", () => {
  it("handles 12/12 fixtures locally without server", async () => {
    let pass = 0;
    for (const f of FIXTURES) {
      const r = await resolveVoiceMapIntent(f.utterance);
      if (r.handled) pass += 1;
    }
    expect(pass).toBe(12);
  });

  it("covers 1A regression utterances locally", () => {
    const regressionIds = ["date-meeting", "team-venue", "venue-rental", "unsupported-fee"];
    for (const id of regressionIds) {
      const utterance = FIXTURES.find((x) => x.id === id)!.utterance;
      const r = matchVoiceMapIntentLocally(utterance);
      expect(r.handled).toBe(true);
      expect(r.intent).not.toBe("미확인");
    }
  });
});
