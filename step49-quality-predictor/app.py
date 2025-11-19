"""
Step 49: 품질 예측 API (Digital Twin Simulator)
ML 모델을 사용하여 튜닝 파라미터의 효과를 예측
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import numpy as np
import os
from typing import Optional

app = FastAPI()

# 모델 로드 (실제 모델 파일이 없으면 간단한 선형 회귀 사용)
try:
    import joblib
    MODEL_PATH = os.getenv("MODEL_PATH", "model_quality_predictor.pkl")
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        USE_MODEL = True
    else:
        USE_MODEL = False
        print(f"⚠️ 모델 파일이 없습니다: {MODEL_PATH}. 간단한 선형 회귀를 사용합니다.")
except ImportError:
    USE_MODEL = False
    print("⚠️ joblib이 없습니다. 간단한 선형 회귀를 사용합니다.")


class Features(BaseModel):
    snr_db: float
    speech_blocks_per_min: float
    coverage: float
    gaps: int
    overlaps: int
    vad_aggressiveness: str = "medium"
    noise_suppression: str = "normal"


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": USE_MODEL,
    }


@app.post("/predict")
async def predict(f: Features):
    """
    튜닝 파라미터를 기반으로 품질 점수를 예측합니다.
    
    Args:
        f: Features 모델 (SNR, 발화 속도, 커버리지, gaps, overlaps, VAD, 노이즈 억제)
    
    Returns:
        {
            "predicted_score": 예상 품질 점수 (0.0 ~ 1.0),
            "confidence": 예측 신뢰도 (0.0 ~ 1.0)
        }
    """
    try:
        # 범주형 인코딩
        vad_map = {"low": 0, "medium": 1, "high": 2}
        ns_map = {"weak": 0, "normal": 1, "strong": 2}

        # 입력 특징 벡터 구성
        X = np.array([[
            f.snr_db,
            f.speech_blocks_per_min,
            f.coverage,
            f.gaps,
            f.overlaps,
            vad_map.get(f.vad_aggressiveness, 1),
            ns_map.get(f.noise_suppression, 1),
        ]])

        if USE_MODEL:
            # 실제 모델 사용
            y_pred = model.predict(X)[0]
            # 예측 신뢰도 (간단히 표준편차 사용, 실제로는 모델에 따라 다름)
            confidence = 0.85  # 기본값
        else:
            # 간단한 선형 회귀 (실제 모델이 없을 때)
            # 가중치: SNR(0.3), Coverage(0.4), Gaps(-0.1), Overlaps(-0.1), VAD(0.1), NS(0.1)
            weights = np.array([0.3, 0.0, 0.4, -0.1, -0.1, 0.1, 0.1])
            
            # 정규화 (SNR: 0-30, speech_blocks: 0-200, coverage: 0-1, gaps: 0-20, overlaps: 0-20)
            normalized = np.array([
                f.snr_db / 30.0,
                f.speech_blocks_per_min / 200.0,
                f.coverage,
                max(0, 1 - f.gaps / 20.0),
                max(0, 1 - f.overlaps / 20.0),
                vad_map.get(f.vad_aggressiveness, 1) / 2.0,
                ns_map.get(f.noise_suppression, 1) / 2.0,
            ])
            
            y_pred = np.dot(weights, normalized) + 0.5  # 기본값 0.5
            y_pred = np.clip(y_pred, 0.0, 1.0)  # 0-1 범위로 제한
            confidence = 0.7  # 간단한 모델이므로 낮은 신뢰도

        return {
            "predicted_score": float(y_pred),
            "confidence": confidence,
            "model_used": "actual" if USE_MODEL else "linear",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예측 실패: {str(e)}")


@app.post("/predict_batch")
async def predict_batch(features_list: list[Features]):
    """
    여러 시나리오를 한 번에 예측합니다 (멀티 시나리오 비교용).
    
    Args:
        features_list: Features 리스트
    
    Returns:
        예측 결과 리스트
    """
    results = []
    for f in features_list:
        try:
            result = await predict(f)
            results.append({
                "features": f.dict(),
                "predicted_score": result["predicted_score"],
                "confidence": result["confidence"],
            })
        except Exception as e:
            results.append({
                "features": f.dict(),
                "error": str(e),
            })
    return {"results": results}


@app.post("/reload-model")
async def reload_model(req: dict):
    """
    GCS에서 새로운 모델을 로드합니다.
    
    Args:
        req: {"model_url": "gs://bucket/path/to/model.pkl"} 또는 {"model_url": "https://..."}
    
    Returns:
        {"status": "ok", "model_loaded": "model_url"}
    """
    global model, USE_MODEL
    
    try:
        model_url = req.get("model_url")
        if not model_url:
            raise HTTPException(status_code=400, detail="model_url이 필요합니다")
        
        import requests
        import tempfile
        
        # GCS URL을 HTTP URL로 변환 (공개 버킷인 경우)
        if model_url.startswith("gs://"):
            # GCS 공개 URL로 변환
            parts = model_url.replace("gs://", "").split("/", 1)
            bucket_name = parts[0]
            blob_name = parts[1] if len(parts) > 1 else ""
            http_url = f"https://storage.googleapis.com/{bucket_name}/{blob_name}"
        else:
            http_url = model_url
        
        # 모델 다운로드
        response = requests.get(http_url, timeout=60)
        response.raise_for_status()
        
        # 임시 파일에 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pkl") as f:
            f.write(response.content)
            temp_path = f.name
        
        # 모델 로드
        import joblib
        model = joblib.load(temp_path)
        USE_MODEL = True
        
        # 임시 파일 삭제
        try:
            os.unlink(temp_path)
        except:
            pass
        
        return {
            "status": "ok",
            "model_loaded": model_url,
            "model_path": temp_path if os.path.exists(temp_path) else "loaded",
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모델 로드 실패: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)

