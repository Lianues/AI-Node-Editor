
import React from 'react';

export interface DiamondIconProps extends React.SVGProps<SVGSVGElement> {
  iconTitle?: string; // Optional title for accessibility
}

export const DiamondIcon = ({ iconTitle, ...restProps }: DiamondIconProps): JSX.Element => {
  const titleId = iconTitle && (restProps.id ? `${restProps.id}-title` : `diamond-icon-title-${Math.random().toString(36).substring(2,7)}`);
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      role={iconTitle ? "img" : undefined}
      aria-labelledby={iconTitle && titleId ? titleId : undefined}
      aria-hidden={iconTitle ? undefined : "true"}
      {...restProps}
    >
      {iconTitle && <title id={titleId}>{iconTitle}</title>}
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345h5.518a.562.562 0 0 1 .351.956l-4.096 2.985a.562.562 0 0 0-.182.557l1.54 5.348a.562.562 0 0 1-.812.622l-4.424-3.228a.563.563 0 0 0-.652 0L6.718 19.34a.562.562 0 0 1-.812-.622l1.54-5.348a.562.562 0 0 0-.182-.557l-4.096-2.985a.562.562 0 0 1 .351-.956h5.518a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
};
