# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json tsconfig*.json nest-cli.json ./
RUN npm ci

# Copy all source code
COPY . .

# Build NestJS app (creates dist/main.js)
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# Copy package.json and install only production dependencies
# --ignore-scripts prevents postinstall from running (which needs dev dependencies)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled app from builder
COPY --from=builder /app/dist ./dist

# Optional: copy static files if your app uses them
# COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main.js"]
