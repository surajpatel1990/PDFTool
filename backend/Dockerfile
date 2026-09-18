FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice-writer \
      libreoffice-calc \
      libreoffice-impress \
      libreoffice-core \
      default-jre-headless \
      fonts-dejavu \
      fonts-liberation && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1001 appuser
RUN mkdir -p /app && chown -R appuser:appuser /app /tmp

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3000
CMD ["node", "server.js"]