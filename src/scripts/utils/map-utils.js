import L from 'leaflet';

// Fix untuk marker icons di Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

let currentMap = null;
let clickMarker = null;
let markerLayer = null;

/**
 * Inisialisasi peta dengan kontrol default
 * @param {string} elementId - ID container peta
 * @param {Array} stories - Data cerita (opsional)
 * @returns {L.Map} Objek peta Leaflet
 */
export const initMap = (elementId, stories = []) => {
  // Validasi container
  const container = document.getElementById(elementId);
  if (!container) {
    console.error(`Container #${elementId} tidak ditemukan`);
    return null;
  }

  // Pastikan container punya height
  if (!container.style.height) {
    container.style.height = '500px';
  }

  // Inisialisasi peta dengan zoom default (kiri atas)
  const map = L.map(elementId, {
    center: [-2.5489, 118.0149],
    zoom: 5,
    zoomAnimation: true
  });

  // Layer dasar (default OpenStreetMap)
  const baseLayers = {
    "OpenStreetMap": L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }
    ).addTo(map), // Layer default
    
    "Satellite": L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      }
    ),
    
    "Topografi": L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 17
      }
    )
  };

  // Layer control default (kanan atas)
  L.control.layers(baseLayers, null, {
    collapsed: true // Mode collapsed default
  }).addTo(map);

  // Tambahkan marker jika ada data
  if (stories.length > 0) {
    addStoryMarkers(map, stories);
  }

  // Handle resize
  window.addEventListener('resize', () => {
    map.invalidateSize();
  });

  currentMap = map;
  return map;
};

/**
 * Menambahkan marker cerita ke peta
 * @param {L.Map} map - Objek peta
 * @param {Array} stories - Data cerita
 */
export const addStoryMarkers = (map, stories) => {
  if (markerLayer) {
    map.removeLayer(markerLayer);
  }

  const markers = stories
    .filter(story => story.lat && story.lon)
    .map(story => {
      const marker = L.marker([story.lat, story.lon]);
      
      marker.bindPopup(`
        <b>${story.name}</b><br>
        ${story.photoUrl ? `<img src="${story.photoUrl}" width="150"><br>` : ''}
        <p>${story.description?.substring(0, 100)}...</p>
        <small>${story.createdAt ? new Date(story.createdAt).toLocaleDateString() : ''}</small>
        <br><a href="#/detail/${story.id}">Read more</a>
      `);
      
      return marker;
    });

  markerLayer = L.layerGroup(markers).addTo(map);

  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
  }
};

/**
 * Membersihkan peta
 */
export const cleanupMap = () => {
  if (currentMap) {
    currentMap.off();
    currentMap.remove();
    currentMap = null;
  }
  markerLayer = null;
  clickMarker = null;
};

export default {
  initMap,
  addStoryMarkers,
  cleanupMap
};