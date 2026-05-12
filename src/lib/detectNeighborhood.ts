/** Heuristic neighborhood label from a free-form address string (Charleston metro). */
export function detectNeighborhood(addr: string): string {
  const l = addr.toLowerCase();
  if (l.includes('mount pleasant') || l.includes('mt pleasant')) return 'Mount Pleasant';
  if (l.includes('james island')) return 'James Island';
  if (l.includes('west ashley')) return 'West Ashley';
  if (l.includes('isle of palms') || l.includes('iop')) return 'Isle of Palms';
  if (l.includes('sullivan')) return "Sullivan's Island";
  if (l.includes('folly')) return 'Folly Beach';
  if (l.includes('daniel island')) return 'Daniel Island';
  if (l.includes('summerville')) return 'Summerville';
  if (l.includes('kiawah')) return 'Kiawah Island';
  if (l.includes('seabrook')) return 'Seabrook Island';
  if (l.includes('goose creek')) return 'Goose Creek';
  if (l.includes('hanahan')) return 'Hanahan';
  if (l.includes('north charleston')) return 'North Charleston';
  if (l.includes('charleston')) return 'Downtown Charleston';
  return 'Charleston Metro';
}
