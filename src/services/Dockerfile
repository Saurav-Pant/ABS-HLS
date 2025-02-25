# FROM --platform=linux/amd64 node:18-slim

# RUN apt-get update && \
#     apt-get install -y \
#     ffmpeg \
#     curl \
#     python3 && \
#     apt-get clean && \
#     rm -rf /var/lib/apt/lists/*

# WORKDIR /usr/src/app

# COPY package*.json ./
# RUN npm install --legacy-peer-deps

# COPY . .

# RUN mkdir -p /tmp/transcoding && \
#     chmod 777 /tmp/transcoding

# RUN chmod +x /usr/src/app/entrypoint.sh

# ENV NODE_ENV=production
# ENV TEMP_DIR=/tmp/transcoding

# EXPOSE 3000

# HEALTHCHECK --interval=30s \
#             --timeout=10s \
#             --start-period=30s \
#             --retries=3 \
#             CMD curl -f http://localhost:3000/health || exit 1

# ENTRYPOINT ["/usr/src/app/entrypoint.sh"]


FROM node:18-slim

RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p /tmp/videos

CMD ["node", "index.js"]
