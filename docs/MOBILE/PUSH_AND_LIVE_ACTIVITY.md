# Push And Live Activity

## What Exists Today

The repo has one production-shaped push implementation and several partial consumers.

- `mobile-customer` has the real push token registration and notification handling flow
- `mobile-driver` appears push-capable, but is not at the same maturity for richer notification features
- `mobile-business` and `mobile-admin` are much thinner here

## Customer Push Flow

The customer app currently does the important parts correctly.

- requests permission
- gets an FCM token
- registers that token with the API
- handles token refresh
- listens for foreground notifications
- routes notification taps into the app

That means standard push is not aspirational in `mobile-customer`. It is an active part of the product architecture.

## Admin And Backend Notification Surface

The notification surface now supports more than a plain text alert.

- image URL support for richer notifications
- time-sensitive behavior for urgent delivery states
- notification category values for actions and grouping
- relevance scoring for iOS ordering behavior
- campaign-style sends from the admin side

The backend and admin panel both expose these capabilities, so documentation should treat notifications as an operational system, not just a mobile detail.

## Live Activity State

Live Activity support is partially implemented.

- JavaScript hooks and backend token flows exist
- configuration flags and integration points exist in the customer app
- the repository has moved toward backend-driven Live Activity updates for delivery state

But the important constraint remains:

- do not assume the iOS native Widget Extension layer is fully production-complete unless it is verified in the actual app target and build output

In other words, standard push is real today. Live Activity support is advanced but still needs native-layer verification discipline.

## Operational Guidance

- treat FCM token registration as required infrastructure, not optional glue code
- keep notification categories aligned between client behavior and backend payloads
- validate Live Activity changes on a real iOS build, not only by reading config files
- when changing order-notification behavior, verify customer delivery alerts and admin send flows together

## Recommended Next Cleanup

- document which apps officially support which notification features
- keep Live Activity docs tied to verified native artifacts instead of aspirational notes
- add one short runbook for debugging token registration, category mismatches, and delivery-alert failures