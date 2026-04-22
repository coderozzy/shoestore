/**
 * Leather-toned diagonal stripe placeholder used wherever a real product
 * photo is missing. The pattern's two stripe colors are derived from the
 * product's color label so that, for example, "Cognac" renders as warm
 * tan and "Burgundy" renders as deep wine. Used by Steps storefront in
 * place of generic emoji or grey blocks.
 */
const LEATHER = {
    Cognac:        ['#c89060', '#b07848'],
    'Dark Brown':  ['#5a3e2a', '#4a3020'],
    Brown:         ['#6a4528', '#52351e'],
    Black:         ['#4a4845', '#363432'],
    Tan:           ['#d4b47a', '#c49a60'],
    Burgundy:      ['#7a2840', '#5e1e30'],
    Sand:          ['#d8c8a0', '#c8b880'],
    Beige:         ['#d8c8a0', '#c8b880'],
    Grey:          ['#8a8580', '#6e6964'],
    Gray:          ['#8a8580', '#6e6964'],
    White:         ['#e8e2d6', '#d6cebe'],
    Navy:          ['#2a3850', '#1e2a40'],
    Blue:          ['#3c5a82', '#2c4868'],
    Red:           ['#9a2a2e', '#7a1e22'],
    Green:         ['#3e5a3a', '#2e4628']
};

/**
 * @param {string} color  product color label (best-effort lookup)
 * @param {string|number} id used to scope the SVG <pattern id> so multiple
 *   instances on a page don't collide
 */
export default function LeatherSwatch({ color, id }) {
    const [c1, c2] = LEATHER[color] || ['#c8a880', '#b89060'];
    const patternId = `lp${id ?? color ?? 'x'}`;
    return (
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern
                    id={patternId}
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(38)"
                >
                    <rect width="20" height="40" fill={c1} />
                    <rect x="20" width="20" height="40" fill={c2} />
                </pattern>
            </defs>
            <rect width="400" height="400" fill={`url(#${patternId})`} />
            <text
                x="200"
                y="206"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="monospace"
                fontSize="10"
                fill="rgba(255,255,255,0.28)"
            >
                product shot
            </text>
        </svg>
    );
}
