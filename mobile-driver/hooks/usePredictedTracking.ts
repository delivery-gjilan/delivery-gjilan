import { useEffect, useRef } from 'react';

interface LocationLike {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
}

interface UsePredictedTrackingProps {
  sourceLocation: LocationLike | null;
  isActive: boolean;
  followCamera: boolean;
  cameraRef: React.RefObject<any>;
  markerRef: React.RefObject<any>;
  arrowRef: React.RefObject<any>;
  zoomLevel?: number;
  pitch?: number;
  followMode?: 'free' | 'heading-up' | 'north-up';
  deadZoneOffsetMeters?: number;
  headingSnapThresholdDeg?: number;
  adaptiveZoom?: boolean;
}

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function normalizeHeading(deg: number): number {
  let value = deg % 360;
  if (value < 0) value += 360;
  return value;
}

function shortestAngleDelta(current: number, target: number): number {
  let delta = target - current;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function haversineMeters(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function bearingDeg(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const dLon = toRad(toLon - fromLon);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return normalizeHeading(toDeg(Math.atan2(y, x)));
}

function destinationPoint(
  lat: number,
  lon: number,
  headingDeg: number,
  distanceMeters: number,
): [number, number] {
  const angularDistance = distanceMeters / EARTH_RADIUS_M;
  const brng = toRad(headingDeg);
  const lat1 = toRad(lat);
  const lon1 = toRad(lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(brng),
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [toDeg(lon2), toDeg(lat2)];
}

export function usePredictedTracking({
  sourceLocation,
  isActive,
  followCamera,
  cameraRef,
  markerRef,
  arrowRef,
  zoomLevel = 18.5,
  pitch = 60,
  followMode = 'heading-up',
  deadZoneOffsetMeters = 90,
  headingSnapThresholdDeg = 10,
  adaptiveZoom = true,
}: UsePredictedTrackingProps) {
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const anchorPosRef = useRef<[number, number] | null>(null);
  const anchorHeadingRef = useRef<number>(0);
  const anchorSpeedRef = useRef<number>(0);
  const anchorTimeRef = useRef<number>(0);

  const currentPosRef = useRef<[number, number] | null>(null);
  const currentHeadingRef = useRef<number>(0);

  const prevBackendRef = useRef<LocationLike | null>(null);
  const prevBackendTsRef = useRef<number>(0);

  useEffect(() => {
    if (!sourceLocation) return;

    const now = Date.now();
    const prev = prevBackendRef.current;
    const prevTs = prevBackendTsRef.current;

    let inferredHeading = sourceLocation.heading ?? anchorHeadingRef.current;
    let inferredSpeed = sourceLocation.speed ?? anchorSpeedRef.current;

    if (prev && prevTs > 0) {
      const dtSeconds = Math.max((now - prevTs) / 1000, 0.001);
      const distanceMeters = haversineMeters(
        prev.latitude,
        prev.longitude,
        sourceLocation.latitude,
        sourceLocation.longitude,
      );

      const calculatedSpeed = distanceMeters / dtSeconds;
      if (!Number.isFinite(inferredSpeed) || inferredSpeed === null || inferredSpeed < 0) {
        inferredSpeed = calculatedSpeed;
      }

      if (!Number.isFinite(sourceLocation.heading ?? NaN)) {
        inferredHeading = bearingDeg(
          prev.latitude,
          prev.longitude,
          sourceLocation.latitude,
          sourceLocation.longitude,
        );
      }
    }

    const safeHeading = normalizeHeading(inferredHeading ?? 0);
    const safeSpeed = Math.max(0, Math.min(inferredSpeed ?? 0, 60));

    anchorPosRef.current = [sourceLocation.longitude, sourceLocation.latitude];
    anchorHeadingRef.current = safeHeading;
    anchorSpeedRef.current = safeSpeed;
    anchorTimeRef.current = now;

    if (currentPosRef.current === null) {
      currentPosRef.current = [sourceLocation.longitude, sourceLocation.latitude];
      currentHeadingRef.current = safeHeading;
    }

    prevBackendRef.current = sourceLocation;
    prevBackendTsRef.current = now;
  }, [sourceLocation]);

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const frame = (time: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
      const deltaMs = Math.max(time - lastFrameTimeRef.current, 1);
      lastFrameTimeRef.current = time;

      const anchorPos = anchorPosRef.current;
      const currentPos = currentPosRef.current;
      if (!anchorPos || !currentPos) {
        animationFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      const ageSeconds = Math.max((Date.now() - anchorTimeRef.current) / 1000, 0);
      const predictionSeconds = Math.min(ageSeconds, 12);
      const predictedDistance = anchorSpeedRef.current * predictionSeconds;

      const [predLon, predLat] = destinationPoint(
        anchorPos[1],
        anchorPos[0],
        anchorHeadingRef.current,
        predictedDistance,
      );

      const positionTauMs = 350;
      const headingTauMs = 250;
      const posAlpha = 1 - Math.exp(-deltaMs / positionTauMs);
      const headingAlpha = 1 - Math.exp(-deltaMs / headingTauMs);

      const nextLon = currentPos[0] + (predLon - currentPos[0]) * posAlpha;
      const nextLat = currentPos[1] + (predLat - currentPos[1]) * posAlpha;
      currentPosRef.current = [nextLon, nextLat];

      const headingDelta = shortestAngleDelta(
        currentHeadingRef.current,
        anchorHeadingRef.current,
      );
      const shouldRotate = Math.abs(headingDelta) >= headingSnapThresholdDeg;
      const nextHeading = shouldRotate
        ? normalizeHeading(currentHeadingRef.current + headingDelta * headingAlpha)
        : currentHeadingRef.current;
      currentHeadingRef.current = nextHeading;

      markerRef.current?.setNativeProps?.({
        coordinate: [nextLon, nextLat],
      });

      arrowRef.current?.setNativeProps?.({
        style: {
          transform: [{ rotate: `${nextHeading}deg` }],
        },
      });

      if (followCamera && cameraRef.current) {
        const speedMps = anchorSpeedRef.current;
        const speedKmh = speedMps * 3.6;

        let targetZoom = zoomLevel;
        if (adaptiveZoom) {
          if (speedKmh >= 60) targetZoom = zoomLevel - 1.1;
          else if (speedKmh >= 40) targetZoom = zoomLevel - 0.7;
          else if (speedKmh >= 25) targetZoom = zoomLevel - 0.35;
        }

        const cameraHeading = followMode === 'north-up' ? 0 : nextHeading;
        const [camLon, camLat] = destinationPoint(
          nextLat,
          nextLon,
          cameraHeading,
          deadZoneOffsetMeters,
        );

        cameraRef.current.setCamera({
          centerCoordinate: [camLon, camLat],
          heading: cameraHeading,
          zoomLevel: targetZoom,
          pitch,
          animationDuration: 0,
        });
      }

      animationFrameRef.current = requestAnimationFrame(frame);
    };

    animationFrameRef.current = requestAnimationFrame(frame);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameTimeRef.current = 0;
    };
  }, [
    isActive,
    followCamera,
    cameraRef,
    markerRef,
    arrowRef,
    pitch,
    zoomLevel,
    followMode,
    deadZoneOffsetMeters,
    headingSnapThresholdDeg,
    adaptiveZoom,
  ]);
}
