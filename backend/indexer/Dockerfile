FROM node:20-alpine
RUN apk add --no-cache python3 make g++ curl
WORKDIR /app
COPY backend/indexer/package.json ./
COPY backend/indexer/src ./src
COPY backend/indexer/tsconfig.json ./tsconfig.json
RUN npm install
RUN npx tsc --outDir dist
CMD ["node", "dist/index.js"]
