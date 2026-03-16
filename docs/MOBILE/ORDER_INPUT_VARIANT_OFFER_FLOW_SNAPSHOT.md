# Order Input Variant/Offer Flow Snapshot

This document explains how `mobile-customer` should shape cart data into `CreateOrderInput` for `createOrder`.

## Source Schema

Order input schema is defined in:
- `api/src/models/Order/Order.graphql`

Relevant input types:
- `CreateOrderInput`
- `CreateOrderItemInput`
- `CreateOrderItemOptionInput`
- `CreateOrderChildItemInput`

## Current Contract

`CreateOrderInput`:

- `items: [CreateOrderItemInput!]!`
- `dropOffLocation: LocationInput!`
- `deliveryPrice: Float!`
- `totalPrice: Float!`
- `promoCode: String`
- `driverNotes: String`

`CreateOrderItemInput`:

- `productId: ID!`
- `quantity: Int!`
- `price: Float!`
- `notes: String`
- `selectedOptions: [CreateOrderItemOptionInput!]!`
- `childItems: [CreateOrderChildItemInput!]`

`CreateOrderItemOptionInput`:

- `optionGroupId: ID!`
- `optionId: ID!`

`CreateOrderChildItemInput`:

- `productId: ID!`
- `selectedOptions: [CreateOrderItemOptionInput!]!`

## Cart -> Order Mapping

For each cart item:

- `item.productId` -> `CreateOrderItemInput.productId`
- `item.quantity` -> `CreateOrderItemInput.quantity`
- `item.unitPrice` -> `CreateOrderItemInput.price`
- `item.notes` -> `CreateOrderItemInput.notes`
- `item.selectedOptions[]` -> `CreateOrderItemInput.selectedOptions[]` (only IDs are sent)
- `item.childItems[]` -> `CreateOrderItemInput.childItems[]`

For each selected option in cart:

- `option.optionGroupId` -> `CreateOrderItemOptionInput.optionGroupId`
- `option.optionId` -> `CreateOrderItemOptionInput.optionId`

For each child item in cart:

- `child.productId` -> `CreateOrderChildItemInput.productId`
- `child.selectedOptions[]` -> `CreateOrderChildItemInput.selectedOptions[]`

## Variant Flow Snapshot

A variant is represented by the selected variant product ID in cart.

Example cart item (selected variant):

- `productId`: `variant_product_id`
- `quantity`: `2`
- `unitPrice`: `10.99`
- `selectedOptions`: optional

Order payload item becomes:

```json
{
  "productId": "variant_product_id",
  "quantity": 2,
  "price": 10.99,
  "notes": null,
  "selectedOptions": [],
  "childItems": []
}
```

## Offer Flow Snapshot

An offer is a product that can include selected options and linked child products.

Example cart item (offer):

- `productId`: `offer_product_id`
- `quantity`: `1`
- `unitPrice`: `14.99`
- `selectedOptions`:
  - `optionGroupId`: `choose_pizza_group_id`, `optionId`: `pepperoni_option_id`
  - `optionGroupId`: `choose_side_group_id`, `optionId`: `garlic_bread_option_id`
- `childItems`:
  - `productId`: `pepperoni_product_id`, `selectedOptions`: []
  - `productId`: `garlic_bread_product_id`, `selectedOptions`: []

Order payload item becomes:

```json
{
  "productId": "offer_product_id",
  "quantity": 1,
  "price": 14.99,
  "notes": null,
  "selectedOptions": [
    {
      "optionGroupId": "choose_pizza_group_id",
      "optionId": "pepperoni_option_id"
    },
    {
      "optionGroupId": "choose_side_group_id",
      "optionId": "garlic_bread_option_id"
    }
  ],
  "childItems": [
    {
      "productId": "pepperoni_product_id",
      "selectedOptions": []
    },
    {
      "productId": "garlic_bread_product_id",
      "selectedOptions": []
    }
  ]
}
```

## Pricing Notes

UI totals should include:

- base unit price (`unitPrice`)
- plus selected option extra prices
- multiplied by quantity

This keeps cart/checkout totals aligned with backend order calculations where option extras are considered.

## Practical Rule

If a choice affects what was selected for the order, it must be represented in one of:

- `selectedOptions[]` (IDs)
- `childItems[]` (product IDs + nested selected options)

Anything not represented there will not be part of the final order snapshot.
