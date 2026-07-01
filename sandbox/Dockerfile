FROM node:22-alpine

RUN apk add --no-cache git curl

WORKDIR /app

EXPOSE 3000

CMD ["sh", "-c", "if [ -f package.json ]; then npm install && npm run dev; else echo 'No project yet'; fi"]
