# Notifications

## What Exists Today

Push notifications in this repo are already a real system, not a placeholder.
- direct push sends from the admin panel
- saved notification campaigns with audience targeting
	including image/category/time-sensitive/relevance fields from the saved campaign
- api/src/services/NotificationService.ts
- api/src/services/UserQueryService.ts
- admin-panel/src/app/dashboard/notifications/page.tsx
- admin-panel/src/components/notifications/QueryBuilder.tsx
- admin-panel/src/graphql/operations/notifications.ts
	businessId
- registerDeviceToken stores the FCM token, platform, device id, and app type
- unregisterDeviceToken removes a token
If you plan to support the same user on multiple devices reliably, this is one of the first things to revisit.

- optional imageUrl
- optional timeSensitive flag
- optional category

- calls notificationService.sendToUsers(..., 'ADMIN_ALERT')


- title
- query JSON from the query builder

Then it can:

- preview the matching audience
- send the campaign later

### 4. Promotion Assignment Flow
That path:

- assigns a promotion to selected users
- can optionally send a push notification afterward
- currently uses category promotion for the optional follow-up push

Operationally, this is a hybrid growth-and-operations workflow, not just a marketing tool.

### Campaigns Tab

- reusable targeting rules
Use it when you want:

- immediate send to selected users
- operational notifications to specific people
- richer payload fields like image and time-sensitive mode
This is the assign-and-optionally-notify workflow.

Use it when you want:

- to grant a promotion first
- optionally follow with a push to the same selected audience
The query builder UI is the core of the campaign-targeting system.

It builds nested JSON groups shaped like this:

text
		{ "field": "role", "op": "eq", "value": "CUSTOMER" },
		{ "field": "totalOrders", "op": "gte", "value": "5" },
		{
			"operator": "OR",
			"rules": [
		}
	]
}

### Supported UI Fields

- role
- email
- firstName
- lastName
- createdAt
- totalOrders
- deliveredOrders
- cancelledOrders
- totalSpend
- avgOrderValue
- firstOrderAt
- lastOrderAt
- lastDeliveredAt

These are grouped into User and Behavior categories in the UI.

### Backend-Supported Fields

The backend UserQueryService supports one more field that the current UI does not expose:

- businessId

That means the backend can already filter by businessId, but the admin query builder cannot currently construct that rule without manual JSON editing.


### Grouping Behavior

The query builder supports nested groups with AND and OR logic.

When a campaign is sent, the backend:

- loads the saved campaign
- rejects sending unless status is DRAFT
- marks it as SENDING

### Preview Behavior

PreviewCampaignAudience returns:

- count of matched users

## Notification Payload Capabilities

### Backend-Supported Fields
- imageUrl
- timeSensitive
- category
- relevanceScore

- text fields: eq, ne, contains, startsWith, endsWith

This gap has been closed for the core push payload fields.

- timeSensitive
- category
- relevanceScore

The remaining work in this area is more about reporting, targeting, and delivery visibility than payload shape.

- title
### 4. Query Builder And Query Engine Are Still Slightly Out Of Sync

That is not a blocker, but it is a sign that query-builder work should still be treated as a full-stack change, not only a frontend one.

So if you want richer push payloads for saved campaigns, the schema, admin form, repository model, and sendCampaign path all need to be extended together.
- add operator support for in if you need list-based segmentation

NotificationRepository.upsertDeviceToken deletes existing tokens for the user before inserting the new one.

- improve campaign reporting so admins can see which rich-payload options were used and how sends performed by platform
- consider app-type or platform targeting if campaigns need to diverge across customer, driver, or business apps

The backend records notification rows for targeted users, but that is not the same thing as confirmed device display.
- campaign targeted count
- FCM accepted sends
- actual user-device delivery or interaction

### 4. Query Builder And Query Engine Are Slightly Out Of Sync

The backend already knows about businessId and in, but the current UI does not expose them.

That is not a blocker, but it is a sign that query-builder work should be treated as a full-stack change, not only a frontend one.

## What To Watch If You Work On The Notifications Tab

- expose businessId if business-targeted campaigns matter
- show a clearer human-readable audience summary before saving
- consider saved segments if the same audience logic will be reused often
- add category to campaign drafts
- add timeSensitive to campaign drafts
- add relevanceScore to campaign drafts if iOS ordering matters for campaigns

### Observability Improvements For Notifications

- log campaign id through the full send path
- use `/health/realtime` when you need a human-readable summary of websocket and pubsub activity during notification-driven realtime updates
- scrape `/metrics` for `pubsub_publish_total` and `pubsub_publish_failures_total` to see whether notification-related topic traffic is flowing cleanly

## Recommended Practical Workflow

Use this mental model when working in this system.
Use Direct send.

Best for:

- urgent admin messages

### For reusable targeted broadcasts

Use Campaigns.

Best for:

- targeting rules like all customers with more than five orders
- previewing audience before send
- keeping an audit trail of what was sent

### For promotion-based outreach

Use Promotions.

Best for:

- assigning promotions to a selected audience
- pairing promotion assignment with optional push messaging

## Recommended Next Documentation And Code Work

If notifications are going to be a focus area, the strongest next implementation sequence is:

1. bring campaign payload fields up to parity with direct-send payload fields
2. decide whether token storage should support true multi-device users
3. improve query-builder field and operator coverage
4. add better delivery diagnostics to the admin UI

That sequence will remove the biggest practical limitations without overcomplicating the system.