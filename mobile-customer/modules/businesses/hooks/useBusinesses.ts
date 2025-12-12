import { useQuery } from '@apollo/client/react';
import { GET_BUSINESSES, GET_BUSINESS } from '@/graphql/operations/businesses';
import { Business } from '@/types/graphql.generated';

export function useBusinesses() {
  const { data, loading, error, refetch } = useQuery<{ businesses: Business[] }>(GET_BUSINESSES);

  return {
    businesses: data?.businesses || [],
    loading,
    error,
    refetch,
  };
}

export function useBusiness(id: string) {
  const { data, loading, error, refetch } = useQuery<{ business: Business }>(GET_BUSINESS, {
    variables: { id },
    skip: !id,
  });

  return {
    business: data?.business || null,
    loading,
    error,
    refetch,
  };
}
