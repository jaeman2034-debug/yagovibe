FROM python:3.10-slim

WORKDIR /app

# 의존성 설치
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 앱 코드 복사
COPY app.py ./

# 모델 파일 (선택적, 없어도 작동)
# COPY model_quality_predictor.pkl ./

EXPOSE 8080

CMD ["python", "app.py"]

