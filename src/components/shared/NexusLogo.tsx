import React from 'react';

interface NexusLogoProps {
  className?: string;
  size?: number | string;
  color?: string;
}

export default function NexusLogo({
  className = 'w-6 h-6',
  size,
  color = 'currentColor',
}: NexusLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Top Left Shape */}
      <polygon points="2,16 23,14 8,47" fill={color} />
      {/* Bottom Left Shape */}
      <polygon points="26,29 8,63 40,72" fill={color} />
      {/* Top Center Inverted Triangle */}
      <polygon points="29,13 79,9 44,57" fill={color} />
      {/* Right Main Triangle */}
      <polygon points="46,73 85,21 95,83" fill={color} />
    </svg>
  );
}
