import { YogaInitialContext } from 'graphql-yoga';
import { DbType } from '../../database';
import { BusinessService } from '@/services/BusinessService';
import { ProductCategoryService } from '@/services/ProductCategoryService';
import { ProductService } from '@/services/ProductService';

export interface ApiContextInterface {
    db: DbType;
    businessService: BusinessService;
    productCategoryService: ProductCategoryService;
    productService: ProductService;
}

export interface GraphQLContext extends YogaInitialContext, ApiContextInterface {}
