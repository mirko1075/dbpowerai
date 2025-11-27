export interface StripeProduct {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
  currencySymbol: string;
}

export const stripeProducts: StripeProduct[] = [
  {
    priceId: 'price_1SWF1eAZubOyRglOEqNoSHJe',
    name: 'Web Plan',
    description: 'Advanced SQL optimization with unlimited queries and priority support',
    mode: 'subscription',
    price: 9.00,
    currency: 'eur',
    currencySymbol: '€'
  }
];