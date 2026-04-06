import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

interface StepIndicatorProps {
    currentStep: 1 | 2 | 3;
}

const STEPS = [
    { s: 1 as const, icon: 'cart-outline' as const, iconDone: 'cart' as const },
    { s: 2 as const, icon: 'location-outline' as const, iconDone: 'location' as const },
    { s: 3 as const, icon: 'document-text-outline' as const, iconDone: 'document-text' as const },
] as const;

export function StepIndicator({ currentStep }: StepIndicatorProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    const labels = [t.cart.title, t.cart.step_address, t.cart.step_review];

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {STEPS.map(({ s, icon, iconDone }, idx) => {
                const done = currentStep > s;
                const active = currentStep === s;
                const color = done
                    ? theme.colors.income
                    : active
                        ? theme.colors.primary
                        : theme.colors.subtext + '60';

                return (
                    <React.Fragment key={s}>
                        {idx > 0 && (
                            <View
                                style={{
                                    flex: 1,
                                    height: 2,
                                    marginHorizontal: 2,
                                    borderRadius: 1,
                                    backgroundColor: done
                                        ? theme.colors.income
                                        : active
                                            ? theme.colors.primary + '40'
                                            : theme.colors.border,
                                }}
                            />
                        )}
                        <View style={{ alignItems: 'center', width: 48 }}>
                            <View
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 17,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: done
                                        ? theme.colors.income + '18'
                                        : active
                                            ? theme.colors.primary + '15'
                                            : theme.colors.border + '40',
                                }}
                            >
                                <Ionicons
                                    name={done ? 'checkmark' : active ? icon.replace('-outline', '') as any : icon}
                                    size={16}
                                    color={color}
                                />
                            </View>
                            <Text
                                style={{
                                    fontSize: 10,
                                    marginTop: 2,
                                    color,
                                    fontWeight: active ? '700' : done ? '600' : '400',
                                }}
                            >
                                {labels[idx]}
                            </Text>
                        </View>
                    </React.Fragment>
                );
            })}
        </View>
    );
}
