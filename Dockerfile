FROM ghcr.io/puppeteer/puppeteer:24.17.1

USER root
RUN apt-get update && apt-get install -y --no-install-recommends fonts-noto-core fonts-noto-extra fonts-dejavu-core fonts-noto-color-emoji && rm -rf /var/lib/apt/lists/*

RUN install -d -o pptruser -g pptruser /home/pptruser/app
WORKDIR /home/pptruser/app

COPY --chown=pptruser:pptruser package*.json tsconfig.json ./

USER pptruser
RUN npm ci

COPY --chown=pptruser:pptruser prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY --chown=pptruser:pptruser src ./src
RUN npm run build

RUN npm prune --omit=dev --no-audit --no-fund --no-optional --no-save

COPY --chown=pptruser:pptruser entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

CMD ["./entrypoint.sh"]