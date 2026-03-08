import React from 'react';
import { View, Text } from 'react-native';

// Stub components for web – react-native-maps is native-only
export const MapView = React.forwardRef(({ style, children, ...props }: any, ref: any) => (
    <View
        ref={ref}
        style={[
            {
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f0f0f0',
            },
            style,
        ]}
    >
        <Text style={{ color: '#888', textAlign: 'center', paddingHorizontal: 24 }}>
            Map is not available on web. Please use the mobile app.
        </Text>
    </View>
));

MapView.displayName = 'MapViewWebStub';

export const Marker = (_props: any) => null;
export const Polyline = (_props: any) => null;

export type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};
