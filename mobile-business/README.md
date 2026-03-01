# Mobile Business Portal - Delivery Gjilan

Business management mobile app for restaurant owners and employees to manage orders, products, and business operations.

## Features

### 🛎️ Order Management (Main Feature)
- **Real-time Order Notifications** - Instant notifications for new orders via GraphQL subscriptions
- **Accept/Reject Orders** - Quick actions to accept or reject incoming orders
- **Preparation Tracking** - Set preparation times and track order progress
- **Order Status Updates** - Mark orders as ready, update preparation times
- **Order Filtering** - Filter by status (Pending, Preparing, Ready, Out for Delivery, etc.)
- **Customer Information** - View customer details and delivery addresses
- **Large, Clear UI** - Orders are displayed prominently with easy-to-read cards

### 🍔 Product Management
- **Add/Edit/Delete Products** - Full CRUD operations for menu items
- **Stock Management** - Track inventory levels, low stock alerts
- **Availability Toggle** - Quickly mark items as available/unavailable
- **Product Categories** - Organize products by category
- **Sale Pricing** - Support for sale prices and promotions
- **Image Support** - Product images with fallback placeholders
- **Search & Filter** - Find products quickly by name or category

### 📊 Dashboard & Analytics
- **Today's Overview** - Total orders, revenue, completion rate
- **Active Orders** - Real-time count of pending and preparing orders
- **Product Status** - Track unavailable and low stock items
- **Quick Actions** - Access common settings and features
- **Real-time Updates** - Auto-refresh with pull-to-refresh support

### ⚙️ Business Settings
- **Business Profile** - View and edit business information
- **Account Management** - User profile and password management
- **Notification Settings** - Configure push, sound, and email alerts
- **Business Hours** - Manage opening/closing times
- **Support & Help** - Access help resources and policies

## Tech Stack

- **React Native** with Expo Router (file-based routing)
- **Apollo Client** for GraphQL with real-time subscriptions
- **Zustand** for state management
- **NativeWind** (TailwindCSS for React Native)
- **Expo** modules (Haptics, SecureStore, Notifications, Image)
- **TypeScript** for type safety

## Getting Started

### Prerequisites
- Node.js 18+
- iOS Simulator or Android Emulator
- Running API server at `http://localhost:4000`

### Installation

1. Install dependencies:
```bash
cd mobile-business
npm install
```

2. Create `.env` file:
```env
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_WS_URL=ws://localhost:4000
```

3. Generate GraphQL types (after API is running):
```bash
npm run codegen
```

4. Start the development server:
```bash
npm start -- --port 8084
```

5. Press `i` for iOS or `a` for Android

## Authentication

This app is restricted to users with the following roles:
- `BUSINESS_OWNER`
- `BUSINESS_EMPLOYEE`

Users must have a `businessId` associated with their account.

## GraphQL Operations

### Orders
- `GET_BUSINESS_ORDERS` - Fetch all orders for the business
- `UPDATE_ORDER_STATUS` - Change order status
- `START_PREPARING` - Accept order and set preparation time
- `UPDATE_PREPARATION_TIME` - Adjust preparation time
- `ORDERS_SUBSCRIPTION` - Real-time order updates

### Products
- `GET_BUSINESS_PRODUCTS` - Fetch all products and categories
- `CREATE_PRODUCT` - Add new product
- `UPDATE_PRODUCT` - Edit product details, stock, availability
- `DELETE_PRODUCT` - Remove product
- `CREATE_CATEGORY` - Add product category

## Project Structure

```
mobile-business/
├── app/
│   ├── (tabs)/           # Main tab navigation
│   │   ├── index.tsx     # Orders screen (default)
│   │   ├── products.tsx  # Products management
│   │   ├── dashboard.tsx # Analytics dashboard
│   │   └── settings.tsx  # Settings & profile
│   ├── login.tsx         # Business login
│   └── _layout.tsx       # Root layout with auth
├── graphql/              # GraphQL queries/mutations
│   ├── auth.ts
│   ├── orders.ts
│   └── products.ts
├── store/                # Zustand stores
│   └── authStore.ts      # Authentication state
├── lib/                  # Utilities
│   └── apollo.ts         # Apollo Client setup
└── gql/                  # Generated GraphQL types
```

## Key Features Implementation

### Real-time Order Updates
The app uses GraphQL subscriptions to receive real-time order updates. When a new order arrives or status changes, the UI updates automatically with haptic feedback.

### Offline Support
Uses Apollo Client's cache for offline-first experience. Orders and products are cached locally for quick access.

### Haptic Feedback
Uses Expo Haptics for tactile feedback on important actions:
- Success feedback when accepting/completing orders
- Warning feedback when rejecting orders
- Light impact for toggle switches

### Secure Authentication
- Tokens stored in Expo SecureStore
- Auto-restore session on app launch
- Role-based access control
- Automatic logout on auth errors

## Development Notes

### Running with Other Apps
The business app runs on port **8084** to avoid conflicts:
- Mobile Customer: 8082
- Mobile Driver: 8083
- Mobile Business: 8084

Start all apps together:
```bash
npm start -- --port 8084
```

### GraphQL Code Generation
After modifying GraphQL queries:
```bash
npm run codegen
```

### Type Checking
```bash
npm run typecheck
```

## Future Enhancements

- [ ] Complete product add/edit modal form
- [ ] Business hours management screen
- [ ] Detailed analytics and reports
- [ ] Order history with search
- [ ] Bulk product import/export
- [ ] Push notification configuration
- [ ] Multi-location support (for chains)
- [ ] Staff management (for business owners)
- [ ] Peak hours insights
- [ ] Revenue forecasting

## Support

For business support, contact: business@deliverygjilan.com

## License

Proprietary - Delivery Gjilan © 2024
