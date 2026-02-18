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

export interface ApiContextInterface {
    db: DbType;
    userData: {
        userId?: string;
        role?: string;
        businessId?: string;
    };
    businessService: BusinessService;
    productCategoryService: ProductCategoryService;
    productSubcategoryService: ProductSubcategoryService;
    productService: ProductService;
    authService: AuthService;
    orderService: OrderService;
    driverAuthService?: DriverAuthService;
    driverService?: DriverService;
    pubsub: PubSub;
}

export interface GraphQLContext extends YogaInitialContext, ApiContextInterface {}
