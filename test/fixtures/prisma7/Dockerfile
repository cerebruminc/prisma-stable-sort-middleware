FROM node:24.19.0-trixie-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci
RUN npm install --no-save --package-lock=false prisma@7 @prisma/client@7 @prisma/adapter-pg@7 pg

COPY . .

CMD /bin/bash -c "npm run build && npm run setup:v7 && npm run test:integration:v7"
