import React, { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Dynamically import react-leaflet only on web platform
const WebMap = Platform.OS === 'web' ? React.lazy(() => import('./WebMap')) : null;

export type LocationIQMapProps = {
  lat: number;
  lng: number;
  apiKey: string;
  height?: number;
  markerColor?: string;
};

export default function LocationIQMap({ lat, lng, apiKey, height = 300 }: LocationIQMapProps) {
  // For web platform, use react-leaflet
  if (Platform.OS === 'web') {
    return (
      <View style={{ height, width: '100%', backgroundColor: '#dbeafe' }}>
        {WebMap ? (
          <React.Suspense fallback={<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />}>
            <WebMap lat={lat} lng={lng} apiKey={apiKey} height={height} />
          </React.Suspense>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '100%', height: '100%', backgroundColor: '#dbeafe' }} />
          </View>
        )}
      </View>
    );
  }

  // For mobile platforms, use WebView
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const src = useMemo(() => {
      // Leaflet tile layer via LocationIQ (raster tiles)
      // Using the standard tile endpoint.
      // eslint-disable-next-line no-useless-escape
      const tileUrl = `https://api.locationiq.com/v1/tiles/satellite/{z}/{x}/{y}?key=${encodeURIComponent(apiKey)}&maptype=satellite`;

      const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const lat = ${Number(lat)};
  const lng = ${Number(lng)};
  const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([lat, lng], 15);

  // Tiles
  L.tileLayer('${tileUrl}', {
    maxZoom: 20,
    tileSize: 256,
    detectRetina: true
  }).addTo(map);

  // Marker
  const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  L.marker([lat, lng], { icon: markerIcon }).addTo(map);

  // notify ready
  map.whenReady(() => {
    try {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
    } catch(e){}
  });
</script>
</body>
</html>`;

      return html;
    }, [apiKey, lat, lng]);

    return (
      <View style={{ height, width: '100%', backgroundColor: '#dbeafe' }}>
        <WebView
          style={{ flex: 1 }}
          originWhitelist={['*']}
          source={{ html: src }}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    );
  }

  // For other platforms, show a placeholder
  return <View style={{ height, width: '100%', backgroundColor: '#dbeafe' }} />;
}