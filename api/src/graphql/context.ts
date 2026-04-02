import { YogaInitialContext } from 'graphql-yoga';
import { DbType } from '../../database';
import { BusinessService } from '@/services/BusinessService';
import { ProductCategoryService } from '@/services/ProductCategoryService';
import { ProductSubcategoryService } from '@/services/ProductSubcategoryService';
import { ProductService } from '@/services/ProductService';
import { AuthService } from '@/services/AuthService';
import { OrderService } from '@/services/OrderService';
import { DriverService } from '@/services/DriverService';
import { DriverAuthService } from '@/services/DriverAuthService';
import { PubSub } from '@/lib/pubsub';
import type { Logger } from '@/lib/logger';
import { NotificationService } from '@/services/NotificationService';
import { PromotionService } from '@/services/PromotionService';
import { FinancialService } from '@/services/FinancialService';
import { DataLoaders } from './dataloaders';

export interface ApiContextInterface {
    db: DbType;
    userData: {
        userId?: string;
        role?: string;
        businessId?: string;
    };
    // Legacy direct fields used by some resolvers
    userId?: string;
    role?: string;
    businessId?: string;
    /** Unique correlation id for this HTTP request / WS operation */
    requestId: string;
    /** Per-request child logger — already bound with requestId + userId */
    log: Logger;
    businessService: BusinessService;
    productCategoryService: ProductCategoryService;
    productSubcategoryService: ProductSubcategoryService;
    productService: ProductService;
    authService: AuthService;
    orderService: OrderService;
    driverAuthService?: DriverAuthService;
    driverService?: DriverService;
    notificationService: NotificationService;
    promotionService: PromotionService;
    financialService: FinancialService;
    pubsub: PubSub;
    loaders: DataLoaders;
}

export interface GraphQLContext extends YogaInitialContext, ApiContextInterface {}
