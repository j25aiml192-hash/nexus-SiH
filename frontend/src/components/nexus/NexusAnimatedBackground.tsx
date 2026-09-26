import React from 'react';

export const NexusAnimatedBackground: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: -1,
        backgroundColor: '#f1f5f9',
        backgroundImage: `
          linear-gradient(to right, rgba(203, 213, 225, 0.45) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(203, 213, 225, 0.45) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px'
      }}
    />
  );
};
