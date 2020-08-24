FROM node:current-alpine

WORKDIR /app

COPY package.json .

RUN yarn install

COPY . .

ENV PORT=8080

CMD ["node", "src/index.js"]
