import { create } from 'zustand';

type BannerType = 'INFO' | 'WARNING' | 'SUCCESS';

interface StoreStatusState {
    isStoreClosed: boolean;
    closedMessage: string | null | undefined;
    bannerEnabled: boolean;
    bannerMessage: string | null;
    bannerType: BannerType;
    loading: boolean;
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
    closedMessage: undefined,
    bannerEnabled: false,
    bannerMessage: null,
    bannerType: 'INFO',
    loading: true,
    _update: (status) =>
        set({
            isStoreClosed: status.isStoreClosed ?? false,
            closedMessage: status.closedMessage,
            bannerEnabled: status.bannerEnabled ?? false,
            bannerMessage: status.bannerMessage ?? null,
            bannerType: (status.bannerType ?? 'INFO') as BannerType,
            loading: false,
        }),
    _setLoading: (loading) => set({ loading }),
}));
