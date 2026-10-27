/** Public demo configuration. Never put secrets or personal data here. */
export const demoConfig = {
  floorCount: 32,
  initialFloor: 18,
  storageKey: 'nv-estate-vision.preference.v1',
  contact: { verified: false, email: '', whatsapp: '' },
  map: {
    // Area overview, deliberately not a property coordinate or a project marker.
    center: [6.91, 79.865] as [number, number],
    zoom: 12,
    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};
