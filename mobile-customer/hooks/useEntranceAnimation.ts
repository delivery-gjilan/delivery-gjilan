import { useEffect } from 'react';
import {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';

/**
 * Produces a fade-up entrance animation for a single element.
 *
 * @param index   The position of the element in a list — used to stagger the delay.
 * @param delay   Gap in ms between elements (default 70ms).
 * @param enabled Set to false to skip the animation (e.g. on re-focus).
 */
export function useEntranceAnimation(index = 0, delay = 70, enabled = true) {
    const opacity = useSharedValue(enabled ? 0 : 1);
    const translateY = useSharedValue(enabled ? 22 : 0);

    useEffect(() => {
        if (!enabled) return;
        const d = Math.min(index, 8) * delay; // cap stagger at 8 items (~560ms total)
        opacity.value = withDelay(d, withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }));
        translateY.value = withDelay(d, withTiming(0, { duration: 380, easing: Easing.out(Easing.quad) }));
    }, []);

    return useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));
}
