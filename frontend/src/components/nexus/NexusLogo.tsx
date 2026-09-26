import React from 'react';

interface NexusLogoProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
  color?: string;
}

export const NexusLogo: React.FC<NexusLogoProps> = ({
  className = '',
  style,
  size = 24,
  color = 'currentColor'
}) => {
  return (
    <svg
      width={size * 1.5}
      height={size}
      viewBox="0 0 300 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      {/* Left small rounded triangle */}
      <path
        d="M 68 53 L 23 68 C 21 69 20 72 21 74 L 43 110 C 44 112 47 113 49 111 L 70 80 C 72 77 71 74 68 73 Z"
        fill={color}
      />

      {/* Main middle V-envelope polygon */}
      <path
        d="M 77 56 L 52 92 C 51 94 51 96 52 98 L 160 206 C 163 209 167 209 170 206 L 255 24 C 257 21 255 17 251 17 L 83 52 C 80 53 78 54 77 56 Z"
        fill={color}
      />

      {/* Right triangle wing */}
      <path
        d="M 270 20 L 175 195 C 174 198 177 201 180 200 L 274 148 C 277 146 279 143 279 140 L 279 24 C 279 21 275 19 270 20 Z"
        fill={color}
      />
    </svg>
  );
};

export const NexusLogoImage: React.FC<{ height?: number | string; style?: React.CSSProperties; className?: string }> = ({
  height = 24,
  style,
  className
}) => {
  return (
    <img
      src="/nexus_logo.png"
      alt="NEXUS"
      className={className}
      style={{
        height,
        width: 'auto',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        mixBlendMode: 'multiply',
        ...style
      }}
    />
  );
};
