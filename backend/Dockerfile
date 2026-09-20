FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice-writer \
      libreoffice-calc \
      libreoffice-impress \
      libreoffice-core \
      libreoffice-java-common \
      openjdk-17-jre-headless \
      fonts-dejavu \
      fonts-liberation \
      python3 \
      python3-pip \
      poppler-utils && \
    rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages --no-cache-dir pdf2docx

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

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