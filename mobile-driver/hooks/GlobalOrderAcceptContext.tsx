import React, { createContext, useContext } from 'react';
import { useGlobalOrderAccept } from './useGlobalOrderAccept';

type GlobalOrderAcceptValue = ReturnType<typeof useGlobalOrderAccept>;

const GlobalOrderAcceptContext = createContext<GlobalOrderAcceptValue | null>(null);

export function GlobalOrderAcceptProvider({ children }: { children: React.ReactNode }) {
    const value = useGlobalOrderAccept();
    return (
        <GlobalOrderAcceptContext.Provider value={value}>
            {children}
        </GlobalOrderAcceptContext.Provider>
    );
}

/**
 * Read the shared global order-accept state that is provided once
 * from the root layout.  Avoids duplicate Apollo queries / networkReady gates.
 */
export function useSharedOrderAccept(): GlobalOrderAcceptValue {
    const ctx = useContext(GlobalOrderAcceptContext);
    if (!ctx) {
        throw new Error('useSharedOrderAccept must be used inside GlobalOrderAcceptProvider');
    }
    return ctx;
}
