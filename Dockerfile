FROM node:18-alpine AS development

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY --from=development /usr/src/app ./
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist

CMD ["node", "dist/main"]