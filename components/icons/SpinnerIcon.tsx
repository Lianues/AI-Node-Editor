
import React from 'react';

export const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2} // Slightly thicker for visibility at small sizes
    stroke="currentColor"
    aria-hidden="true"
    {...props}
    className={`animate-spin ${props.className || ''}`} // Ensure animate-spin is applied
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v3m0 12v3m9-9h-3M6 9H3m16.59-4.41L15 9M9 15l-4.59 4.59M16.59 16.59L15 15M9 9l-4.59-4.59"
    />
  </svg>
);
