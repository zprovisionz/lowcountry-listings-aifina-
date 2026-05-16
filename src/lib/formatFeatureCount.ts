/** MLS / UI copy: "1 feature" vs "12 features" */
export function formatFeatureCount(n: number): string {
  if (n === 1) return '1 feature';
  return `${n} features`;
}
