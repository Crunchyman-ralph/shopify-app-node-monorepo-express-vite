FROM node:18-alpine

ENV SHOPIFY_API_KEY $SHOPIFY_API_KEY
EXPOSE 8081
WORKDIR /app
COPY web .
RUN yarn install
RUN yarn workspace backend build
CMD ["yarn", "workspace", "backend", "run", "serve"]
