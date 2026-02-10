import { YogaInitialContext } from 'graphql-yoga';
import { DbType } from '../../database';
import { BusinessService } from '@/services/BusinessService';
import { ProductCategoryService } from '@/services/ProductCategoryService';
import { ProductService } from '@/services/ProductService';
import { AuthService } from '@/services/AuthService';
import { OrderService } from '@/services/OrderService';
import { DeliveryZoneService } from '@/services/DeliveryZoneService';
import { PubSub } from '@/lib/pubsub';

export interface ApiContextInterface {
    db: DbType;
    userData: {
        userId?: string;
        role?: string;
        businessId?: string;
    };
    businessService: BusinessService;
    productCategoryService: ProductCategoryService;
    productService: ProductService;
    authService: AuthService;
    orderService: OrderService;
    deliveryZoneService: DeliveryZoneService;
    pubsub: PubSub;
}

export interface GraphQLContext extends YogaInitialContext, ApiContextInterface {}
