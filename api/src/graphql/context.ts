import { YogaInitialContext } from 'graphql-yoga';
import { DbType } from '../../database';

export interface ApiContextInterface {
    db: DbType;
}

export interface GraphQLContext extends YogaInitialContext, ApiContextInterface {}
