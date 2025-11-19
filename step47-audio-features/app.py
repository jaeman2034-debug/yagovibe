"""
Step 47: 오디오 특징 추출 API
음원 URL을 받아 SNR, RMS, Spectral Centroid, ZCR, 말속도 등을 산출
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import tempfile
import os
import math
import librosa
import numpy as np
import soundfile as sf
import requests
from typing import Optional

app = FastAPI()


class Req(BaseModel):
    audio_url: str
    target_sr: int = 16000


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(req: Req):
    """
    오디오 URL을 분석하여 특징을 추출합니다.
    
    Returns:
        {
            "sr": 샘플링 레이트,
            "duration_sec": 길이 (초),
            "rms_mean": RMS 평균,
            "zcr_mean": ZCR 평균,
            "centroid_mean": 스펙트럼 센트로이드 평균,
            "snr_db": SNR (dB),
            "speech_blocks_per_min": 발화 블록 수 (분당)
        }
    """
    temp_path = None
    try:
        # 오디오 다운로드
        r = requests.get(req.audio_url, stream=True, timeout=60)
        r.raise_for_status()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as f:
            for chunk in r.iter_content(1024 * 256):
                if chunk:
                    f.write(chunk)
            temp_path = f.name
        
        # 오디오 로드 (librosa가 포맷 자동 인식)
        y, sr = librosa.load(temp_path, sr=req.target_sr, mono=True)
        
        # 오디오 길이
        duration_sec = len(y) / sr
        
        # 프레임 파라미터
        frame_len = 2048
        hop = 512
        
        # RMS (Root Mean Square) - 신호 강도
        rms = librosa.feature.rms(y=y, frame_length=frame_len, hop_length=hop)[0]
        
        # ZCR (Zero Crossing Rate) - 주파수 변화율
        zcr = librosa.feature.zero_crossing_rate(y, frame_length=frame_len, hop_length=hop)[0]
        
        # Spectral Centroid - 스펙트럼 중심 주파수
        sc = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0]
        
        # SNR (Signal-to-Noise Ratio) 계산
        # 간이 방법: 신호 에너지 대비 저에너지 프레임(노이즈) 추정
        energy = rms ** 2
        thr = np.percentile(energy, 20)  # 하위 20%를 노이즈로 추정
        noise = energy[energy <= thr].mean() if np.any(energy <= thr) else energy.mean() * 0.2
        signal = energy.mean()
        snr_db = 10 * np.log10(max(signal, 1e-9) / max(noise, 1e-9))
        
        # 말속도 추정 (대략)
        # 무성구간을 공백으로 보고 유성/무성 전이로 발화 블록 수 추정
        # 분당 블록수 ≈ WPM 근사
        voiced = energy > (energy.mean() * 0.3)
        transitions = np.where(np.diff(voiced.astype(int)) == 1)[0]  # 시작점
        blocks_per_min = (len(transitions) / (duration_sec / 60)) if duration_sec > 0 else 0
        
        return {
            "sr": int(sr),
            "duration_sec": float(duration_sec),
            "rms_mean": float(rms.mean()),
            "zcr_mean": float(zcr.mean()),
            "centroid_mean": float(sc.mean()),
            "snr_db": float(snr_db),
            "speech_blocks_per_min": float(blocks_per_min),
        }
        
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"오디오 다운로드 실패: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"오디오 분석 실패: {str(e)}")
    finally:
        # 임시 파일 삭제
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)

