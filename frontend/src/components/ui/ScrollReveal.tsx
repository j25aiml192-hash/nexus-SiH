import React, { useEffect, useRef, useState } from 'react';

export interface ScrollRevealProps {
  children: React.ReactNode;
  variant?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale';
  delay?: number; // Delay in ms
  duration?: number; // Duration in ms
  threshold?: number; // Intersection ratio threshold
  distance?: number; // Translate distance in px
  className?: string;
  style?: React.CSSProperties;
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  variant = 'slide-up',
  delay = 0,
  duration = 750,
  threshold = 0.15,
  distance = 32,
  className = '',
  style = {},
  once = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [threshold, once]);

  // Compute initial transform based on variant
  const getInitialTransform = () => {
    switch (variant) {
      case 'slide-up':
        return `translate3d(0, ${distance}px, 0)`;
      case 'slide-down':
        return `translate3d(0, -${distance}px, 0)`;
      case 'slide-left':
        return `translate3d(${distance}px, 0, 0)`;
      case 'slide-right':
        return `translate3d(-${distance}px, 0, 0)`;
      case 'scale':
        return 'scale(0.94) translate3d(0, 16px, 0)';
      case 'fade':
      default:
        return 'translate3d(0, 0, 0)';
    }
  };

  const initialTransform = getInitialTransform();
  const visibleTransform = 'translate3d(0, 0, 0) scale(1)';

  return (
    <div
      ref={elementRef}
      className={`nexus-scroll-reveal ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? visibleTransform : initialTransform,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
        ...style
      }}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;
