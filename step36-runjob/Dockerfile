# Cloud Run jobs (Node 20)
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm i --omit=dev || true
COPY . .
CMD ["node","runjob.js"]

