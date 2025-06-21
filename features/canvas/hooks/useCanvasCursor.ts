
import { vscodeDarkTheme } from '../../../theme/vscodeDark';

interface UseCanvasCursorProps {
  connectionCursorStyle: string | null;
  nodeTypeToPlace: string | null;
  draggingNodeId: string | null;
  isPanning: boolean;
  lastClickWasDrag: boolean; 
  isMarqueeSelectActive: boolean; 
  isDefiningAreaActive: boolean; // New prop
}

export const useCanvasCursor = ({
  connectionCursorStyle,
  nodeTypeToPlace,
  draggingNodeId,
  isPanning,
  lastClickWasDrag,
  isMarqueeSelectActive, 
  isDefiningAreaActive, // Destructure new prop
}: UseCanvasCursorProps): string => {
  if (connectionCursorStyle) {
    return connectionCursorStyle;
  }
  if (isDefiningAreaActive) { // Higher precedence for defining area
    return 'crosshair';
  }
  if (isMarqueeSelectActive) { 
    return 'crosshair';
  }
  if (nodeTypeToPlace) {
    return 'crosshair';
  }
  if (draggingNodeId) {
    return vscodeDarkTheme.nodes.common.draggingCursor;
  }
  if (isPanning) {
    if (lastClickWasDrag) {
        return 'grabbing';
    }
    return vscodeDarkTheme.nodes.common.defaultCursor;
  }
  return vscodeDarkTheme.nodes.common.defaultCursor;
};
