
export const BASE_PORT_SIZE = 5; // Base size unit for ports (e.g., 5px). For diamonds, this is half side-length of the pre-rotation square.

// Diameter of a circle port, which is also the target diagonal for a diamond port.
// For square ports, this can be interpreted as the side length.
export const PORT_VISUAL_DIAMETER = (BASE_PORT_SIZE * 2) * Math.sqrt(2);

// New constant for scaling the diamond's base square side relative to the circle port diameter.
// Based on: "For a circle icon with radius 1, the matching square side length is 0.816 times the diameter".
// If circle diameter is PORT_VISUAL_DIAMETER, then diamond square side is PORT_VISUAL_DIAMETER * 0.816.
export const DIAMOND_SIDE_SCALE_FACTOR = 0.816;

export const HEADER_HEIGHT = 32; // Standard node header height in pixels.

export const PORT_AREA_PADDING_TOP = 10;    // Vertical padding above the first port's visual edge. Increased from 10.
export const PORT_AREA_PADDING_BOTTOM = 10; // Vertical padding below the last port's visual edge. Increased from 10.
export const VERTICAL_GAP_BETWEEN_PORTS = 15; // Clear vertical space between the bounding boxes of adjacent ports. Increased from 8.

// Padding at the bottom of the node's main content area (inside the body).
export const NODE_BODY_CONTENT_PADDING_BOTTOM = 5;

// Height for the title area above custom content within a node.
export const CUSTOM_CONTENT_TITLE_HEIGHT = 20; // Example height, adjust as needed
