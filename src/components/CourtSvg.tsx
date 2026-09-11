import React from 'react';
import { Position, POSITION_COORDS } from '../interfaces';

export interface CourtDot {
    position: Position;
    color?: string;
    label?: string;
}

interface CourtSvgProps {
    width: number;
    dots?: CourtDot[];
}

// viewBox is always 200×160. width controls rendered size; height scales proportionally.
const CourtSvg: React.FC<CourtSvgProps> = ({ width, dots = [] }) => {
    const height = Math.round(width * 0.8); // 160/200 = 0.8

    // Convert POSITION_COORDS percentages to SVG units (viewBox 200×160)
    const toSvg = (pct: { x: number; y: number }) => ({
        cx: (pct.x / 100) * 200,
        cy: (pct.y / 100) * 160,
    });

    const isLarge = width > 100;
    const dotR = isLarge ? 7 : 4;
    const labelFontSize = isLarge ? 9 : 0; // hide labels in mini mode

    return (
        <svg width={width} height={height} viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
            {/* Court surface */}
            <rect x="2" y="2" width="196" height="156" rx="2" fill="#f5d76e" stroke="#8B4513" strokeWidth="2" />

            {/* Paint / Key rectangle */}
            <rect x="76" y="2" width="48" height="56" fill="#e8c86a" stroke="#8B4513" strokeWidth="1.5" />

            {/* Backboard */}
            <line x1="88" y1="7" x2="112" y2="7" stroke="#333" strokeWidth="3" />

            {/* Basket (hoop) */}
            <circle cx="100" cy="16" r="5" fill="none" stroke="#e84c00" strokeWidth="2" />

            {/* Free throw line */}
            <line x1="76" y1="58" x2="124" y2="58" stroke="#8B4513" strokeWidth="1.5" />

            {/* Free throw circle (upper half) */}
            <path d="M 76 58 A 24 24 0 0 1 124 58" fill="none" stroke="#8B4513" strokeWidth="1.5" />

            {/* Three-point arc */}
            <path d="M 16 158 A 92 92 0 0 1 184 158" fill="none" stroke="#8B4513" strokeWidth="1.5" />

            {/* Corner three-point lines */}
            <line x1="16" y1="110" x2="16" y2="158" stroke="#8B4513" strokeWidth="1.5" />
            <line x1="184" y1="110" x2="184" y2="158" stroke="#8B4513" strokeWidth="1.5" />

            {/* Position dots */}
            {dots.map(({ position, color = '#e84c00', label }) => {
                const { cx, cy } = toSvg(POSITION_COORDS[position]);
                return (
                    <g key={position}>
                        <circle cx={cx} cy={cy} r={dotR} fill={color} opacity={0.9} />
                        {label && labelFontSize > 0 && (
                            <text
                                x={cx}
                                y={cy + dotR + 8}
                                textAnchor="middle"
                                fontSize={labelFontSize}
                                fill="#333"
                                fontWeight="bold"
                            >
                                {label}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default CourtSvg;
