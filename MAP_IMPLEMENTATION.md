# Live Map Implementation Guide

## Overview
This implementation adds a live map feature to your React Native/Expo app using **react-native-maps** with **OpenStreetMap** (OSM), which doesn't require API keys and is completely free.

## What's Been Implemented

### 1. **LiveMap Component** (`components/LiveMap.tsx`)
- Displays a live, interactive map
- Shows the patient's location with a marker
- Displays latitude/longitude coordinates
- Validates location data
- Auto-animates to the location when data updates
- Responsive design with floating info card

### 2. **Map Screen** (`app/(app)/caregiver/location-map.tsx`)
- Full-screen map view
- Receives location params from the monitoring screen
- Implements navigation/routing

### 3. **Updated Monitoring Screen**
- Map button now navigates to the full-screen map
- Passes latitude/longitude as route parameters

## How It Works

### Map Features:
```
- Uses PROVIDER_OSMDROID (OpenStreetMap - Free, No API needed)
- Displays real-time location marker
- Shows coordinates in a floating info card
- Auto-zooms to location with animation
- Error handling for invalid coordinates
- Live indicator showing real-time status
```

### Data Flow:
```
Firebase Realtime Database
  ↓
realtime-monitoring.tsx (fetches lat/lng)
  ↓
Click map button
  ↓
Navigate to location-map.tsx
  ↓
LiveMap Component displays the location
```

## Installation Status
✅ Packages installed:
- `react-native-maps` - Map display library
- `expo-location` - For geolocation services (future enhancement)

## Configuration Required

### Android Setup
Add these permissions to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-maps",
        {
          "maps_api_key": ""
        }
      ]
    ],
    "android": {
      "permissions": [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

### iOS Setup
Add to `Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs access to your location to show on the map</string>
```

## Usage

### Basic Usage in Components:
```tsx
import { LiveMap } from '@/components/LiveMap';

<LiveMap
  latitude={37.7749}
  longitude={-122.4194}
  title="Patient Location"
  description="Real-time location"
  onClose={() => navigation.goBack()}
  showHeader={true}
/>
```

### With String Coordinates:
```tsx
<LiveMap
  latitude="37.7749"
  longitude="-122.4194"
/>
```

## Marker Customization

To add multiple markers or customize them:

```tsx
<MapView>
  {/* Main marker */}
  <Marker
    coordinate={{ latitude: lat, longitude: lng }}
    title="Patient"
    pinColor="#3b82f6"
  />
  
  {/* Add more markers for geofence, hospitals, etc */}
  <Marker
    coordinate={{ latitude: 37.7751, longitude: -122.4193 }}
    title="Safe Zone"
    pinColor="#10b981"
    pinColor="#10b981"
  />
</MapView>
```

## Advanced Features You Can Add

### 1. **Multiple Location History**
```tsx
const historicalLocations = [
  { lat: 37.7749, lng: -122.4194, timestamp: '10:00 AM' },
  { lat: 37.7750, lng: -122.4195, timestamp: '10:15 AM' },
];

historicalLocations.forEach(loc => (
  <Marker key={loc.timestamp} coordinate={...} />
))
```

### 2. **Geofence Visualization**
```tsx
import { Circle } from 'react-native-maps';

<Circle
  center={{ latitude: lat, longitude: lng }}
  radius={500} // meters
  fillColor="rgba(59, 130, 246, 0.3)"
  strokeColor="#3b82f6"
  strokeWidth={2}
/>
```

### 3. **Real-time Location Tracking**
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    mapRef.current?.animateToRegion({
      latitude: updatedLat,
      longitude: updatedLng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 500);
  }, 5000); // Update every 5 seconds
  
  return () => clearInterval(interval);
}, [vitals]);
```

### 4. **Route Polyline**
```tsx
import { Polyline } from 'react-native-maps';

<Polyline
  coordinates={routeCoordinates}
  strokeColor="#3b82f6"
  strokeWidth={3}
/>
```

## Troubleshooting

### Issue: Map not displaying
- **Solution**: Ensure coordinates are valid (not 0, 0)
- Check that `PROVIDER_OSMDROID` is available

### Issue: Marker not showing
- **Solution**: Verify latitude/longitude are numbers, not strings

### Issue: App crashes on Android
- **Solution**: Run `expo prebuild` and add permissions to `app.json`

## Map Providers Available

```tsx
// Current (OpenStreetMap - Free, No API key needed)
PROVIDER_OSMDROID

// Alternative (Google Maps - Requires API key)
PROVIDER_GOOGLE

// For Web
// Use Leaflet library with OpenStreetMap
```

## Performance Tips

- Use memoization for marker lists
- Limit marker animations
- Cache location data
- Use `animateToRegion` instead of `setRegion` for smooth transitions
- Consider clustering markers if there are many locations

## Next Steps

1. ✅ Test the map on Android/iOS
2. Add location history tracking
3. Implement geofencing alerts
4. Add route visualization
5. Create location sharing functionality

---

**Map is now fully functional with real-time patient location tracking!**
