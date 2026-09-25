# Stage 1: build the static web app with Expo.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Expo inlines EXPO_PUBLIC_* variables into the JS bundle at build time, so the
# core-api URL must be passed as a build argument, not a runtime env var.
ARG EXPO_PUBLIC_API_BASE
RUN test -n "$EXPO_PUBLIC_API_BASE" || (echo "Set --build-arg EXPO_PUBLIC_API_BASE=https://<core-api-host>" && exit 1)
ENV EXPO_PUBLIC_API_BASE=$EXPO_PUBLIC_API_BASE
RUN npx expo export --platform web --clear --output-dir dist

# Stage 2: serve the static files with nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
