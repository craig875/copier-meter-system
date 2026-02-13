/**
 * MeterBlocks - Visual indicator for machine type: colour machines show 4 blocks (K,C,M,Y), mono show 1 black block.
 */
const COLOUR_BLOCKS = [
  { id: 'k', color: '#1f2937', label: 'Black' },
  { id: 'c', color: '#06b6d4', label: 'Cyan' },
  { id: 'm', color: '#ec4899', label: 'Magenta' },
  { id: 'y', color: '#eab308', label: 'Yellow' },
];

const MONO_BLOCK = { id: 'k', color: '#1f2937', label: 'Mono' };

export default function MeterBlocks({ isColour, size = 'sm', className = '' }) {
  const blocks = isColour ? COLOUR_BLOCKS : [MONO_BLOCK];
  const sizeClasses = size === 'lg' ? 'w-4 h-4' : 'w-2.5 h-2.5';

  return (
    <div className={`inline-flex gap-0.5 ${className}`} title={isColour ? 'Colour machine' : 'Mono machine'}>
      {blocks.map((b) => (
        <span
          key={b.id}
          className={`${sizeClasses} rounded border border-gray-200 shadow-sm flex-shrink-0`}
          style={{ backgroundColor: b.color }}
          title={b.label}
        />
      ))}
    </div>
  );
}
