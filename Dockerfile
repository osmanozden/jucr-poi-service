FROM node:18-alpine3.19 AS development
RUN apk add --no-cache --upgrade apk-tools
RUN apk upgrade --no-cache
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

FROM node:18-alpine3.19 AS builder
RUN apk add --no-cache --upgrade apk-tools
RUN apk upgrade --no-cache
WORKDIR /usr/src/app
COPY --from=development /usr/src/app ./
RUN npm run build

FROM node:18-alpine3.19 AS production
RUN apk add --no-cache --upgrade apk-tools
RUN apk upgrade --no-cache
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /usr/src/app/dist ./dist
CMD ["node", "dist/main"]