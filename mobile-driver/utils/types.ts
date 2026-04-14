import { SUPPORTED_LANGUAGES } from './constants';
import type { GetOrdersQuery } from '@/gql/graphql';

export type LanguageChoice = (typeof SUPPORTED_LANGUAGES)[number];
export type DriverOrder = GetOrdersQuery['orders']['orders'][number];
