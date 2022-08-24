# Ralph's Custom Shopify App Node Starter Template

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)

Hey! I'm ralph and I made this template for you to use as a starting point for your Node.js/React Shopify App.

Feel free to collaborate on this project and lets empower the Shopify Dev Community!

#### Follow Our Journey:

- [![Twitter Follow](https://img.shields.io/twitter/follow/RalphEcom?style=social)](https://twitter.com/RalphEcom)
- [![Twitter Follow](https://img.shields.io/twitter/follow/Aksel_SaaS?style=social)](https://twitter.com/aksel_saas)

## Summary

We are using yarn workspaces to segment our projects into multiple packages.
Packages found in `packages`:

- backend: contains all the code related to the backend of the app (api, database, etc)
- frontend: contains the dashboard info
- axe/common: contains cool utils that you can use anywhere in your app
- _shopify network (coming soon)_ [Will contain all the graphql queries and mutations to interact with the shopify api]

## How to setup local dev environment

- Install dependencies: `yarn install`
- Create file `.env` with the following variables:
  - MONGODB_URI: your mongodb uri
  - MONGODB_NAME: your mongodb name
- Run `yarn dev`

## Next Steps

- [ ] Add Typeorm ORM to the project with MongoDB (or maybe mongoose and lets forget typeORM?)
- [x] Implement Subscriptions (handling charging customers etc...)
- [ ] open to suggestions/more ideas!

## Bugs ?

Have a bug ? create an issue about it and I can help you

## Feature Ideas ?

Have a good idea ? create an issue about it and lets make it happen!
