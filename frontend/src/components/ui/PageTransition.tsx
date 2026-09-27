import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'fadeIn' | 'visible'>('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeIn');
      setDisplayLocation(location);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location, displayLocation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTransitionStage('visible');
    }, 50);
    return () => clearTimeout(timer);
  }, [displayLocation]);

  // When transition reaches 'visible', clear transform and will-change
  // so descendant position:fixed elements attach directly to browser window viewport
  const isVisible = transitionStage === 'visible';

  return (
    <div
      key={displayLocation.pathname}
      className={`nexus-page-transition-container ${transitionStage}`}
      style={{
        width: '100%',
        minHeight: '100%',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translate3d(0, 10px, 0)',
        transition: 'opacity 380ms cubic-bezier(0.16, 1, 0.3, 1), transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: isVisible ? 'auto' : 'opacity, transform'
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
