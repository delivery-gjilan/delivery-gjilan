import { YogaInitialContext } from 'graphql-yoga';
import { DbType } from '../../database';
import { BusinessService } from '@/services/BusinessService';
import { ProductCategoryService } from '@/services/ProductCategoryService';
import { ProductService } from '@/services/ProductService';
import { AuthService } from '@/services/AuthService';

export interface ApiContextInterface {
    db: DbType;
    userData: {
        userId?: string;
    };
    businessService: BusinessService;
    productCategoryService: ProductCategoryService;
    productService: ProductService;
    authService: AuthService;
}

export interface GraphQLContext extends YogaInitialContext, ApiContextInterface {}
