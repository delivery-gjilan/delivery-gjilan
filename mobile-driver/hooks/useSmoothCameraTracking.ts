import { useEffect, useRef } from 'react';
import type Mapbox from '@rnmapbox/maps';

// Accept any location object with these properties
interface LocationLike {
    latitude: number;
    longitude: number;
    heading?: number | null;
}

interface UseSmoothCameraTrackingProps {
    location: LocationLike | null;
    isTracking: boolean;
    cameraRef: React.RefObject<Mapbox.Camera | null>;
}

/**
 * Provides 60 FPS smooth camera tracking by interpolating between GPS updates.
 * Google Maps-style navigation camera that feels buttery smooth.
 */
export function useSmoothCameraTracking({
    location,
    isTracking,
    cameraRef,
}: UseSmoothCameraTrackingProps) {
    const targetPositionRef = useRef<[number, number] | null>(null);
    const targetHeadingRef = useRef<number>(0);
    const currentPositionRef = useRef<[number, number] | null>(null);
    const currentHeadingRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);
    const lastUpdateTimeRef = useRef<number>(Date.now());

    // Update target when location changes
    useEffect(() => {
        if (!location) return;

        targetPositionRef.current = [location.longitude, location.latitude];
        targetHeadingRef.current = location.heading ?? 0;

        // Initialize current position on first location
        if (currentPositionRef.current === null) {
            currentPositionRef.current = [location.longitude, location.latitude];
            currentHeadingRef.current = location.heading ?? 0;
        }
    }, [location]);

    // 60 FPS animation loop
    useEffect(() => {
        if (!isTracking || !cameraRef.current) {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            return;
        }

        const animate = () => {
            const now = Date.now();
            const deltaTime = now - lastUpdateTimeRef.current;
            lastUpdateTimeRef.current = now;

            // Smooth interpolation factor (0-1)
            // Higher value = faster convergence, lower = smoother
            const smoothingFactor = Math.min(deltaTime / 100, 1); // Converge over ~100ms

            if (
                !targetPositionRef.current ||
                !currentPositionRef.current ||
                !cameraRef.current
            ) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }

            // Interpolate position
            const [targetLon, targetLat] = targetPositionRef.current;
            const [currentLon, currentLat] = currentPositionRef.current;

            const newLon = currentLon + (targetLon - currentLon) * smoothingFactor;
            const newLat = currentLat + (targetLat - currentLat) * smoothingFactor;

            currentPositionRef.current = [newLon, newLat];

            // Interpolate heading (handle 0/360 wrapping)
            const targetHeading = targetHeadingRef.current;
            const currentHeading = currentHeadingRef.current;

            let headingDiff = targetHeading - currentHeading;
            // Normalize to -180 to 180
            while (headingDiff > 180) headingDiff -= 360;
            while (headingDiff < -180) headingDiff += 360;

            const newHeading = currentHeading + headingDiff * smoothingFactor;
            currentHeadingRef.current = newHeading;

            // Update camera (no animation duration - we're animating manually at 60 FPS)
            cameraRef.current.setCamera({
                centerCoordinate: [newLon, newLat],
                heading: newHeading,
                pitch: 60,
                zoomLevel: 18.5,
                animationDuration: 0, // Instant updates, we handle smoothness
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isTracking, cameraRef]);
}
