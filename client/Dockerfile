
# syntax=docker/dockerfile:1

############################
# Build stage
############################
FROM node:20-alpine AS build

WORKDIR /app

# Capture Vite env variables at build time so Vite can inline them
# These names MUST match what your React code uses:
# - import.meta.env.VITE_API_BASE_URL
# - import.meta.env.VITE_TMDB_API_KEY
ARG VITE_API_BASE_URL
ARG VITE_TMDB_API_KEY

# Expose them as real env vars for the Vite build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_TMDB_API_KEY=${VITE_TMDB_API_KEY}

# Install dependencies separately for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the client source and build
COPY . .
RUN npm run build

############################
# Runtime stage
############################
FROM nginx:1.27-alpine AS runtime

# Remove default nginx site definition
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA-friendly nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
