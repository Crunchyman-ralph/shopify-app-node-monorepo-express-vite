import { Shopify } from '@shopify/shopify-api';
import { GraphqlClient } from '@shopify/shopify-api/dist/clients/graphql';

export const BillingInterval = {
  OneTime: 'ONE_TIME',
  Every30Days: 'EVERY_30_DAYS',
  Annual: 'ANNUAL',
};

const RECURRING_INTERVALS = new Set([
  BillingInterval.Every30Days,
  BillingInterval.Annual,
]);

let isProd: boolean;

/**
 * You may want to charge merchants for using your app. This helper provides that function by checking if the current
 * merchant has an active one-time payment or subscription named `chargeName`. If no payment is found,
 * this helper requests it and returns a confirmation URL so that the merchant can approve the purchase.
 *
 * Learn more about billing in our documentation: https://shopify.dev/apps/billing
 */
export default async function ensureBilling(
  session: any,
  { chargeName, amount, currencyCode, interval }: any,
  isProdOverride = process.env.NODE_ENV === 'production'
) {
  if (!Object.values(BillingInterval).includes(interval)) {
    throw `Unrecognized billing interval '${interval}'`;
  }

  isProd = isProdOverride;

  let hasPayment;
  let confirmationUrl = null;

  if (await hasActivePayment(session, { chargeName, interval })) {
    hasPayment = true;
  } else {
    hasPayment = false;
    confirmationUrl = await requestPayment(session, {
      chargeName,
      amount,
      currencyCode,
      interval,
    });
  }

  return [hasPayment, confirmationUrl];
}

const hasActivePayment = async (
  session: { shop: string; accessToken: string | undefined },
  { chargeName, interval }: { chargeName: any; interval: any }
) => {
  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);

  if (isRecurring(interval)) {
    const currentInstallations = await client.query({
      data: RECURRING_PURCHASES_QUERY,
    });
    const subscriptions =
      currentInstallations.body.data.currentAppInstallation.activeSubscriptions;

    for (let i = 0, len = subscriptions.length; i < len; i++) {
      if (
        subscriptions[i].name === chargeName &&
        (!isProd || !subscriptions[i].test)
      ) {
        return true;
      }
    }
  } else {
    let purchases;
    let endCursor = null;
    do {
      const currentInstallations = await client.query({
        data: {
          query: ONE_TIME_PURCHASES_QUERY,
          variables: { endCursor },
        },
      });
      purchases =
        currentInstallations.body.data.currentAppInstallation.oneTimePurchases;

      for (let i = 0, len = purchases.edges.length; i < len; i++) {
        const node = purchases.edges[i].node;
        if (
          node.name === chargeName &&
          (!isProd || !node.test) &&
          node.status === 'ACTIVE'
        ) {
          return true;
        }
      }

      endCursor = purchases.pageInfo.endCursor;
    } while (purchases.pageInfo.hasNextPage);
  }

  return false;
};

const requestPayment = async (
  session: { shop: string; accessToken: string | undefined },
  {
    chargeName,
    amount,
    currencyCode,
    interval,
  }: { chargeName: any; amount: any; currencyCode: any; interval: any }
) => {
  const client = new Shopify.Clients.Graphql(session.shop, session.accessToken);
  const returnUrl = `https://${Shopify.Context.HOST_NAME}?shop=${
    session.shop
  }&host=${Buffer.from(`${session.shop}/admin`).toString('base64')}`;

  let data;
  if (isRecurring(interval)) {
    const mutationResponse = await requestRecurringPayment(client, returnUrl, {
      chargeName,
      amount,
      currencyCode,
      interval,
    });
    data = mutationResponse.body.data.appSubscriptionCreate;
  } else {
    const mutationResponse = await requestSinglePayment(client, returnUrl, {
      chargeName,
      amount,
      currencyCode,
    });
    data = mutationResponse.body.data.appPurchaseOneTimeCreate;
  }

  if (data.userErrors.length) {
    throw new ShopifyBillingError(
      'Error while billing the store',
      data.userErrors
    );
  }

  return data.confirmationUrl;
};

const requestRecurringPayment = async (
  client: GraphqlClient,
  returnUrl: string,
  {
    chargeName,
    amount,
    currencyCode,
    interval,
  }: { chargeName: any; amount: any; currencyCode: any; interval: any }
) => {
  const mutationResponse = await client.query({
    data: {
      query: RECURRING_PURCHASE_MUTATION,
      variables: {
        name: chargeName,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                interval,
                price: { amount, currencyCode },
              },
            },
          },
        ],
        returnUrl,
        test: !isProd,
      },
    },
  });

  if (mutationResponse.body.errors && mutationResponse.body.errors.length) {
    throw new ShopifyBillingError(
      'Error while billing the store',
      mutationResponse.body.errors
    );
  }

  return mutationResponse;
};

const requestSinglePayment = async (
  client,
  returnUrl,
  { chargeName, amount, currencyCode }
) => {
  const mutationResponse = await client.query({
    data: {
      query: ONE_TIME_PURCHASE_MUTATION,
      variables: {
        name: chargeName,
        price: { amount, currencyCode },
        returnUrl,
        test: process.env.NODE_ENV !== 'production',
      },
    },
  });

  if (mutationResponse.body.errors && mutationResponse.body.errors.length) {
    throw new ShopifyBillingError(
      'Error while billing the store',
      mutationResponse.body.errors
    );
  }

  return mutationResponse;
};

const isRecurring = (interval) => {
  return RECURRING_INTERVALS.has(interval);
};

export const ShopifyBillingError = (message: string, errorData: any) => {
  this.name = 'ShopifyBillingError';
  this.stack = new Error('Shopify Billing Error').stack;

  this.message = message;
  this.errorData = errorData;
};
ShopifyBillingError.prototype = new Error();

const RECURRING_PURCHASES_QUERY = `
  query appSubscription {
    currentAppInstallation {
      activeSubscriptions {
        name, test
      }
    }
  }
`;

const ONE_TIME_PURCHASES_QUERY = `
  query appPurchases($endCursor: String) {
    currentAppInstallation {
      oneTimePurchases(first: 250, sortKey: CREATED_AT, after: $endCursor) {
        edges {
          node {
            name, test, status
          }
        }
        pageInfo {
          hasNextPage, endCursor
        }
      }
    }
  }
`;

const RECURRING_PURCHASE_MUTATION = `
  mutation test(
    $name: String!
    $lineItems: [AppSubscriptionLineItemInput!]!
    $returnUrl: URL!
    $test: Boolean
  ) {
    appSubscriptionCreate(
      name: $name
      lineItems: $lineItems
      returnUrl: $returnUrl
      test: $test
    ) {
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

const ONE_TIME_PURCHASE_MUTATION = `
  mutation test(
    $name: String!
    $price: MoneyInput!
    $returnUrl: URL!
    $test: Boolean
  ) {
    appPurchaseOneTimeCreate(
      name: $name
      price: $price
      returnUrl: $returnUrl
      test: $test
    ) {
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;
