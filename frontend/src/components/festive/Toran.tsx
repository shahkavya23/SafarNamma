/* A toran of marigolds and mango leaves, hung in swags across the top of a section.
   The swags repeat, so a wide screen shows more of them instead of stretching the flowers. */

const SWAGS = 8;
const SWAG_W = 300;
const PER_SWAG = 14;
const SAG = 30;
const H = 56;

const strings: string[] = [];
const flowers: { x: number; y: number; deep: boolean }[] = [];
const leaves: { x: number; y: number; angle: number }[] = [];

for (let s = 0; s < SWAGS; s++) {
  const x0 = s * SWAG_W;
  const x1 = x0 + SWAG_W;
  strings.push(`M${x0} 2 Q ${(x0 + x1) / 2} ${SAG * 2} ${x1} 2`);
  for (let i = 0; i <= PER_SWAG; i++) {
    const t = i / PER_SWAG;
    const x = x0 + SWAG_W * t;
    const y = 4 + SAG * 4 * t * (1 - t) * 0.95;
    if (i % 4 === 2) leaves.push({ x, y, angle: (t - 0.5) * 30 });
    flowers.push({ x, y, deep: i % 2 === 1 });
  }
}

export const Toran = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden viewBox={`0 0 ${SWAGS * SWAG_W} ${H}`} preserveAspectRatio="xMidYMin slice" className={className}>
    <g className="toran-sway">
      {strings.map((d, i) => (
        <path key={i} d={d} stroke="#7A5A2A" strokeWidth={1.2} fill="none" />
      ))}
      {leaves.map(({ x, y, angle }, i) => (
        <ellipse key={i} cx={x} cy={y + 10} rx={3.2} ry={9} fill="#4E7A3A" transform={`rotate(${angle} ${x} ${y})`} />
      ))}
      {flowers.map(({ x, y, deep }, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={5.6} fill={deep ? '#E07B0C' : '#F2A516'} />
          <circle cx={x - 1.2} cy={y - 1.2} r={2} fill="rgba(255,240,200,0.6)" />
        </g>
      ))}
    </g>
  </svg>
);
