'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const RADIUS_OPTIONS = [
  { label: '500 m',  value: 500 },
  { label: '1 km',   value: 1000 },
  { label: '2 km',   value: 2000 },
  { label: '5 km',   value: 5000 },
  { label: '10 km',  value: 10000 },
  { label: '25 km',  value: 25000 },
];

export type PinLocation = {
  lat: number;
  lng: number;
  radiusMeters: number;
  locationName: string;
};

// ── Radius circle overlay ─────────────────────────────────────────────────────
function RadiusCircle({ center, radius }: { center: { lat: number; lng: number }; radius: number }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;
    circleRef.current = new mapsLib.Circle({
      map,
      center,
      radius,
      strokeColor: '#ec4899',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: '#ec4899',
      fillOpacity: 0.1,
    });
    return () => { circleRef.current?.setMap(null); };
  }, [map, mapsLib]);

  useEffect(() => {
    circleRef.current?.setCenter(center);
    circleRef.current?.setRadius(radius);
  }, [center, radius]);

  return null;
}

// ── Geocoder hook ─────────────────────────────────────────────────────────────
function useReverseGeocode() {
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (geocodingLib) geocoderRef.current = new geocodingLib.Geocoder();
  }, [geocodingLib]);

  return useCallback(async (lat: number, lng: number): Promise<string> => {
    if (!geocoderRef.current) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const result = await geocoderRef.current.geocode({ location: { lat, lng } });
      const components: google.maps.GeocoderAddressComponent[] = result.results[0]?.address_components ?? [];
      const locality = components.find((c) => c.types.includes('locality'))?.long_name;
      const area = components.find((c) => c.types.includes('sublocality_level_1') || c.types.includes('neighborhood'))?.long_name;
      const country = components.find((c) => c.types.includes('country'))?.long_name;
      const place = area ?? locality;
      return place ? `${place}${country ? ', ' + country : ''}` : (result.results[0]?.formatted_address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }, []);
}

// ── Inner map component (has access to map context) ──────────────────────────
function MapInterior({
  pin,
  radius,
  onPinChange,
}: {
  pin: { lat: number; lng: number } | null;
  radius: number;
  onPinChange: (lat: number, lng: number, name: string) => void;
}) {
  const reverseGeocode = useReverseGeocode();
  const [geocoding, setGeocoding] = useState(false);

  const handleClick = useCallback(async (e: MapMouseEvent) => {
    const lat = e.detail.latLng?.lat;
    const lng = e.detail.latLng?.lng;
    if (lat == null || lng == null) return;
    setGeocoding(true);
    const name = await reverseGeocode(lat, lng);
    setGeocoding(false);
    onPinChange(lat, lng, name);
  }, [reverseGeocode, onPinChange]);

  return (
    <>
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={{ lat: 25.2048, lng: 55.2708 }}
        defaultZoom={11}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="nexus-lead-map"
        onClick={handleClick}
      >
        {pin && (
          <>
            <AdvancedMarker position={pin} />
            <RadiusCircle center={pin} radius={radius} />
          </>
        )}
      </Map>
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export function MapPinPicker({
  value,
  onChange,
}: {
  value: PinLocation | null;
  onChange: (loc: PinLocation | null) => void;
}) {
  const [radius, setRadius] = useState(2000);
  const valueRef = useRef(value);
  valueRef.current = value;

  const handlePinChange = useCallback((lat: number, lng: number, locationName: string) => {
    onChange({ lat, lng, radiusMeters: radius, locationName });
  }, [radius, onChange]);

  // Sync radius into value when it changes
  useEffect(() => {
    if (valueRef.current) onChange({ ...valueRef.current, radiusMeters: radius });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  return (
    <div>
      <div style={{ width: '100%', height: 360, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e5e7eb' }}>
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <MapInterior
            pin={value ? { lat: value.lat, lng: value.lng } : null}
            radius={radius}
            onPinChange={handlePinChange}
          />
        </APIProvider>
      </div>

      {/* Radius selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', flexShrink: 0 }}>Search radius:</span>
        {RADIUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRadius(opt.value)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              background: radius === opt.value ? '#ec4899' : 'none',
              color: radius === opt.value ? '#fff' : '#6b7280',
              border: `1.5px solid ${radius === opt.value ? '#ec4899' : '#e5e7eb'}`,
              transition: 'all 0.12s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Pin status */}
      <div style={{ marginTop: 10, fontSize: '0.85rem', minHeight: 20 }}>
        {value ? (
          <span style={{ color: '#16a34a', fontWeight: 600 }}>
            📍 {value.locationName} &mdash; {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        ) : (
          <span style={{ color: 'var(--nexus-muted)' }}>Click anywhere on the map to drop a pin</span>
        )}
      </div>
    </div>
  );
}
