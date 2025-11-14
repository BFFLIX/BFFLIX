
# syntax=docker/dockerfile:1

############################
# Build stage
############################
FROM node:20-alpine AS build

WORKDIR /app

# Capture API URL at build time so Vite can inline it
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

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
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
