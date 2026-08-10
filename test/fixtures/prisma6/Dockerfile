FROM node:24.19.0-trixie-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci
RUN npm install --no-save --package-lock=false prisma@6 @prisma/client@6

COPY . .

CMD /bin/bash -c "npm run build && npm run setup:v6 && npm run test:integration:v6"
