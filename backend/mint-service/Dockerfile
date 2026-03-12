FROM node:20-alpine
RUN apk add --no-cache python3 make g++ curl
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src
COPY tsconfig.json ./tsconfig.json
RUN npx tsc --outDir dist
CMD ["node", "dist/index.js"]
