import React, { useState } from 'react';
import './Stack.css';

export interface StackProps {
  cards: React.ReactNode[];
  randomRotation?: boolean;
  sensitivity?: number;
  sendToBackOnClick?: boolean;
  resetOnMouseLeave?: boolean;
  swapOnHover?: boolean;
  onCardChange?: (topIndex: number) => void;
  cardDimensions?: { width?: string | number; height?: string | number };
  className?: string;
  style?: React.CSSProperties;
}

export const Stack: React.FC<StackProps> = ({
  cards,
  randomRotation = true,
  sensitivity: _sensitivity = 180,
  sendToBackOnClick = true,
  resetOnMouseLeave = true,
  swapOnHover = true,
  onCardChange,
  cardDimensions,
  className = '',
  style
}) => {
  const [stackOrder, setStackOrder] = useState<number[]>(cards.map((_, i) => i));
  const [isAnimating, setIsAnimating] = useState(false);

  const sendToBack = () => {
    if (isAnimating || stackOrder.length <= 1) return;
    setIsAnimating(true);
    setStackOrder(prev => {
      const newStack = [...prev];
      const top = newStack.shift();
      if (top !== undefined) {
        newStack.push(top);
      }
      if (onCardChange) {
        onCardChange(newStack[0]);
      }
      return newStack;
    });
    setTimeout(() => {
      setIsAnimating(false);
    }, 450);
  };

  const handleMouseEnter = () => {
    if (swapOnHover && cards.length > 1 && stackOrder[0] !== 1) {
      setStackOrder([1, 0]);
      if (onCardChange) {
        onCardChange(1);
      }
    }
  };

  const handleMouseLeave = () => {
    if ((resetOnMouseLeave || swapOnHover) && cards.length > 1 && stackOrder[0] !== 0) {
      setStackOrder([0, 1]);
      if (onCardChange) {
        onCardChange(0);
      }
    }
  };

  return (
    <div
      className={`stack-container ${className}`.trim()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '420px',
        userSelect: 'none',
        ...style
      }}
    >
      {stackOrder.map((cardIndex, position) => {
        const isTop = position === 0;
        const rot = randomRotation ? (cardIndex % 2 === 0 ? -2 : 2) : 0;
        const translateY = position * 6;
        const scale = 1 - position * 0.03;

        return (
          <div
            key={cardIndex}
            className="stack-card"
            onClick={() => sendToBackOnClick && isTop && sendToBack()}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              zIndex: stackOrder.length - position,
              transform: `translateY(${translateY}px) scale(${scale}) rotate(${isTop ? 0 : rot}deg)`,
              transition: 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease',
              cursor: isTop ? 'pointer' : 'default',
              ...cardDimensions
            }}
          >
            {cards[cardIndex]}
          </div>
        );
      })}
    </div>
  );
};

export default Stack;
