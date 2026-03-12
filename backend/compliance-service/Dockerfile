FROM node:20-alpine
RUN apk add --no-cache python3 make g++ curl
WORKDIR /app
COPY backend/compliance-service/package.json ./
COPY backend/compliance-service/src ./src
COPY backend/compliance-service/tsconfig.json ./tsconfig.json
COPY sdk ./sdk
RUN npm install
RUN npx tsc --outDir dist
CMD ["node", "dist/index.js"]
