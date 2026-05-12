import CharlestonAddressField from './CharlestonAddressField';

interface AddressSearchProps {
  onAddressSelect: (address: string) => void;
  onClear: () => void;
}

/** Landing hero: modern Places autocomplete + immediate manual fallback. */
export default function AddressSearch({ onAddressSelect, onClear }: AddressSearchProps) {
  return (
    <CharlestonAddressField
      variant="hero"
      placeholder="Enter a Charleston area address…"
      onPick={(sel) => onAddressSelect(sel.formattedAddress)}
      onClear={onClear}
    />
  );
}
