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
                // Purple spectrum: bright purple = active, muted deep purple = done, faint = future
                const color = done
                    ? theme.colors.primary + 'AA'
                    : active
                        ? theme.colors.primary
                        : theme.colors.subtext + '50';

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
                                        ? theme.colors.primary + '55'
                                        : active
                                            ? theme.colors.primary + '30'
                                            : theme.colors.border,
                                }}
                            />
                        )}
                        <View style={{ alignItems: 'center', width: 48 }}>
                            <View
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: done
                                        ? theme.colors.primary + '25'
                                        : active
                                            ? theme.colors.primary + '20'
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
                                    fontSize: active ? 11 : 10,
                                    marginTop: 3,
                                    color,
                                    fontWeight: active ? '800' : done ? '600' : '400',
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
