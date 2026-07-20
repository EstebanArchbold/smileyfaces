# Stage 1: Build Angular app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration=production

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
# Admin variant of the app shell: /admin/* is served with the admin manifest
# and iOS title baked into the static HTML, because iOS Safari does not
# reliably honor a <link rel=manifest> swapped at runtime by JS.
RUN sed -e 's|manifest.webmanifest|manifest-admin.webmanifest|' \
        -e 's|content="Smiley Faces"|content="SF Admin"|' \
        /usr/share/nginx/html/index.html > /usr/share/nginx/html/index-admin.html
EXPOSE 80
