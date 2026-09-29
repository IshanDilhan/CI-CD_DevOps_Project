FROM node:22-bookworm-slim AS build
WORKDIR /src/react/client
COPY react/client/package*.json ./
RUN npm ci
COPY react/client/ ./
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production SERVER_PORT=5000
WORKDIR /app
COPY nodejs/server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY nodejs/server/app.js nodejs/server/db.js ./
COPY ATTRIBUTION.md ./ATTRIBUTION.md
COPY --from=build /src/react/client/build ./public
USER node
EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=4s --start-period=20s --retries=6 CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "app.js"]
