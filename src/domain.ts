export type Availability = 'available' | 'reserved';
export type Unit = { id: string; floor: number; bedrooms: number; area: number; collection: string; status: Availability; aspect: string };
export type Preference = { bedrooms: number; floor: number; priority: 'outdoor' | 'layout' | 'wellness' };
export function validFloor(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 32;
}
export function unitsForFloor(floor: number): Unit[] {
  if (!validFloor(floor)) return [];
  return [1, 2, 3].map((bedrooms, i) => ({
    id: `${String(floor).padStart(2, '0')}${['A', 'B', 'C'][i]}`, floor, bedrooms,
    area: [72, 118, 176][i], collection: ['Studio', 'Horizon', 'Skyline'][i],
    status: (floor + i) % 4 === 0 ? 'reserved' : 'available',
    aspect: ['Garden aspect', 'City aspect', 'Terrace aspect'][i],
  }));
}
export function filterUnits(units: Unit[], bedrooms: string, availability: string): Unit[] {
  return units.filter(unit => (bedrooms === 'all' || unit.bedrooms === Number(bedrooms)) && (availability === 'all' || unit.status === availability));
}
export function parsePreference(value: unknown): Preference | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  if (!validFloor(p.floor) || ![1, 2, 3].includes(p.bedrooms as number) || !['outdoor', 'layout', 'wellness'].includes(p.priority as string)) return null;
  return { bedrooms: p.bedrooms as number, floor: p.floor, priority: p.priority as Preference['priority'] };
}
export function contactLink(contact: { verified: boolean; email: string; whatsapp: string }): string | null {
  if (!contact.verified) return null;
  if (/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(contact.email)) return `mailto:${contact.email}`;
  if (/^[1-9]\d{7,14}$/.test(contact.whatsapp)) return `https://wa.me/${contact.whatsapp}`;
  return null;
}
