import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
    const theme = useTheme();

    return (
        <View className="mb-4">
            {label && (
                <Text className="text-sm font-medium mb-1.5" style={{ color: theme.colors.text }}>
                    {label}
                </Text>
            )}
            <TextInput
                className="px-4 py-3.5 rounded-xl text-base"
                style={[
                    {
                        backgroundColor: theme.colors.card,
                        color: theme.colors.text,
                        borderWidth: 1,
                        borderColor: error ? theme.colors.danger : theme.colors.border,
                    },
                    style,
                ]}
                placeholderTextColor={theme.colors.subtext}
                {...props}
            />
            {error && (
                <Text className="text-xs mt-1" style={{ color: theme.colors.danger }}>
                    {error}
                </Text>
            )}
        </View>
    );
}
