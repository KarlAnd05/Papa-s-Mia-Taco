// Decorative pieces of the PMT look (papel picado, waves, scallops, zigzag headings).

export function PapelPicadoBorder({ invert = false }: { invert?: boolean }) {
  const colors = invert
    ? ['#F4AA1C', '#0F5D2F', '#A71F29', '#0F5D2F', '#F4AA1C', '#0F5D2F', '#A71F29', '#0F5D2F']
    : ['#0F5D2F', '#F4AA1C', '#A71F29', '#F4AA1C', '#0F5D2F', '#A71F29', '#F4AA1C', '#0F5D2F'];
  const triangleW = 50;
  const triangleH = 32;
  const count = 30; // enough to fill any width
  return (
    <div className="w-full overflow-hidden" style={{ height: triangleH + 8 }}>
      <svg width={triangleW * count} height={triangleH + 8} style={{ display: 'block' }}>
        {Array.from({ length: count }).map((_, i) => (
          <polygon
            key={i}
            points={`${i * triangleW},0 ${(i + 1) * triangleW},0 ${i * triangleW + triangleW / 2},${triangleH}`}
            fill={colors[i % colors.length]}
          />
        ))}
        {/* thin rope line */}
        <line x1="0" y1="4" x2={triangleW * count} y2="4" stroke="#222" strokeWidth="1.5" opacity="0.3" />
      </svg>
    </div>
  );
}

export function WaveDivider({ color = '#0F5D2F', flip = false }: { color?: string, flip?: boolean }) {
  return (
    <div style={{ lineHeight: 0, transform: flip ? 'scaleY(-1)' : undefined }}>
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 60 }}>
        <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z" fill={color} />
      </svg>
    </div>
  );
}

export function ScallopedEdge({ fill = '#F8F5EF', bg = '#0F5D2F' }: { fill?: string, bg?: string }) {
  const n = 40;
  const r = 20;
  const w = n * r * 2;
  const h = r;
  const d = Array.from({ length: n }).map((_, i) =>
    `A ${r} ${r} 0 0 1 ${(i + 1) * r * 2} 0`
  ).join(' ');
  return (
    <div style={{ background: bg, lineHeight: 0 }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 24 }}>
        <path d={`M0,0 ${d} L${w},0 L${w},${h} L0,${h} Z`} fill={fill} />
      </svg>
    </div>
  );
}

export function Zigzag({ color, width = 200 }: { color: string; width?: number }) {
  const points = Array.from({ length: width / 10 + 1 }, (_, i) => `${i * 10},${i % 2 === 0 ? 10 : 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} 12`} style={{ width, maxWidth: "100%", height: 12, display: "block", margin: "8px auto 0" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" />
    </svg>
  );
}

export const HEADING_COLORS = ['#0F5D2F', '#A71F29', '#F4AA1C'];

export function SectionHeading({ text, index }: { text: string, index: number }) {
  const color = HEADING_COLORS[index % 3];
  return (
    <div className="text-center mb-8">
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.02em', fontStyle: 'italic' }}>
        {text}
      </h2>
      <Zigzag color={color} />
    </div>
  );
}

export function BoostBox({ text }: { text: string }) {
  return (
    <div style={{
      background: '#0F5D2F',
      border: '3px dashed #F4AA1C',
      borderRadius: 16,
      padding: '16px 20px',
      margin: '12px 0',
    }}>
      <p style={{ color: '#F4AA1C', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        Boost Your Meal
      </p>
      <p style={{ color: '#FFCA5F', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}
