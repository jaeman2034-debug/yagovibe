#!/usr/bin/env python3
"""
Step 35: Forced Alignment - 문장 정밀 싱크 + Firestore 자동 갱신 파이프라인

faster-whisper로 단어 단위 타임스탬프 추출
리포트 본문 문장과 오디오 단어 스트림을 그리디 매칭해 각 문장의 [start,end] 자동 생성
결과를 Firestore의 reports/{id}.sentenceTimestamps로 바로 업데이트
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from faster_whisper import WhisperModel
    from pydub import AudioSegment
    import requests
    from tqdm import tqdm
except ImportError as e:
    print(f"❌ 필수 패키지가 설치되지 않았습니다: {e}")
    print("pip install faster-whisper google-cloud-firestore pydub tqdm requests")
    sys.exit(1)

# Google Cloud Firestore (선택적)
try:
    from google.cloud import firestore
    FIRESTORE_AVAILABLE = True
except ImportError:
    FIRESTORE_AVAILABLE = False
    firestore = None


def split_sentences(text: str) -> list[str]:
    """문장 분할"""
    # 문장 끝 구분자: . ! ? 。！？\n
    pattern = r'(?<=[.!?。！？\n])\s+'
    sentences = [s.strip() for s in re.split(pattern, text) if s.strip()]
    return sentences


def download_audio(url: str, output_path: str) -> str:
    """오디오 파일 다운로드"""
    print(f"📥 오디오 다운로드 중: {url}")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    print(f"✅ 다운로드 완료: {output_path}")
    return output_path


def ensure_wav(audio_path: str) -> str:
    """오디오를 WAV 형식으로 변환 (faster-whisper 호환)"""
    if audio_path.lower().endswith('.wav'):
        return audio_path
    
    print(f"🔄 오디오 변환 중: {audio_path}")
    audio = AudioSegment.from_file(audio_path)
    wav_path = audio_path.rsplit('.', 1)[0] + '.wav'
    audio.export(wav_path, format="wav")
    print(f"✅ 변환 완료: {wav_path}")
    return wav_path


def transcribe_words(wav_path: str, model_size: str = "base") -> list[dict]:
    """faster-whisper로 단어 단위 타임스탬프 추출"""
    print(f"🎤 Whisper 모델 로딩 중... (모델: {model_size})")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    
    print("🔍 음성 인식 중...")
    segments, info = model.transcribe(wav_path, word_timestamps=True, language="ko")
    
    words = []
    for segment in tqdm(segments, desc="단어 추출"):
        for word in segment.words:
            words.append({
                "word": word.word.strip(),
                "start": word.start,
                "end": word.end,
                "probability": word.probability
            })
    
    return words


def align_sentences(sentences: list[str], words: list[dict]) -> list[dict]:
    """문장과 단어 스트림을 그리디 매칭하여 문장별 타임스탬프 생성"""
    print(f"🔗 문장 정렬 중... ({len(sentences)} 문장, {len(words)} 단어)")
    
    sentence_ts = []
    word_idx = 0
    
    for sent_idx, sentence in enumerate(sentences):
        # 문장을 단어로 분리 (한글/영어/숫자)
        sent_words = re.findall(r'\b\w+\b', sentence.lower())
        
        if not sent_words:
            # 단어가 없는 문장 (구두점만)
            sentence_ts.append({
                "text": sentence,
                "start": 0.0,
                "end": 0.0
            })
            continue
        
        # 문장의 첫 단어 찾기
        start_idx = None
        for i in range(word_idx, len(words)):
            if words[i]["word"].lower() == sent_words[0]:
                start_idx = i
                break
        
        if start_idx is None:
            # 매칭 실패 - 이전 문장의 끝 시간 사용
            prev_end = sentence_ts[-1]["end"] if sentence_ts else 0.0
            sentence_ts.append({
                "text": sentence,
                "start": prev_end,
                "end": prev_end
            })
            continue
        
        # 문장의 마지막 단어 찾기 (그리디 매칭)
        end_idx = start_idx
        sent_word_idx = 0
        
        for i in range(start_idx, len(words)):
            if sent_word_idx < len(sent_words) and words[i]["word"].lower() == sent_words[sent_word_idx]:
                sent_word_idx += 1
                end_idx = i
                if sent_word_idx >= len(sent_words):
                    break
        
        # 타임스탬프 설정
        start_time = words[start_idx]["start"]
        end_time = words[end_idx]["end"] if end_idx > start_idx else words[start_idx]["end"]
        
        sentence_ts.append({
            "text": sentence,
            "start": round(start_time, 3),
            "end": round(end_time, 3)
        })
        
        word_idx = end_idx + 1
        
        # 진행 상황 출력
        if (sent_idx + 1) % 10 == 0:
            print(f"  {sent_idx + 1}/{len(sentences)} 문장 정렬 완료")
    
    return sentence_ts


def update_firestore(project_id: str, report_id: str, sentence_ts: list[dict]):
    """Firestore에 sentenceTimestamps 업데이트"""
    if not FIRESTORE_AVAILABLE:
        raise SystemExit("google-cloud-firestore가 필요합니다. pip install google-cloud-firestore")
    
    print(f"📝 Firestore 업데이트 중: reports/{report_id}")
    client = firestore.Client(project=project_id)
    doc_ref = client.collection("reports").document(report_id)
    
    doc_ref.update({
        "sentenceTimestamps": sentence_ts
    })
    
    print(f"✅ Firestore 업데이트 완료: {len(sentence_ts)} 문장")


def main():
    ap = argparse.ArgumentParser(description="Step 35: Forced Alignment - 문장 정밀 싱크")
    ap.add_argument("--report-id", required=True, help="리포트 문서 ID")
    ap.add_argument("--audio-url", required=True, help="오디오 파일 URL")
    ap.add_argument("--content-file", help="리포트 본문 파일 경로 (--pull-firestore 미사용 시 필수)")
    ap.add_argument("--pull-firestore", action="store_true", help="Firestore에서 본문 가져오기")
    ap.add_argument("--project-id", help="Firebase 프로젝트 ID (--pull-firestore 또는 --update-firestore 사용 시 필수)")
    ap.add_argument("--update-firestore", action="store_true", help="결과를 Firestore에 업데이트")
    ap.add_argument("--out-json", default="alignment_result.json", help="출력 JSON 파일 경로")
    ap.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large"], 
                    help="Whisper 모델 크기 (기본: base)")
    
    args = ap.parse_args()

    # 본문 가져오기
    if args.pull_firestore:
        if not FIRESTORE_AVAILABLE:
            raise SystemExit("google-cloud-firestore가 필요합니다. pip install google-cloud-firestore")
        
        if not args.project_id:
            raise SystemExit("--project-id가 필요합니다")
        
        client = firestore.Client(project=args.project_id)
        snap = client.collection("reports").document(args.report_id).get()
        
        if not snap.exists:
            raise SystemExit(f"Firestore 문서가 없습니다: reports/{args.report_id}")
        
        content = snap.to_dict().get("content", "") or snap.to_dict().get("summary", "")
        
        if not content:
            raise SystemExit("문서에 content 또는 summary 필드가 없습니다")
    else:
        if not args.content_file or not os.path.exists(args.content_file):
            raise SystemExit(f"--content-file 경로가 유효하지 않습니다: {args.content_file}")
        
        with open(args.content_file, "r", encoding="utf-8") as f:
            content = f.read()

    # 문장 분할
    sentences = split_sentences(content)
    print(f"📄 문장 수: {len(sentences)}")

    # 오디오 다운로드 및 변환
    os.makedirs("./.tmp", exist_ok=True)
    audio_path = download_audio(args.audio_url, f"./.tmp/{args.report_id}.mp3")
    wav_path = ensure_wav(audio_path)

    # ASR (단어 타임스탬프)
    print("🎤 Whisper 추출 중...")
    words = transcribe_words(wav_path, model_size=args.model)
    print(f"✅ 단어 수: {len(words)}")

    # 문장 정렬
    sentence_ts = align_sentences(sentences, words)
    
    print("\n📊 정렬 결과 (상위 5개):")
    for i, s in enumerate(sentence_ts[:5]):
        print(f"  {i+1:03d}: {s['start']:.2f}~{s['end']:.2f}s | {s['text'][:80]}")

    # 저장
    out = {
        "reportId": args.report_id,
        "sentenceTimestamps": sentence_ts
    }
    
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\n✅ 정렬 결과 저장: {args.out_json}")

    # Firestore 반영
    if args.update_firestore:
        if not args.project_id:
            raise SystemExit("--project-id가 필요합니다")
        
        update_firestore(args.project_id, args.report_id, sentence_ts)

    # 임시 파일 정리
    try:
        if os.path.exists(wav_path) and wav_path != audio_path:
            os.remove(wav_path)
        if os.path.exists(audio_path):
            os.remove(audio_path)
        print("🧹 임시 파일 정리 완료")
    except Exception as e:
        print(f"⚠️ 임시 파일 정리 실패: {e}")


if __name__ == "__main__":
    main()

