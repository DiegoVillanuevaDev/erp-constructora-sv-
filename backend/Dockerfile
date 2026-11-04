FROM node:20-alpine

WORKDIR /usr/src/app

# Instalar dependencias necesarias para Prisma (OpenSSL)
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Generar cliente Prisma
RUN npx prisma generate

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]

