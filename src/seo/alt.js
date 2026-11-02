// alt.js — Intelligent, descriptive Alt text generator for jewellery assets
// Converts cryptic Drive filenames & SKU codes into readable, indexable descriptions.

export function categorizeJewelry(itemOrName) {
  const name = (
    typeof itemOrName === 'string'
      ? itemOrName
      : itemOrName?.name || itemOrName?.src || itemOrName?.alt || ''
  ).toUpperCase();

  if (/(^BR|_BR_| BR |BRACELET|BANGLE|FIGARO)/.test(name)) return 'bracelet';
  if (/(^PD|_PD_| PD |PENDANT|NECKLACE|\d+P-|NB-)/.test(name)) return 'necklace';
  if (/(^RG|_RG_| RG |RING|\d+R-|SOLITAIRE|BAND)/.test(name)) return 'ring';
  if (/(EAR|_ER_|EARRING|DROP)/.test(name)) return 'earring';
  return 'jewellery piece';
}

function detectMetal(nameUpper) {
  if (/(18Y|14Y|-Y-|_YG|YG|YELLOW GOLD)/.test(nameUpper)) return 'in yellow gold';
  if (/(18W|14W|-W-|_WG|WG|WHITE GOLD|PLATINUM)/.test(nameUpper)) return 'in white gold';
  if (/(18R|14R|-R-|_RG|ROSE GOLD|CPG)/.test(nameUpper)) return 'in rose gold';
  return '';
}

function detectCut(nameUpper) {
  if (/MARQUISE/.test(nameUpper)) return 'marquise cut';
  if (/EMERALD/.test(nameUpper)) return 'emerald cut';
  if (/CUSHION/.test(nameUpper)) return 'cushion cut';
  if (/OVAL/.test(nameUpper)) return 'oval cut';
  if (/ROUND|RD-/.test(nameUpper)) return 'round brilliant cut';
  if (/PEAR/.test(nameUpper)) return 'pear cut';
  if (/SOLITAIRE/.test(nameUpper)) return 'solitaire';
  if (/HALO/.test(nameUpper)) return 'halo';
  if (/TENNIS/.test(nameUpper)) return 'diamond tennis';
  return '';
}

function detectAngle(nameUpper) {
  if (/ANGLE[-_ ]*1|FRONT/.test(nameUpper)) return 'front view';
  if (/ANGLE[-_ ]*2|SIDE|PROFILE/.test(nameUpper)) return 'side profile view';
  if (/ANGLE[-_ ]*3|PERSPECTIVE|ANGLE/.test(nameUpper)) return 'perspective angle view';
  if (/ANGLE[-_ ]*4|DETAIL|MACRO|CROWN/.test(nameUpper)) return 'macro detail view';
  return '';
}

export function cleanJewelryAlt(item, context = '') {
  if (!item) return 'Jewellery 3D render — Cinegem Studio';

  const rawName = (item.name || item.src || item.filename || '').trim();
  const existingAlt = (item.alt || '').trim();

  // If already clean and descriptive (not raw code or generic default), keep it
  if (
    existingAlt &&
    !/^on-body visualization$/i.test(existingAlt) &&
    !/^(front|side|angle|macro|detail) view$/i.test(existingAlt) &&
    !/[A-Z0-9]{8,}/.test(existingAlt) &&
    !existingAlt.endsWith('.png') &&
    !existingAlt.endsWith('.jpg')
  ) {
    return existingAlt;
  }

  const nameUpper = (rawName || existingAlt).toUpperCase();

  // Build descriptive text from components
  const category = categorizeJewelry(nameUpper);
  const cut = detectCut(nameUpper);
  const metal = detectMetal(nameUpper);
  const angle = detectAngle(nameUpper);

  const parts = [];
  if (cut) parts.push(cut);
  parts.push(category);
  if (metal) parts.push(metal);
  if (angle) parts.push(`(${angle})`);

  if (context) {
    parts.push(`— ${context}`);
  }

  parts.push('3D render');

  const generated = parts.join(' ').replace(/\s+/g, ' ').trim();

  // Capitalize first letter
  const formatted = generated.charAt(0).toUpperCase() + generated.slice(1);

  // If it ended up too bare, use studio brand fallback
  if (formatted === 'Jewellery piece 3D render' || formatted === '3D render') {
    return 'Fine jewellery 3D render — Cinegem Studio';
  }

  return `${formatted} — Cinegem Studio`;
}
