import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type WebMapProps = {
  lat: number;
  lng: number;
  apiKey: string;
  height: number;
};

const WebMap: React.FC<WebMapProps> = ({ lat, lng, apiKey, height }) => {
  // Use LocationIQ tile layer
  const tileUrl = `https://api.locationiq.com/v1/tiles/satellite/{z}/{x}/{y}?key=${apiKey}&maptype=satellite`;

  if (!lat || !lng) {
    return <div style={{ height: `${height}px`, backgroundColor: '#dbeafe' }}>Location not available</div>;
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: `${height}px`, width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url={tileUrl}
        attribution=''
        maxZoom={20}
      />
      <Marker position={[lat, lng]}>
        <Popup>
          Location: {lat.toFixed(5)}, {lng.toFixed(5)}
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default WebMap;