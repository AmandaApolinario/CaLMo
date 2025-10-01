// Build an ellipse filled with N slices (equal angles) and return a data URI.
// Colors: array of HEX strings (UPPERCASE). Label is drawn centered.
/*
  makePieEllipseDataUrl({
    label: 'Problem Symptom',
    colors: ['#E8DAEF', '#AED6F1', '#FAD7A0'], // LIGHT LAVENDER, LIGHT BLUE, LIGHT ORANGE
    fontColor: '#000000',  // BLACK
    width: 180,
    height: 80,
    borderColor: '#333333', // DARK GRAY
    borderWidth: 2
  })
*/
export function makePieEllipseDataUrl({
  label,
  colors,
  fontColor = '#000000', // BLACK
  width = 180,
  height = 80,
  borderColor = '#333333', // DARK GRAY
  borderWidth = 2
}) {
  const cols = (colors || []).filter(Boolean);
  if (cols.length === 0) return makeSolidEllipseDataUrl({ label, fill: '#BED7ED' }); // PALE BLUE

  const rx = Math.max(10, Math.round((width  - borderWidth * 2) / 2));
  const ry = Math.max(10, Math.round((height - borderWidth * 2) / 2));
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);

  const slice = (2 * Math.PI) / cols.length;
  const start0 = -Math.PI / 2; // start at 12 o'clock

  const paths = cols.map((c, i) => {
    const a1 = start0 + i * slice;
    const a2 = start0 + (i + 1) * slice;
    const x1 = cx + rx * Math.cos(a1), y1 = cy + ry * Math.sin(a1);
    const x2 = cx + rx * Math.cos(a2), y2 = cy + ry * Math.sin(a2);
    const large = (a2 - a1) > Math.PI ? 1 : 0;
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${rx} ${ry} 0 ${large} 1 ${x2} ${y2} Z" fill="${c}"/>`;
  }).join('');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="clip">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#clip)">${paths}</g>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${borderColor}" stroke-width="${borderWidth}"/>
  <text x="${cx}" y="${cy + 6}" font-family="Arial, sans-serif" font-size="18"
        fill="${fontColor}" text-anchor="middle">${escapeXml(label || '')}</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function makeSolidEllipseDataUrl({
  label, fill = '#BED7ED', fontColor = '#000000', width = 180, height = 80, borderColor = '#333333', borderWidth = 2
}) {
  const rx = Math.max(10, Math.round((width  - borderWidth * 2) / 2));
  const ry = Math.max(10, Math.round((height - borderWidth * 2) / 2));
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${borderColor}" stroke-width="${borderWidth}"/>
  <text x="${cx}" y="${cy + 6}" font-family="Arial, sans-serif" font-size="18"
        fill="${fontColor}" text-anchor="middle">${escapeXml(label || '')}</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
