import { useState, useEffect, useCallback, useRef } from 'react';
import type Mapbox from '@rnmapbox/maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CAMERA_PREFS_KEY = 'driver_camera_preferences_v1';

export type FollowMode = 'free' | 'heading-up' | 'north-up';

export interface CameraState {
  isFollowing: boolean;
  followMode: FollowMode;
  zoom: number;
  pitch: number;
  heading: number | null;
}

interface UseNavigationCameraOptions {
  navigationZoom?: number;
  navigationPitch?: number;
  overviewZoom?: number;
  animationDuration?: number;
  speedBasedZoom?: boolean;
  defaultFollowMode?: FollowMode;
}

/**
 * Hook for managing navigation camera behavior
 * Handles follow mode, gestures, recenter, and smooth transitions
 */
export function useNavigationCamera(options: UseNavigationCameraOptions = {}) {
  const {
    navigationZoom = 18.5,
    navigationPitch = 55,
    overviewZoom = 13,
    animationDuration = 250,
    speedBasedZoom = false,
    defaultFollowMode = 'heading-up',
  } = options;

  const [cameraState, setCameraState] = useState<CameraState>({
    isFollowing: false,
    followMode: defaultFollowMode,
    zoom: overviewZoom,
    pitch: 0,
    heading: null,
  });

  const cameraRef = useRef<Mapbox.Camera>(null);
  const manualPanDetectedRef = useRef(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const raw = await AsyncStorage.getItem(CAMERA_PREFS_KEY);
        if (!raw) return;

        const prefs = JSON.parse(raw) as Partial<{
          followMode: FollowMode;
          zoom: number;
          pitch: number;
        }>;

        setCameraState((prev) => ({
          ...prev,
          followMode: prefs.followMode ?? prev.followMode,
          zoom: prefs.zoom ?? prev.zoom,
          pitch: prefs.pitch ?? prev.pitch,
        }));
      } catch (error) {
        console.warn('[NavigationCamera] Failed to load camera preferences', error);
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    const persistPreferences = async () => {
      try {
        await AsyncStorage.setItem(
          CAMERA_PREFS_KEY,
          JSON.stringify({
            followMode: cameraState.followMode,
            zoom: cameraState.zoom,
            pitch: cameraState.pitch,
          }),
        );
      } catch (error) {
        console.warn('[NavigationCamera] Failed to persist camera preferences', error);
      }
    };

    persistPreferences();
  }, [cameraState.followMode, cameraState.zoom, cameraState.pitch]);

  // Detect when user manually pans the map
  const handleMapPress = useCallback(() => {
    // Don't auto-disable follow mode on tap - user can use lock button to toggle
    // This allows tapping the map without losing camera lock
  }, []);

  // Enable follow mode (for navigation)
  const enableFollowMode = useCallback(() => {
    setCameraState((prev) => ({
      ...prev,
      isFollowing: prev.followMode !== 'free',
      zoom: navigationZoom,
      pitch: navigationPitch,
      heading: prev.followMode === 'north-up' ? 0 : null,
    }));
    manualPanDetectedRef.current = false;
  }, [navigationZoom, navigationPitch]);

  // Disable follow mode (return to overview)
  const disableFollowMode = useCallback(() => {
    setCameraState(prev => ({
      ...prev,
      isFollowing: false,
      followMode: 'free',
    }));
  }, []);

  // Toggle follow mode without moving camera (preserves current position)
  const toggleFollowMode = useCallback(() => {
    setCameraState(prev => ({
      ...prev,
      isFollowing: !prev.isFollowing,
      followMode: prev.isFollowing ? 'free' : prev.followMode === 'free' ? 'heading-up' : prev.followMode,
    }));
  }, []);

  const setFollowMode = useCallback((mode: FollowMode) => {
    setCameraState((prev) => ({
      ...prev,
      followMode: mode,
      isFollowing: mode !== 'free',
      heading: mode === 'north-up' ? 0 : prev.heading,
    }));
  }, []);

  const cycleFollowMode = useCallback(() => {
    setCameraState((prev) => {
      if (prev.followMode === 'free') {
        return { ...prev, followMode: 'heading-up', isFollowing: true };
      }
      if (prev.followMode === 'heading-up') {
        return { ...prev, followMode: 'north-up', isFollowing: true, heading: 0 };
      }
      return { ...prev, followMode: 'free', isFollowing: false };
    });
  }, []);

  const saveViewportPreference = useCallback((zoom: number, pitch: number) => {
    setCameraState((prev) => ({
      ...prev,
      zoom,
      pitch,
    }));
  }, []);

  // Recenter to driver location
  const recenter = useCallback((
    location: { latitude: number; longitude: number; heading?: number | null }
  ) => {
    if (!cameraRef.current) return;

    enableFollowMode();

    cameraRef.current.setCamera({
      centerCoordinate: [location.longitude, location.latitude],
      zoomLevel: navigationZoom,
      pitch: navigationPitch,
      heading: location.heading ?? 0,
      animationDuration: 600,
    });
  }, [navigationZoom, navigationPitch, enableFollowMode]);

  // Fit bounds for overview
  const fitBounds = useCallback((
    coordinates: Array<[number, number]>,
    padding = [120, 60, 280, 60]
  ) => {
    if (!cameraRef.current || coordinates.length < 2) return;

    const lngs = coordinates.map(c => c[0]);
    const lats = coordinates.map(c => c[1]);

    cameraRef.current.fitBounds(
      [Math.max(...lngs), Math.max(...lats)],
      [Math.min(...lngs), Math.min(...lats)],
      padding,
      800
    );
  }, []);

  // Calculate zoom based on speed (optional feature)
  const getSpeedAdjustedZoom = useCallback((speed: number | null): number => {
    if (!speedBasedZoom || !speed) return navigationZoom;

    // Zoom out slightly at higher speeds for better visibility
    const speedKmh = speed * 3.6;
    if (speedKmh > 60) return navigationZoom - 0.5;
    if (speedKmh > 40) return navigationZoom - 0.3;
    return navigationZoom;
  }, [speedBasedZoom, navigationZoom]);

  return {
    cameraRef,
    cameraState,
    isFollowing: cameraState.isFollowing,
    enableFollowMode,
    disableFollowMode,
    toggleFollowMode,
    setFollowMode,
    cycleFollowMode,
    followMode: cameraState.followMode,
    recenter,
    fitBounds,
    handleMapPress,
    getSpeedAdjustedZoom,
    saveViewportPreference,
  };
}
