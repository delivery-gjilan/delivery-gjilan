declare module '@apollo/client' {
    // Minimal hook typings to satisfy TypeScript in this project setup
    export function useMutation<TData = any, TVariables = any>(
        mutation: any,
        options?: any,
    ): [(options?: any) => Promise<{ data?: TData }>, { loading: boolean; error?: any; data?: TData }];

    export function useApolloClient<TCacheShape = any>(): any;
}
