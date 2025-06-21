
import React from 'react';
import { NodeTypeDefinition } from '../../../types'; // Added NodeTypeDefinition

interface NodeHeaderContentProps {
  mainTitle: string;
  subTitle: string;
  displaySubtitle: boolean;
  themeClasses: {
    textHeader: string;
    textSubtitle: string;
  };
  shortContextId?: string | null;
  contextIdColorClass?: string;
  customMainTitleColor?: string | null; // New prop
  customSubtitleColor?: string | null; // New prop
  nodeDefinition?: NodeTypeDefinition | null; // New prop to determine subtitle display status in inspector
}

const isValidHexColor = (color: string | null | undefined): color is string => 
  typeof color === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(color);


export const NodeHeaderContent: React.FC<NodeHeaderContentProps> = ({
  mainTitle,
  subTitle,
  displaySubtitle,
  themeClasses,
  shortContextId,
  contextIdColorClass,
  customMainTitleColor, // Destructure new prop
  customSubtitleColor,  // Destructure new prop
  // nodeDefinition is not directly used for rendering logic here but passed for potential future use or consistency
}) => {
  const mainTitleStyle: React.CSSProperties = {};
  if (isValidHexColor(customMainTitleColor)) {
    mainTitleStyle.color = customMainTitleColor;
  }

  const subTitleStyle: React.CSSProperties = {};
  if (isValidHexColor(customSubtitleColor)) {
    subTitleStyle.color = customSubtitleColor;
  }

  return (
    <>
      <div className="flex items-baseline w-full min-w-0">
        <h3
          className={`text-sm font-semibold ${!customMainTitleColor ? themeClasses.textHeader : ''} truncate select-none flex-grow min-w-0`}
          style={mainTitleStyle}
          title={mainTitle}
        >
          {mainTitle}
        </h3>
        {shortContextId && (
          <span
            className={`text-xs ml-1.5 ${contextIdColorClass || 'text-zinc-400'} select-none flex-shrink-0`}
            title={`Executing context: ...${shortContextId}`}
          >
            Ctx:{shortContextId}
          </span>
        )}
      </div>
      {displaySubtitle && (
        <p
          className={`text-xs italic ${!customSubtitleColor ? themeClasses.textSubtitle : ''} truncate select-none leading-tight -mt-0.5`}
          style={subTitleStyle}
          title={subTitle}
        >
          {subTitle}
        </p>
      )}
    </>
  );
};
