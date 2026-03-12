FROM node:20-alpine
RUN apk add --no-cache python3 make g++ curl
WORKDIR /app
COPY backend/webhook-service/package.json ./
COPY backend/webhook-service/src ./src
COPY backend/webhook-service/tsconfig.json ./tsconfig.json
RUN npm install
RUN npx tsc --outDir dist
CMD ["node", "dist/index.js"]
