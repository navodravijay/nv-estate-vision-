export type Chapter = 'arrival' | 'garden' | 'sky';
export const chapters = [
  { id: 'arrival', title: 'An arrival, considered.', eyebrow: '01 / THE ARRIVAL', description: 'A sculptural silhouette. A sheltered entrance. A different rhythm for coming home.', position: [16, 7, 22], target: [0, 5, 0], fov: 41, lighting: 'daylight' },
  { id: 'garden', title: 'A quieter kind of blue.', eyebrow: '02 / THE WATER GARDEN', description: 'Light across water, planted edges and space to pause. An imagined retreat above the everyday.', position: [13, 8.5, 12], target: [4.1, 3.1, .7], fov: 43, lighting: 'daylight' },
  { id: 'sky', title: 'The evening, elevated.', eyebrow: '03 / THE SKY TERRACE', description: 'Warm architectural light and an open horizon. A closer perspective on the crown of Skyline.', position: [-12, 26, 15], target: [-1.8, 20.5, -.4], fov: 40, lighting: 'blue-hour' },
] as const;

export function chapterAt(index: number) {
  if (!Number.isInteger(index)) return chapters[0];
  return chapters[((index % chapters.length) + chapters.length) % chapters.length];
}
