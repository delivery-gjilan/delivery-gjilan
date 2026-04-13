# Optimization Tracker

> Collected optimization recommendations per project. Track status as items are addressed.

---

## Mobile-Customer (M12)

### Performance
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 1 | Remove unused `useCartProductDetails` scaffolding hook (commented-out code) | Low | Pending |
| 2 | Remove or lazy-gate hidden `analytics.tsx` tab (still mounted in navigator) | Low | Pending |
| 3 | Monitor Apollo cache sizes in production (5MB limit may be excessive) | Medium | Pending |
| 4 | Lighten `UserOrdersUpdated` subscription payload — send changed IDs + delta instead of full order list | Medium | Pending |
| 5 | Add blur hash placeholders for `expo-image` (business/product images) + CDN thumbnail resizing | Medium | Pending |

### Code Quality
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 6 | Extract embedded admin panel to lazy-loaded route group or shared module (reduces customer bundle, 17q + 11m + 3s + ~10 screens) | High | Pending |
| 7 | Standardize store naming convention — mix of `useXStore` vs bare names (`authStore`, `storeStatusStore`) | Low | Pending |
| 8 | Clarify module boundary for product-cart interactions — `useProductInCart` lives in business module but manipulates cart | Low | Pending |
| 9 | Audit for remaining `as any` type assertions in OrderDetails/translation keys | Low | Pending |

### Reliability
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 10 | Verify deep-link token extraction for password reset across iOS universal links and Android app links | Medium | Pending |
| 11 | Revisit service zone `'unconfigured'` fallback as zones mature (currently permits entry) | Low | Pending |
| 12 | Audit FCM `UnregisterDeviceToken` on logout to prevent orphan tokens | Medium | Pending |

### Future Considerations
| # | Recommendation | Priority | Status |
|---|---------------|----------|--------|
| 13 | Offline order queue (optimistic order creation with retry for unreliable connectivity) | Low | Pending |
| 14 | Product/business search bar with debounced query | Medium | Pending |
| 15 | Accessibility labels and roles (`accessibilityLabel`, `accessibilityRole`) | Medium | Pending |
| 16 | Expand test coverage beyond `utils/__tests__/` — cart actions, order creation, auth flow | Medium | Pending |
