
import React from 'react';

export interface ToolCircleIconProps extends React.SVGProps<SVGSVGElement> {
  iconTitle?: string; // Renamed from 'title'. This prop is for the SVG <title> element for accessibility.
}

// Changed from React.FC<ToolCircleIconProps> to a direct function type
export const ToolCircleIcon = ({ iconTitle, ...restProps }: ToolCircleIconProps): JSX.Element => {
  // Generate a unique ID for the title element if an ID isn't already passed for the SVG
  // This is needed for aria-labelledby
  const titleId = iconTitle && (restProps.id ? `${restProps.id}-title` : `tool-circle-icon-title-${Math.random().toString(36).substring(2,7)}`);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      role={iconTitle ? "img" : undefined} // Assign role="img" if iconTitle is present
      aria-labelledby={iconTitle && titleId ? titleId : undefined} // Link SVG to its title
      aria-hidden={iconTitle ? undefined : "true"} // Hide if purely decorative (no iconTitle)
      {...restProps} // Spread the remaining SVG props
    >
      {/* Render the SVG <title> element if the iconTitle prop is provided */}
      {iconTitle && <title id={titleId}>{iconTitle}</title>}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9 9 0 100-18 9 9 0 000 18z"
      />
    </svg>
  );
};
