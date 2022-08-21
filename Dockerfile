FROM node:18-alpine

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV NODE_ENV production
EXPOSE 8081
WORKDIR /app
COPY web .
RUN yarn install
RUN cd packages/api && yarn build
CMD ["yarn", "serve"]