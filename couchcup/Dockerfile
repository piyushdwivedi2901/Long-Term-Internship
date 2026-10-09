# Single-service production image: Express API + the built frontend, one origin.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:server && npm prune --omit=dev
ENV NODE_ENV=production PORT=4300 DB_FILE=/data/couchcup.sqlite
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 4300
HEALTHCHECK CMD node -e "fetch('http://localhost:4300/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# JWT_SECRET must be provided at runtime, e.g. docker run -e JWT_SECRET=...
CMD ["node", "server/index.ts"]
