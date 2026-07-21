FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm --prefix frontend ci --ignore-scripts --no-audit --no-fund
COPY frontend ./frontend
ARG VITE_USE_PROXY=true
ENV VITE_USE_PROXY=$VITE_USE_PROXY
RUN npm --prefix frontend run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /opt/app
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm --prefix backend ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && chgrp -R 0 /opt/app \
    && chmod -R g=u /opt/app
COPY backend ./backend
COPY --from=frontend-build /app/frontend/dist ./public
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
USER 1001
CMD ["node", "backend/server.js"]
