import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary for catching unhandled JS errors in the component tree.
 * Shows a friendly error screen with a retry button instead of crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log to console for development.
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View className="flex-1 bg-background items-center justify-center px-8">
                    <Text className="text-4xl mb-4">😵</Text>
                    <Text className="text-xl font-bold text-foreground text-center mb-2">
                        Oops! Something went wrong
                    </Text>
                    <Text className="text-sm text-subtext text-center mb-6">
                        An unexpected error occurred. Please try again.
                    </Text>

                    {__DEV__ && this.state.error && (
                        <ScrollView
                            className="max-h-40 w-full bg-expense/10 rounded-xl p-3 mb-6"
                            showsVerticalScrollIndicator={false}
                        >
                            <Text className="text-xs text-expense font-mono">
                                {this.state.error.toString()}
                            </Text>
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        onPress={this.handleRetry}
                        className="bg-primary rounded-xl py-3 px-8"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-semibold text-base">Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}
