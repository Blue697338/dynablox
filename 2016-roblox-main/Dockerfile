# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN echo '{"serverRuntimeConfig":{"backend":{}},"publicRuntimeConfig":{"backend":{"proxyEnabled":true,"flags":{"myAccountPage2016Enabled":true,"catalogGenreFilterSupported":true,"catalogPageLimit":28,"catalogSaleCountVisibleFromDetailsEndpoint":true,"catalogDetailsPageResellerLimit":10,"avatarPageInventoryLimit":10},"baseUrl":"https://www.roblox.com","apiFormat":"https://{0}.roblox.com{1}"}}}' > config.json
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/pages ./pages
EXPOSE 3000
CMD ["npm", "start"]
