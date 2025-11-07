# apps/backend/Dockerfile
FROM node:18

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif-dev \
    librsvg2-2 \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
