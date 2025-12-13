import { useQuery } from '@apollo/client/react';
import {
  GET_PRODUCT_CATEGORIES,
  GET_PRODUCT_CATEGORY,
  GET_PRODUCT_SUBCATEGORIES,
  GET_PRODUCT_SUBCATEGORY,
} from '@/graphql/operations/categories';
import { ProductCategory, ProductSubcategory } from '@/types/graphql.generated';

export function useProductCategories(businessId: string) {
  const { data, loading, error, refetch } = useQuery<{ productCategories: ProductCategory[] }>(
    GET_PRODUCT_CATEGORIES,
    {
      variables: { businessId },
      skip: !businessId,
    }
  );

  return {
    categories: data?.productCategories || [],
    loading,
    error,
    refetch,
  };
}

export function useProductCategory(id: string) {
  const { data, loading, error, refetch } = useQuery<{ productCategory: ProductCategory }>(
    GET_PRODUCT_CATEGORY,
    {
      variables: { id },
      skip: !id,
    }
  );

  return {
    category: data?.productCategory || null,
    loading,
    error,
    refetch,
  };
}

export function useProductSubcategories(categoryId: string) {
  const { data, loading, error, refetch } = useQuery<{ productSubcategories: ProductSubcategory[] }>(
    GET_PRODUCT_SUBCATEGORIES,
    {
      variables: { categoryId },
      skip: !categoryId,
    }
  );

  return {
    subcategories: data?.productSubcategories || [],
    loading,
    error,
    refetch,
  };
}

export function useProductSubcategory(id: string) {
  const { data, loading, error, refetch } = useQuery<{ productSubcategory: ProductSubcategory }>(
    GET_PRODUCT_SUBCATEGORY,
    {
      variables: { id },
      skip: !id,
    }
  );

  return {
    subcategory: data?.productSubcategory || null,
    loading,
    error,
    refetch,
  };
}
