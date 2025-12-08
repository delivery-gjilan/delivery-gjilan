import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_ORDERS,
  GET_ORDER,
  GET_ORDERS_BY_STATUS,
  UPDATE_ORDER_STATUS,
  CANCEL_ORDER,
} from '@/graphql/operations/orders/index';
import { OrderStatus, Order } from '@/types/graphql.generated';

export function useOrders() {
  const { data, loading, error, refetch } = useQuery<{ orders: Order[] }>(GET_ORDERS);

  return {
    orders: data?.orders || [],
    loading,
    error,
    refetch,
  };
}

export function useOrder(id: string) {
  const { data, loading, error, refetch } = useQuery<{ order: Order }>(GET_ORDER, {
    variables: { id },
    skip: !id,
  });

  return {
    order: data?.order || null,
    loading,
    error,
    refetch,
  };
}

export function useOrdersByStatus(status: OrderStatus) {
  const { data, loading, error, refetch } = useQuery<{ ordersByStatus: Order[] }>(
    GET_ORDERS_BY_STATUS,
    {
      variables: { status },
      skip: !status,
    }
  );

  return {
    orders: data?.ordersByStatus || [],
    loading,
    error,
    refetch,
  };
}

export function useUpdateOrderStatus() {
  const [updateOrderStatus, { loading, error }] = useMutation(UPDATE_ORDER_STATUS);

  const update = async (id: string, status: OrderStatus) => {
    try {
      const result = await updateOrderStatus({
        variables: { id, status },
        refetchQueries: [{ query: GET_ORDERS }, { query: GET_ORDERS_BY_STATUS, variables: { status } }],
      });
      return {
        data: (result.data as any)?.updateOrderStatus || null,
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err,
      };
    }
  };

  return {
    update,
    loading,
    error,
  };
}

export function useCancelOrder() {
  const [cancelOrder, { loading, error }] = useMutation(CANCEL_ORDER);

  const cancel = async (id: string) => {
    try {
      const result = await cancelOrder({
        variables: { id },
        refetchQueries: [{ query: GET_ORDERS }, { query: GET_ORDERS_BY_STATUS, variables: { status: 'CANCELLED' } }],
      });
      return {
        data: (result.data as any)?.cancelOrder || null,
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err,
      };
    }
  };

  return {
    cancel,
    loading,
    error,
  };
}
