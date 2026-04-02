import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    useAnimatedProps,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 96;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * 0.75; // 75% arc visible

export default function LoadingScreen() {
    const theme = useTheme();
    const rotation = useSharedValue(0);
    const dashOffset = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            -1,
            false,
        );
        dashOffset.value = withRepeat(
            withTiming(-CIRCUMFERENCE, { duration: 1000, easing: Easing.linear }),
            -1,
            false,
        );
    }, []);

    const spinStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: dashOffset.value,
    }));

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' }}>
            {/* Spinner ring */}
            <Animated.View style={[{ width: SIZE, height: SIZE, position: 'absolute' }, spinStyle]}>
                <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                    <Defs>
                        <LinearGradient id="spinnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity={1} />
                            <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity={0.15} />
                        </LinearGradient>
                    </Defs>
                    {/* Track ring */}
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke={theme.colors.primary}
                        strokeOpacity={0.12}
                        strokeWidth={STROKE}
                        fill="none"
                    />
                    {/* Animated arc */}
                    <AnimatedCircle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke={theme.colors.primary}
                        strokeWidth={STROKE}
                        fill="none"
                        strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE - ARC_LENGTH}`}
                        strokeLinecap="round"
                        animatedProps={animatedProps}
                    />
                </Svg>
            </Animated.View>

            {/* Logo placeholder — replace with your <Image> or SVG logo here */}
            <View
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: `${theme.colors.primary}18`,
                    borderWidth: 1.5,
                    borderColor: `${theme.colors.primary}30`,
                }}
            />
        </View>
    );
}
