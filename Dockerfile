FROM node:22-bookworm AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN npm install

COPY . .
RUN npm run build


FROM node:22-bookworm-slim AS production

WORKDIR /app

COPY --from=build /app/.output ./.output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
