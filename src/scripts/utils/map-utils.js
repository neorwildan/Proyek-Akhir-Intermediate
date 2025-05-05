import L from 'leaflet';
import 'leaflet.vectorgrid';

let currentMap = null;
let clickMarker = null;
let markerLayer = null;
let baseLayers = {};
let overlayLayers = {};

export const initMap = (elementId, stories = []) => {
  const map = L.map(elementId).setView([-2.5489, 118.0149], 5);
  
  baseLayers = {
    "OpenStreetMap": L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    ),
    "Satellite": L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
      }
    ),
    "Topografi": L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    )
  };

  baseLayers["OpenStreetMap"].addTo(map);

  L.control.layers(baseLayers, overlayLayers, {
    position: 'topright'
  }).addTo(map);

  if (stories.length > 0) {
    addStoryMarkers(map, stories);
  }

  currentMap = map;
  return map;
};

export const addStoryMarkers = (map, stories) => {
  if (markerLayer) {
    map.removeLayer(markerLayer);
  }

  const markers = stories
    .filter(story => story.lat && story.lon)
    .map(story => {
      const marker = L.marker([story.lat, story.lon], {
        icon: L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      });
      
      marker.bindPopup(`
        <b>${story.name}</b><br>
        <img src="${story.photoUrl}" width="150"><br>
        <p>${story.description.substring(0, 100)}...</p>
        <small>${new Date(story.createdAt).toLocaleDateString()}</small>
        <br><a href="#/detail?id=${story.id}">Read full story</a>
      `);
      
      return marker;
    });

  markerLayer = L.layerGroup(markers).addTo(map);

  if (markers.length > 0) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
};

export const getLastClickLocation = () => {
  return clickMarker ? clickMarker.getLatLng() : null;
};

export const enableLocationPicker = (map, onLocationSelected = null) => {
  if (clickMarker) {
    map.removeLayer(clickMarker);
  }

  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    
    clickMarker = L.marker([lat, lng], {
      draggable: true,
      icon: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconSize: [25, 41]
      })
    }).addTo(map);

    clickMarker.bindPopup(`Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`).openPopup();

    if (onLocationSelected) {
      onLocationSelected({ lat, lng });
    }
  });
};

export const disableLocationPicker = () => {
  if (currentMap) {
    currentMap.off('click');
  }
};

export const changeBaseLayer = (layerName) => {
  if (currentMap && baseLayers[layerName]) {
    currentMap.eachLayer(layer => {
      if (Object.values(baseLayers).includes(layer)) {
        currentMap.removeLayer(layer);
      }
    });
    baseLayers[layerName].addTo(currentMap);
  }
};

export const toggleOverlay = (layerName, show) => {
  if (currentMap && overlayLayers[layerName]) {
    if (show) {
      overlayLayers[layerName].addTo(currentMap);
    } else {
      currentMap.removeLayer(overlayLayers[layerName]);
    }
  }
};