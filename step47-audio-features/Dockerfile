FROM python:3.10-slim

# FFmpeg 설치 (librosa가 필요)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 설치
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 앱 코드 복사
COPY app.py ./

EXPOSE 8080

CMD ["python", "app.py"]

