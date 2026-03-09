import React from 'react';
import { View, Text } from 'react-native';

// Stub for web – MapLibre is native-only
const MapView = React.forwardRef(({ style, children, ...props }: any, ref: any) => (
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

const Camera = (_props: any) => null;
const PointAnnotation = (_props: any) => null;
const MarkerView = (_props: any) => null;
const ShapeSource = (_props: any) => null;
const LineLayer = (_props: any) => null;
const UserLocation = (_props: any) => null;

const MapLibreGL = {
    MapView,
    Camera,
    PointAnnotation,
    MarkerView,
    ShapeSource,
    LineLayer,
    UserLocation,
    setAccessToken: (_token: string | null) => {},
};

export { MapLibreGL };
export default MapLibreGL;
