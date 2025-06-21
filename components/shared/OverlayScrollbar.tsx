
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface OverlayScrollbarProps {
  scrollableRef: React.RefObject<HTMLElement>;
  orientation?: 'horizontal' | 'vertical';
}

const HIDE_DELAY = 500; // Increased hide delay
const MIN_THUMB_SIZE = 20; 
const SCROLLBAR_TRACK_DIMENSION = '4px'; 
const SCROLLBAR_THUMB_DIMENSION = '4px'; 

// Define RGBA colors for semi-transparency
const TRACK_COLOR_VISIBLE = 'rgba(39, 39, 42, 0.3)'; // zinc-800 at 30% opacity (was 0.0)
const THUMB_COLOR_NORMAL = 'rgba(82, 82, 91, 0.6)';  // zinc-600 at 60% opacity
const THUMB_COLOR_HOVER = 'rgba(113, 113, 122, 0.7)'; // zinc-500 at 70% opacity
const THUMB_COLOR_DRAGGING = 'rgba(113, 113, 122, 0.8)';// zinc-500 at 80% opacity

export const OverlayScrollbar: React.FC<OverlayScrollbarProps> = ({
  scrollableRef,
  orientation = 'horizontal',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [thumbSize, setThumbSize] = useState(0);
  const [thumbOffset, setThumbOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isThumbHovered, setIsThumbHovered] = useState(false);

  const hideTimeoutRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ mousePos: number; initialScroll: number } | null>(null);

  const updateScrollbar = useCallback(() => {
    const element = scrollableRef.current;
    if (!element) return;

    const scrollDim = orientation === 'horizontal' ? element.scrollWidth : element.scrollHeight;
    const clientDim = orientation === 'horizontal' ? element.clientWidth : element.clientHeight;
    const scrollPos = orientation === 'horizontal' ? element.scrollLeft : element.scrollTop;

    if (scrollDim <= clientDim) {
      setThumbSize(0); 
      if (isVisible) setIsVisible(false); 
      return;
    }

    const newThumbSize = Math.max(MIN_THUMB_SIZE, (clientDim / scrollDim) * clientDim);
    const maxThumbOffset = clientDim - newThumbSize; 
    const scrollableContentRange = scrollDim - clientDim;

    let newCalculatedThumbOffset = 0;
    if (scrollableContentRange > 0) {
        // Standard behavior: thumb moves in the same direction as scroll
        newCalculatedThumbOffset = (scrollPos / scrollableContentRange) * maxThumbOffset;
    }

    setThumbSize(newThumbSize);
    setThumbOffset(Math.min(maxThumbOffset, Math.max(0, newCalculatedThumbOffset)));
  }, [scrollableRef, orientation, isVisible]);

  const showScrollbar = useCallback(() => {
    const element = scrollableRef.current;
    if (!element) return;
    const isActuallyScrollable = orientation === 'horizontal' 
        ? element.scrollWidth > element.clientWidth
        : element.scrollHeight > element.clientHeight;

    if (!isActuallyScrollable) {
        if(isVisible) setIsVisible(false);
        setThumbSize(0);
        return;
    }
    
    updateScrollbar();
    setIsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  }, [updateScrollbar, orientation, scrollableRef, isVisible]);

  const hideScrollbar = useCallback(() => {
    if (isDragging || isThumbHovered) return; 
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, HIDE_DELAY);
  }, [isDragging, isThumbHovered]);

  useEffect(() => {
    const element = scrollableRef.current;
    if (!element) return;

    updateScrollbar();

    const handleWheelScroll = (event: WheelEvent) => {
      if (orientation === 'horizontal' && element) {
        // If vertical scroll wheel is used and there's horizontal overflow, scroll horizontally
        if (event.deltaY !== 0 && event.deltaX === 0) {
          if (element.scrollWidth > element.clientWidth) {
            // No preventDefault needed if this is on the scrollable element itself,
            // but if this listener were on a parent, preventDefault would stop native vertical scroll.
            // For an overlay scrollbar, this logic usually sits with the component that *owns* the scrollableRef.
            // However, making the scrollbar itself handle this for its specific ref can be a feature.
            // element.scrollLeft += event.deltaY; // This was likely the problematic line for some contexts.
                                              // It's better if the parent component manages its scroll behavior.
                                              // The scrollbar should just react to 'scroll' events.
          }
        }
      }
    };

    // The wheel event listener on `element` should primarily be handled by the parent component
    // that owns `scrollableRef` if specific scroll translations (like vertical wheel to horizontal scroll) are needed.
    // The scrollbar itself primarily reacts to `scroll` events on `element`.
    // element.addEventListener('wheel', handleWheelScroll, { passive: false }); 
    
    element.addEventListener('scroll', showScrollbar, { passive: true });
    element.addEventListener('mouseenter', showScrollbar);
    element.addEventListener('mouseleave', hideScrollbar);

    const resizeObserver = new ResizeObserver(() => {
      updateScrollbar();
      const isHorizontallyScrollable = element.scrollWidth > element.clientWidth && orientation === 'horizontal';
      const isVerticallyScrollable = element.scrollHeight > element.clientHeight && orientation === 'vertical';
      if ((orientation === 'horizontal' && !isHorizontallyScrollable) ||
          (orientation === 'vertical' && !isVerticallyScrollable)) {
        if (isVisible) setIsVisible(false);
        setThumbSize(0);
      } else {
         if (element.matches(':hover')) {
            showScrollbar();
         }
      }
    });
    resizeObserver.observe(element);

    // Observe children for size changes too, as this can affect scroll dimensions
    // This is a basic way; MutationObserver might be more robust for dynamic content.
    const childrenArray = Array.from(element.children);
    childrenArray.forEach(child => resizeObserver.observe(child));


    return () => {
      // element.removeEventListener('wheel', handleWheelScroll);
      element.removeEventListener('scroll', showScrollbar);
      element.removeEventListener('mouseenter', showScrollbar);
      element.removeEventListener('mouseleave', hideScrollbar);
      resizeObserver.disconnect();
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [scrollableRef, orientation, showScrollbar, hideScrollbar, updateScrollbar, isVisible]);

  const handleThumbMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault(); // Prevent text selection during drag

    const element = scrollableRef.current;
    if (!element) return;

    setIsDragging(true);
    const mousePos = orientation === 'horizontal' ? event.clientX : event.clientY;
    const initialScroll = orientation === 'horizontal' ? element.scrollLeft : element.scrollTop;
    dragStartRef.current = { mousePos, initialScroll };

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  }, [scrollableRef, orientation]);

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!isDragging || !dragStartRef.current || !scrollableRef.current) return;

      const element = scrollableRef.current;
      const { mousePos: startMousePos, initialScroll } = dragStartRef.current;

      const currentMousePos = orientation === 'horizontal' ? event.clientX : event.clientY;
      const mouseDelta = currentMousePos - startMousePos;

      const scrollDim = orientation === 'horizontal' ? element.scrollWidth : element.scrollHeight;
      const clientDim = orientation === 'horizontal' ? element.clientWidth : element.clientHeight;
      
      // Ensure thumbSize is current for this calculation, could also use a ref for thumbSize if it causes issues.
      const currentThumbSize = Math.max(MIN_THUMB_SIZE, (clientDim / scrollDim) * clientDim);


      if (clientDim <= 0 || scrollDim <= clientDim || currentThumbSize <= 0) return;

      const scrollableRange = scrollDim - clientDim;
      // The range the thumb can actually move within the track
      const trackMouseRange = clientDim - currentThumbSize; 
      
      let scrollDelta = 0;
      if (trackMouseRange > 0) { 
          // Standard: thumb movement proportional to content movement
          scrollDelta = (mouseDelta / trackMouseRange) * scrollableRange;
      } else if (scrollableRange > 0) { 
          scrollDelta = mouseDelta > 0 ? scrollableRange : -scrollableRange;
      }

      if (orientation === 'horizontal') {
        element.scrollLeft = initialScroll + scrollDelta;
      } else {
        element.scrollTop = initialScroll + scrollDelta;
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dragStartRef.current = null;
        if (scrollableRef.current && !scrollableRef.current.matches(':hover') && !isThumbHovered) {
            hideScrollbar();
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, scrollableRef, orientation, hideScrollbar, thumbSize, isThumbHovered]); // Added thumbSize here

  if (thumbSize === 0 && !isDragging) { // Only hide if not actively dragging, even if thumb becomes 0 size momentarily
      return null;
  }

  const scrollbarStyle: React.CSSProperties = {
    position: 'absolute',
    opacity: isVisible || isDragging || isThumbHovered ? 1 : 0,
    transition: 'opacity 0.2s ease-in-out',
    zIndex: 52, 
    borderRadius: '0px', // Consistent with thumb for a flat look
    userSelect: 'none',
    backgroundColor: (isVisible || isDragging || isThumbHovered) ? TRACK_COLOR_VISIBLE : 'transparent',
  };

  let currentThumbBgColor = THUMB_COLOR_NORMAL;
  if (isDragging) {
    currentThumbBgColor = THUMB_COLOR_DRAGGING;
  } else if (isThumbHovered) {
    currentThumbBgColor = THUMB_COLOR_HOVER;
  }

  const thumbStyle: React.CSSProperties = {
    position: 'relative', 
    backgroundColor: currentThumbBgColor,
    borderRadius: '0px', // Consistent with track for a flat look
    cursor: 'pointer',
  };

  if (orientation === 'horizontal') {
    scrollbarStyle.bottom = '0px';
    scrollbarStyle.left = '0';
    scrollbarStyle.width = '100%';
    scrollbarStyle.height = SCROLLBAR_TRACK_DIMENSION; 

    thumbStyle.height = SCROLLBAR_THUMB_DIMENSION; 
    thumbStyle.width = `${thumbSize}px`;
    thumbStyle.transform = `translateX(${thumbOffset}px)`;
  } else {
    scrollbarStyle.right = '0px';
    scrollbarStyle.top = '0';
    scrollbarStyle.height = '100%';
    scrollbarStyle.width = SCROLLBAR_TRACK_DIMENSION; 

    thumbStyle.width = SCROLLBAR_THUMB_DIMENSION; 
    thumbStyle.height = `${thumbSize}px`;
    thumbStyle.transform = `translateY(${thumbOffset}px)`;
  }
  
  return (
    <div style={scrollbarStyle}
         onMouseEnter={() => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            showScrollbar();
         }} 
         onMouseLeave={hideScrollbar}
    >
      <div
        style={thumbStyle}
        onMouseDown={handleThumbMouseDown}
        onMouseEnter={() => {
          setIsThumbHovered(true);
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
          if (!isVisible) showScrollbar(); // Ensure scrollbar becomes visible if mouse enters thumb directly
        }}
        onMouseLeave={() => {
          setIsThumbHovered(false);
          if (!isDragging) hideScrollbar(); 
        }}
      />
    </div>
  );
};

