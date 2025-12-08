// GraphQL Scalar Types
export type Date = string;

// Enums
export enum BusinessType {
  RESTAURANT = 'RESTAURANT',
  MARKET = 'MARKET',
  PHARMACY = 'PHARMACY',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// Types
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface WorkingHours {
  opensAt: string;
  closesAt: string;
}

export interface Business {
  id: string;
  name: string;
  imageUrl?: string;
  businessType: BusinessType;
  isActive: boolean;
  location: Location;
  workingHours: WorkingHours;
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  price: number;
}

export interface OrderBusiness {
  business: Business;
  items: OrderItem[];
}

export interface Order {
  id: string;
  orderPrice: number;
  deliveryPrice: number;
  totalPrice: number;
  orderDate: Date;
  status: OrderStatus;
  dropOffLocation: Location;
  businesses: OrderBusiness[];
}

export interface Product {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  isOnSale: boolean;
  salePrice?: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSubcategory {
  id: string;
  categoryId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  address: string;
}
