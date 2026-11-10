FROM docker.io/library/node:22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM docker.io/library/nginx:1.29-alpine
# Rendered by the nginx image's entrypoint (envsubst) into /etc/nginx/conf.d/.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# EHRbase base URL as seen from inside the container.
ENV EHRBASE_URL=http://host.containers.internal:8081
EXPOSE 80
