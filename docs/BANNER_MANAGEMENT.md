# Banner Management System

**Last Updated:** 2026-04-11  
**Status:** ✅ Production Ready  
**Related:** [MDS Index](./MDS_INDEX.md), [Architecture](./ARCHITECTURE.md)

---

## Overview

The Banner Management System allows platform administrators to create, schedule, and manage promotional banners across the delivery platform. Banners can be tied to specific businesses, products, or promotions and can be scheduled to display at specific times and locations within the app.

## Features

### Core Capabilities

1. **Multi-Media Support**
   - Images (JPG, PNG, WebP)
   - Animated GIFs
   - Video content

2. **Smart Targeting**
   - Business-specific banners
   - Product-specific banners
   - Promotion-specific banners
   - Global banners (all users)

3. **Display Context**
   - HOME: Main home page carousel
   - BUSINESS: Business detail pages
   - CATEGORY: Category browsing pages
   - PRODUCT: Product detail pages
   - CART: Shopping cart page
   - ALL: Display on all pages

4. **Scheduling**
   - Start date/time configuration
   - End date/time configuration
   - Always-on (no dates set)
   - Automatic activation/deactivation

5. **Management Features**
   - Drag-and-drop ordering
   - Active/inactive toggle
   - Quick filtering
   - Relationship indicators
   - Preview thumbnails

### Web Customer Home Rendering

- Home requests `getActiveBanners(displayContext: HOME)`.
- Carousel displays API banners when at least one active banner is returned.
- Carousel displays local template banners when the API returns an empty list, so the slider area is always visible in web-customer.

---

## Database Schema

### Table: `banners`

```sql
CREATE TABLE banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  title text,
  subtitle text,
  image_url text NOT NULL,
  media_type banner_media_type NOT NULL DEFAULT 'IMAGE', -- IMAGE, GIF, VIDEO
  
  -- Relationships
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  
  -- Legacy Link Configuration (backward compatible)
  link_type text, -- 'business', 'product', 'category', 'promotion', 'external', 'none'
  link_target text, -- ID or URL depending on link_type
  
  -- Display Configuration
  display_context banner_display_context NOT NULL DEFAULT 'HOME',
  -- HOME, BUSINESS, CATEGORY, PRODUCT, CART, ALL
  
  -- Scheduling
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  
  -- Ordering and Status
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  
  -- Soft Delete
  is_deleted boolean NOT NULL DEFAULT false,
  
  -- Metadata
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_banners_business_id ON banners(business_id);
CREATE INDEX idx_banners_product_id ON banners(product_id);
CREATE INDEX idx_banners_promotion_id ON banners(promotion_id);
CREATE INDEX idx_banners_display_context ON banners(display_context);
CREATE INDEX idx_banners_active_scheduled ON banners(is_active, starts_at, ends_at);
```

### Enums

```sql
-- Media type options
CREATE TYPE banner_media_type AS ENUM ('IMAGE', 'GIF', 'VIDEO');

-- Display context options
CREATE TYPE banner_display_context AS ENUM (
  'HOME',
  'BUSINESS',
  'CATEGORY',
  'PRODUCT',
  'CART',
  'ALL'
);
```

---

## GraphQL API

### Types

```graphql
enum BannerMediaType {
  IMAGE
  GIF
  VIDEO
}

enum BannerDisplayContext {
  HOME
  BUSINESS
  CATEGORY
  PRODUCT
  CART
  ALL
}

type Banner {
  id: ID!
  title: String
  subtitle: String
  imageUrl: String!
  mediaType: BannerMediaType!
  
  # Relationships
  businessId: ID
  business: Business
  productId: ID
  product: Product
  promotionId: ID
  promotion: Promotion
  
  # Display
  displayContext: BannerDisplayContext!
  
  # Scheduling
  startsAt: DateTime
  endsAt: DateTime
  
  # Status
  sortOrder: Int!
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### Queries

#### `getBanners(filter: GetBannersFilter): [Banner!]!`

Fetch banners with optional filtering.

**Filter Options:**
- `activeOnly`: Boolean - Only active banners
- `businessId`: ID - Filter by business
- `productId`: ID - Filter by product
- `promotionId`: ID - Filter by promotion
- `displayContext`: BannerDisplayContext - Filter by context
- `includeScheduled`: Boolean - Apply schedule filtering

**Example:**
```graphql
query {
  getBanners(filter: {
    activeOnly: true
    displayContext: HOME
    includeScheduled: true
  }) {
    id
    title
    imageUrl
    business {
      name
    }
  }
}
```

#### `getActiveBanners(displayContext: BannerDisplayContext): [Banner!]!`

Fetch only currently active and scheduled banners for a specific context. This is the primary query used by mobile apps.

**Features:**
- Only returns `isActive: true` banners
- Respects start/end dates (only returns currently scheduled)
- Filters by display context or returns ALL context banners
- Sorted by sortOrder

**Example:**
```graphql
query {
  getActiveBanners(displayContext: HOME) {
    id
    title
    subtitle
    imageUrl
    mediaType
    business {
      id
      name
    }
  }
}
```

#### `getBanner(id: ID!): Banner`

Fetch a single banner by ID.

### Mutations

#### `createBanner(input: CreateBannerInput!): Banner!`

Create a new banner.

**Example:**
```graphql
mutation {
  createBanner(input: {
    title: "Summer Sale"
    subtitle: "Get 20% off all items"
    imageUrl: "https://cdn.example.com/summer-sale.jpg"
    mediaType: IMAGE
    businessId: "business-uuid"
    promotionId: "promo-uuid"
    displayContext: HOME
    startsAt: "2026-06-01T00:00:00Z"
    endsAt: "2026-06-30T23:59:59Z"
    isActive: true
  }) {
    id
    title
  }
}
```

#### `updateBanner(id: ID!, input: UpdateBannerInput!): Banner!`

Update an existing banner.

#### `deleteBanner(id: ID!): Boolean!`

Soft-delete a banner (sets `isDeleted = true` and `isActive = false`). All banner queries automatically exclude soft-deleted banners.

All banner CRUD operations go through `BannerRepository` (see `api/SOFT_DELETE_CONVENTION.md`).

#### `updateBannerOrder(bannerId: ID!, newSortOrder: Int!): Banner!`

Update banner sort order for drag-and-drop reordering.

---

## Admin Panel Usage

### Accessing Banner Management

Navigate to: **Admin Panel → Banners** (`/admin/banners`)

### Creating a Banner

1. Click **"Create Banner"** button
2. Fill in the form:
   - **Basic Information**
     - Title (optional)
     - Subtitle (optional)
     - Media URL (required)
     - Media Type (IMAGE/GIF/VIDEO)
   
   - **Relationships** (all optional)
     - Business: Select a specific business
     - Product: Select a product (requires business selection first)
     - Promotion: Select an active promotion
   
   - **Display Settings**
     - Display Context: Where to show the banner
     - Link Type: Legacy linking (optional)
     - Link Target: URL or ID for legacy linking
   
   - **Schedule**
     - Start Date & Time: When banner becomes active
     - End Date & Time: When banner deactivates
     - Leave both empty for always-active
   
   - **Status**
     - Active checkbox: Manually enable/disable

3. Click **"Create Banner"**

### Editing a Banner

1. Click the **Edit** (pencil) icon on any banner row
2. Modify any fields
3. Click **"Update Banner"**

### Reordering Banners

- Drag and drop rows using the grip handle (left side)
- Order determines display position in carousels
- Changes save automatically

### Filtering Banners

- **Status Filter**: All / Active / Inactive
- **Business Filter**: Filter by specific business
- **Display Context Filter**: Filter by where banner is shown

### Deleting a Banner

1. Click the **Delete** (trash) icon
2. Confirm deletion in the modal

### Quick Toggle Active Status

- Click the **Active**/**Inactive** badge to toggle
- No confirmation required

---

## Mobile App Integration

### Home Page Carousel

```typescript
import { useQuery } from '@apollo/client';
import { GET_ACTIVE_BANNERS } from '@/graphql/operations/banners';

function HomeScreen() {
  const { data } = useQuery(GET_ACTIVE_BANNERS, {
    variables: { displayContext: 'HOME' }
  });

  const banners = data?.getActiveBanners || [];

  return (
    <Carousel>
      {banners.map(banner => (
        <BannerSlide
          key={banner.id}
          imageUrl={banner.imageUrl}
          mediaType={banner.mediaType}
          onPress={() => handleBannerPress(banner)}
        />
      ))}
    </Carousel>
  );
}
```

### Business Page Banner

```typescript
function BusinessScreen({ businessId }) {
  const { data } = useQuery(GET_ACTIVE_BANNERS, {
    variables: { displayContext: 'BUSINESS' }
  });

  // Filter for this specific business or ALL context
  const banners = data?.getActiveBanners.filter(
    b => !b.businessId || b.businessId === businessId
  ) || [];

  return <BannerCarousel banners={banners} />;
}
```

---

## Best Practices

### Banner Design

1. **Image Dimensions**
   - Recommended: 1200x400px (3:1 ratio)
   - Mobile: 800x600px (4:3 ratio)
   - Ensure text is readable at small sizes

2. **File Size**
   - Images: < 500KB
   - GIFs: < 2MB
   - Videos: < 5MB

3. **Content**
   - Keep text minimal
   - Use high-contrast colors
   - Include clear call-to-action
   - Ensure brand consistency

### Targeting Strategy

1. **Global Campaigns**
   - Use HOME context
   - No business/product/promotion links
   - Broad appeal messaging

2. **Business Promotions**
   - Link to specific business
   - Use BUSINESS context
   - Highlight business-specific offers

3. **Product Launches**
   - Link to both business and product
   - Use PRODUCT or HOME context
   - Show product imagery

4. **Time-Limited Offers**
   - Always set start and end dates
   - Link to promotion
   - Create urgency in messaging

### Scheduling

1. **Campaign Planning**
   - Schedule at least 24h in advance
   - Avoid overlapping similar campaigns
   - Test banner before activation

2. **Rotation Strategy**
   - 3-5 active banners optimal
   - Higher sortOrder = displayed first
   - Rotate content weekly

3. **Performance Monitoring**
   - Track click-through via link targets
   - Monitor promotion usage if linked
   - A/B test messaging and imagery

---

## Migration Guide

If you're upgrading from the basic banner system:

### 1. Run Database Migration

```bash
cd api
psql $DB_URL -f database/migrations/enhance-banners.sql
```

### 2. Regenerate GraphQL Types

```bash
cd api
npm run codegen

cd admin-panel
npm run codegen
```

### 3. Update Frontend Code

The legacy `linkType` and `linkTarget` fields are still supported for backward compatibility. Gradually migrate to using the new relationship fields:

**Old Way:**
```typescript
linkType: 'business'
linkTarget: 'business-uuid'
```

**New Way:**
```typescript
businessId: 'business-uuid'
displayContext: 'BUSINESS'
```

---

## Troubleshooting

### Banner Not Showing

**Check:**
1. `isActive` = true
2. Current time is between `startsAt` and `endsAt` (if set)
3. `displayContext` matches the page
4. Mobile app is fetching from `getActiveBanners` query

### Products Not Loading in Dropdown

**Cause:** No business selected first

**Solution:** Select a business before trying to select a product

### Images Not Loading

**Check:**
1. URL is publicly accessible
2. CORS headers allow your domain
3. File format is supported (JPG, PNG, WebP, GIF, MP4)
4. File size is reasonable (< 5MB)

### Drag-and-Drop Not Working

**Cause:** Conflicting mouse events

**Solution:** Ensure you're dragging from the grip handle icon on the left

---

## API Examples

### Fetch All Active Home Banners

```graphql
query GetHomeBanners {
  getActiveBanners(displayContext: HOME) {
    id
    title
    subtitle
    imageUrl
    mediaType
    business {
      id
      name
    }
    promotion {
      id
      code
      name
    }
  }
}
```

### Create Scheduled Promotion Banner

```graphql
mutation CreatePromoBanner {
  createBanner(input: {
    title: "Black Friday Sale"
    subtitle: "Up to 50% off everything"
    imageUrl: "https://cdn.example.com/black-friday.jpg"
    mediaType: IMAGE
    promotionId: "promo-uuid"
    displayContext: HOME
    startsAt: "2026-11-25T00:00:00Z"
    endsAt: "2026-11-27T23:59:59Z"
    isActive: true
  }) {
    id
    title
  }
}
```

### Get Banners for Specific Business

```graphql
query GetBusinessBanners {
  getBanners(filter: {
    activeOnly: true
    businessId: "business-uuid"
    includeScheduled: true
  }) {
    id
    title
    imageUrl
    product {
      name
    }
  }
}
```

---

## Performance Considerations

1. **Caching**
   - Cache `getActiveBanners` response for 5-10 minutes
   - Invalidate cache when banners are updated

2. **Image Optimization**
   - Use CDN for banner images
   - Serve WebP format when supported
   - Implement lazy loading

3. **Database**
   - Indexes exist on all foreign keys
   - Composite index on (isActive, starts_at, ends_at)

4. **Query Optimization**
   - Use `getActiveBanners` on mobile (pre-filtered)
   - Avoid fetching inactive banners on client

---

## Future Enhancements

- [ ] A/B testing support
- [ ] Click-through analytics
- [ ] User segment targeting
- [ ] Geolocation-based display
- [ ] Banner templates
- [ ] Bulk operations
- [ ] Banner performance dashboard
- [ ] Auto-generate banner images from templates

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Promotion System](./BUSINESS_LOGIC/PROMOTION_SYSTEM.md)
- [Admin Panel Guide](./ADMIN_MOBILEBUSINESS_UI_CONTEXT.md)
- [GraphQL Schema](../api/src/generated/schema.generated.graphql)

---

**Need Help?** Contact the development team or check the [main documentation index](./MDS_INDEX.md).
