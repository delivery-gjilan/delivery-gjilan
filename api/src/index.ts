import express from 'express';
import cors from 'cors';
import { createYoga } from 'graphql-yoga';
import { schema } from './graphql/schema';
import { getDB } from '@/database';
import { BusinessRepository } from '@/repositories/BusinessRepository';
import { BusinessService } from '@/services/BusinessService';
import { ProductCategoryRepository } from '@/repositories/ProductCategoryRepository';
import { ProductCategoryService } from '@/services/ProductCategoryService';
import { ProductRepository } from '@/repositories/ProductRepository';
import { ProductService } from '@/services/ProductService';
import uploadRoutes from './routes/uploadRoutes';

console.log(process.env.DB_URL);

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Upload routes (REST API)
app.use('/api/upload', uploadRoutes);

const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    maskedErrors: false,
    context: async (initialContext) => {
        const db = await getDB();

        const businessRepository = new BusinessRepository(db);
        const businessService = new BusinessService(businessRepository);

        const productCategoryRepository = new ProductCategoryRepository(db);
        const productCategoryService = new ProductCategoryService(productCategoryRepository);

        const productRepository = new ProductRepository(db);
        const productService = new ProductService(productRepository);

        return {
            ...initialContext,
            db,
            businessService,
            productCategoryService,
            productService,
        };
    },
});

app.use(yoga.graphqlEndpoint, yoga);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/graphql`);
});
