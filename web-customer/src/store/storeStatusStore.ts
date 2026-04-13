import { create } from "zustand";

type BannerType = "INFO" | "WARNING" | "SUCCESS";

interface StoreStatusState {
    isStoreClosed: boolean;
    closedMessage: string | null;
    bannerEnabled: boolean;
    bannerMessage: string | null;
    bannerType: BannerType;
    loading: boolean;
    /** Whether the store was open when the user first loaded the page. null = not determined yet. */
    wasOpenOnEntry: boolean | null;
    _update: (status: {
        isStoreClosed?: boolean;
        closedMessage?: string | null;
        bannerEnabled?: boolean;
        bannerMessage?: string | null;
        bannerType?: string | null;
    }) => void;
    _setLoading: (loading: boolean) => void;
}

export const useStoreStatusStore = create<StoreStatusState>((set) => ({
    isStoreClosed: false,
    closedMessage: null,
    bannerEnabled: false,
    bannerMessage: null,
    bannerType: "INFO",
    loading: true,
    wasOpenOnEntry: null,
    _update: (status) =>
        set((state) => {
            const isClosed = status.isStoreClosed ?? false;
            return {
                isStoreClosed: isClosed,
                closedMessage: status.closedMessage ?? null,
                bannerEnabled: status.bannerEnabled ?? false,
                bannerMessage: status.bannerMessage ?? null,
                bannerType: (status.bannerType ?? "INFO") as BannerType,
                loading: false,
                // Record once on the very first update (initial query result)
                wasOpenOnEntry:
                    state.wasOpenOnEntry === null ? !isClosed : state.wasOpenOnEntry,
            };
        }),
    _setLoading: (loading) => set({ loading }),
}));
