import { Platform } from 'react-native';

const WEB_FONT_STACK = `system-ui, "Segoe UI", Roboto, Helvetica, Arial,
sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`;

const SharedFonts = Platform.select({
    web: {
        regular: {
            fontFamily: WEB_FONT_STACK,
            fontWeight: '400' as const,
        },
        medium: {
            fontFamily: WEB_FONT_STACK,
            fontWeight: '500' as const,
        },
        bold: {
            fontFamily: WEB_FONT_STACK,
            fontWeight: '600' as const,
        },
        heavy: {
            fontFamily: WEB_FONT_STACK,
            fontWeight: '700' as const,
        },
    },
    ios: {
        regular: {
            fontFamily: 'System',
            fontWeight: '400' as const,
        },
        medium: {
            fontFamily: 'System',
            fontWeight: '500' as const,
        },
        bold: {
            fontFamily: 'System',
            fontWeight: '600' as const,
        },
        heavy: {
            fontFamily: 'System',
            fontWeight: '700' as const,
        },
    },
    default: {
        regular: {
            fontFamily: 'sans-serif',
            fontWeight: 'normal' as const,
        },
        medium: {
            fontFamily: 'sans-serif-medium',
            fontWeight: 'normal' as const,
        },
        bold: {
            fontFamily: 'sans-serif',
            fontWeight: '600' as const,
        },
        heavy: {
            fontFamily: 'sans-serif',
            fontWeight: '700' as const,
        },
    },
});

export const LightTheme = {
    dark: false,
    colors: {
        primary: '#2DD4BF',
        background: '#F8FAFC',
        foreground: '#000000',
        expense: '#EF4444',
        income: '#22C55E',
        card: '#FFFFFF',
        text: '#1f2937',
        subtext: '#64748B',
        border: '#E2E8F0',
        notification: '#f59e0b',
    },
    fonts: SharedFonts,
};

export const DarkTheme = {
    dark: false,
    colors: {
        primary: '#2DD4BF',
        background: '#0F172A',
        foreground: '#ffffff',
        expense: '#EF4444',
        income: '#22C55E',
        card: '#1E293B',
        text: '#F8FAFC',
        subtext: '#94A3B8',
        border: '#334155',
        notification: '#99F6E4',
    },
    fonts: SharedFonts,
};
