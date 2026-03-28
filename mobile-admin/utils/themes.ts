import { Platform } from 'react-native';

const WEB_FONT_STACK = `system-ui, "Segoe UI", Roboto, Helvetica, Arial,
sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`;

const SharedFonts = Platform.select({
    web: {
        regular: { fontFamily: WEB_FONT_STACK, fontWeight: '400' as const },
        medium: { fontFamily: WEB_FONT_STACK, fontWeight: '500' as const },
        bold: { fontFamily: WEB_FONT_STACK, fontWeight: '600' as const },
        heavy: { fontFamily: WEB_FONT_STACK, fontWeight: '700' as const },
    },
    ios: {
        regular: { fontFamily: 'System', fontWeight: '400' as const },
        medium: { fontFamily: 'System', fontWeight: '500' as const },
        bold: { fontFamily: 'System', fontWeight: '600' as const },
        heavy: { fontFamily: 'System', fontWeight: '700' as const },
    },
    default: {
        regular: { fontFamily: 'sans-serif', fontWeight: 'normal' as const },
        medium: { fontFamily: 'sans-serif-medium', fontWeight: 'normal' as const },
        bold: { fontFamily: 'sans-serif', fontWeight: '600' as const },
        heavy: { fontFamily: 'sans-serif', fontWeight: '700' as const },
    },
});

export const LightTheme = {
    dark: false,
    colors: {
        primary: '#6366f1',
        background: '#ffffff',
        foreground: '#0f172a',
        accent: '#8b5cf6',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        card: '#f8fafc',
        text: '#0f172a',
        subtext: '#64748b',
        border: '#e2e8f0',
        notification: '#f59e0b',
    },
    fonts: SharedFonts,
};

export const DarkTheme = {
    dark: true,
    colors: {
        primary: '#818cf8',
        background: '#0f172a',
        foreground: '#f8fafc',
        accent: '#a78bfa',
        success: '#4ade80',
        warning: '#fbbf24',
        danger: '#f87171',
        card: '#1e293b',
        text: '#f8fafc',
        subtext: '#94a3b8',
        border: '#334155',
        notification: '#fbbf24',
    },
    fonts: SharedFonts,
};
