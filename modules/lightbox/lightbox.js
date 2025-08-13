// modules/lightbox.js

/**
 * Lightbox Plugin for Masonry Layout System
 * 
 * Usage:
 * masonry.use(lightboxPlugin);
 */

import { LIGHTBOX_CONFIG } from './config.js';
import { SLUG_CONFIG } from './config.js';
import { createSlugManager } from './slugs.js';

const DEFAULT_LIGHTBOX_CONFIG = {
  ...LIGHTBOX_CONFIG,
  // Attribute value to mark elements that should not trigger the lightbox when clicked
  ignoreAttribute: 'ignore',
  /**
   * Destroy lightbox plugin
   */
  destroy() {
    console.log('🔆 Lightbox: Destroying plugin...');
    
    // Close if open
    if (this.isOpen) {
      this.close();
    }
    
    // Remove event listeners
    this.masonry.container.removeEventListener('click', this.handleItemClick);
    document.removeEventListener('click', this.handleCloseClick);
    document.removeEventListener('keydown', this.handleEscapeKey);
    
    // Clear references
    this.currentItem = null;
    this.lightboxElement = null;
    this.contentContainer = null;
    
    console.log('✅ Lightbox: Plugin destroyed');
  }
};

class MasonryLightbox {
  constructor(masonryInstance, options = {}) {
    this.masonry = masonryInstance;
    this.config = { ...DEFAULT_LIGHTBOX_CONFIG, ...options };
    
    // Get the attribute prefix from masonry config
    this.attributePrefix = this.masonry.config.autoInitAttribute;
    
    // State
    this.isOpen = false;
    this.currentItem = null;
    this.lightboxElement = null;
    this.contentContainer = null;
    
    // Bound methods for event listeners
    this.handleItemClick = this.handleItemClick.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);
    this.handleEscapeKey = this.handleEscapeKey.bind(this);
    
    // Slug manager for this container
    this.slugManager = createSlugManager(this.masonry.container);

    this.init();
  }

  /**
   * Initialize the lightbox plugin
   */
  init() {
    console.log('🔆 Lightbox: Initializing plugin...');
    
    // Check if lightbox is enabled on the masonry container
    const isEnabled = this.masonry.container.getAttribute(`${this.attributePrefix}-lightbox`) === 'true';
    
    if (!isEnabled) {
      console.log('🔆 Lightbox: Not enabled on this masonry instance');
      return;
    }
    
    // Find lightbox elements using data attributes
    this.lightboxElement = document.querySelector(`[${this.attributePrefix}-lightbox="${this.config.lightboxAttribute}"]`);
    this.contentContainer = document.querySelector(`[${this.attributePrefix}-lightbox="${this.config.contentTargetAttribute}"]`);
    
    if (!this.lightboxElement) {
      console.error('🔆 Lightbox: Lightbox element not found with selector:', `[${this.attributePrefix}-lightbox="${this.config.lightboxAttribute}"]`);
      return;
    }
    
    if (!this.contentContainer) {
      console.error('🔆 Lightbox: Content container not found with selector:', `[${this.attributePrefix}-lightbox="${this.config.contentTargetAttribute}"]`);
      return;
    }
    
    console.log('🔆 Lightbox: Found lightbox elements', {
      lightbox: this.lightboxElement,
      contentContainer: this.contentContainer
    });
    
    this.setupEventListeners();
    this.setupHooks();
    // Connect slug manager with this lightbox so back/forward navigation can
    // open/close appropriate items.
    if (this.slugManager && this.slugManager.isSlugEnabled()) {
      this.slugManager.attachLightbox(this);
    }
    
    console.log('✅ Lightbox: Plugin initialized successfully');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for clicks on masonry items
    this.masonry.container.addEventListener('click', this.handleItemClick);
    
    // Listen for close button clicks
    document.addEventListener('click', this.handleCloseClick);
    
    // Listen for escape key (always enabled)
    document.addEventListener('keydown', this.handleEscapeKey);
  }

  /**
   * Setup masonry hooks
   */
  setupHooks() {
    // Close lightbox when masonry is destroyed
    this.masonry.addHook('beforeDestroy', () => {
      if (this.isOpen) {
        this.close();
      }
    });
    // Cleanup slug manager listener on destroy
    this.masonry.addHook('afterDestroy', () => {
      if (this.slugManager && this.slugManager.isSlugEnabled()) {
        this.slugManager.detachLightbox();
      }
    });
  }

  /**
   * Handle clicks on masonry items
   */
  handleItemClick(event) {
    // Ignore clicks on elements explicitly marked to skip opening the lightbox
    if (event.target.closest(`[${this.attributePrefix}-lightbox="${this.config.ignoreAttribute}"]`)) {
      return;
    }

    // Find the clicked masonry item (direct child of container)
    let clickedItem = event.target;
    
    // Traverse up to find the masonry item (direct child of container)
    while (clickedItem && clickedItem.parentNode !== this.masonry.container) {
      clickedItem = clickedItem.parentNode;
    }
    
    // Check if we found a valid masonry item
    if (!clickedItem || !this.masonry.state.items.includes(clickedItem)) {
      return;
    }
    
    // Check if the click target is a close element
    if (event.target.closest(`[${this.attributePrefix}-lightbox="${this.config.closeAttribute}"]`)) {
      return;
    }
    
    console.log('🔆 Lightbox: Masonry item clicked', clickedItem);
    
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
    
    this.open(clickedItem);
  }

  /**
   * Handle close button clicks
   */
  handleCloseClick(event) {
    if (event.target.closest(`[${this.attributePrefix}-lightbox="${this.config.closeAttribute}"]`)) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }

  /**
   * Handle escape key press
   */
  handleEscapeKey(event) {
    if (event.key === 'Escape' && this.isOpen) {
      event.preventDefault();
      this.close();
    }
  }

  /**
   * Reset scroll position of lightbox and all scrollable descendants
   */
  resetScrollPosition() {
    console.log('🔆 Lightbox: Resetting scroll positions...');
    
    // Reset scroll position of the lightbox element itself
    this.lightboxElement.scrollTop = 0;
    this.lightboxElement.scrollLeft = 0;
    
    // Find all potentially scrollable descendants
    const scrollableElements = this.lightboxElement.querySelectorAll('*');
    
    scrollableElements.forEach(element => {
      const computedStyle = getComputedStyle(element);
      const overflowX = computedStyle.overflowX;
      const overflowY = computedStyle.overflowY;
      
      // Check if element has scrollable overflow
      if (overflowX === 'auto' || overflowX === 'scroll' || 
          overflowY === 'auto' || overflowY === 'scroll') {
        element.scrollTop = 0;
        element.scrollLeft = 0;
      }
    });
    
    console.log('✅ Lightbox: Scroll positions reset');
  }

  /**
   * Open lightbox with specified masonry item
   */
  async open(item) {
    // If already open, switch content without closing to avoid history back/popstate conflicts
    if (this.isOpen) {
      if (this.currentItem === item) {
        return;
      }
      console.log('🔆 Lightbox: Switching to new item while open', item);
      
      // Dispatch before-open for consumers that repopulate based on the new item
      this.dispatchEvent('masonry:lightboxBeforeOpen', {
        item,
        lightbox: this.lightboxElement
      });
      
      // Update current item, replace content
      this.currentItem = item;
      this.clearContent();
      this.cloneItemContent(item);
      
      // Ensure classes remain
      this.lightboxElement.classList.add(this.config.openClass);
      
      // Reset scroll positions
      this.resetScrollPosition();
      
      // Update slug if enabled (push new state for the new item)
      if (this.slugManager && this.slugManager.isSlugEnabled()) {
        this.slugManager.setSlug(item);
      }
      
      // Dispatch open event again for consumers
      this.dispatchEvent('masonry:lightboxOpen', {
        item: this.currentItem,
        lightbox: this.lightboxElement,
        contentContainer: this.contentContainer
      });
      
      console.log('✅ Lightbox: Switched item successfully');
      return;
    }
    
    console.log('🔆 Lightbox: Opening with item', item);
    
    this.currentItem = item;
    this.isOpen = true;
    
    // Dispatch before open event
    this.dispatchEvent('masonry:lightboxBeforeOpen', {
      item: this.currentItem,
      lightbox: this.lightboxElement
    });
    
    // Clone item content
    this.cloneItemContent(item);
    
    // Add classes
    this.lightboxElement.classList.add(this.config.openClass);
    
    console.log('🔆 Lightbox: Added classes', {
      lightboxClasses: this.lightboxElement.className
    });
    
    // Force reflow to ensure display change is processed
    this.lightboxElement.offsetHeight;
    
    // Reset scroll positions after showing
    this.resetScrollPosition();
    
    // Prevent body scrolling
    document.body.classList.add(this.config.bodyOpenClass);
    document.body.style.overflow = 'hidden';
    
    // Set slug if enabled
    if (this.slugManager && this.slugManager.isSlugEnabled()) {
      this.slugManager.setSlug(item);
    }
    
    // Dispatch after open event
    this.dispatchEvent('masonry:lightboxOpen', {
      item: this.currentItem,
      lightbox: this.lightboxElement,
      contentContainer: this.contentContainer
    });
    
    console.log('✅ Lightbox: Opened successfully');
  }

  /**
   * Close lightbox
   */
  async close() {
    if (!this.isOpen) {
      return;
    }
    
    console.log('🔆 Lightbox: Closing...');
    
    // Dispatch before close event
    this.dispatchEvent('masonry:lightboxBeforeClose', {
      item: this.currentItem,
      lightbox: this.lightboxElement
    });
    
    this.isOpen = false;
    
    // Remove classes
    this.lightboxElement.classList.remove(this.config.openClass);
    
    // Restore body scrolling
    document.body.classList.remove(this.config.bodyOpenClass);
    document.body.style.overflow = '';
    
    // Clear content and hide immediately
    this.clearContent();
    
    // Clear slug if enabled
    if (this.slugManager && this.slugManager.isSlugEnabled()) {
      this.slugManager.clearSlug();
    }
    
    // Dispatch after close event
    this.dispatchEvent('masonry:lightboxClose', {
      item: this.currentItem,
      lightbox: this.lightboxElement
    });
    
    this.currentItem = null;
    
    console.log('✅ Lightbox: Closed successfully');
  }

  /**
   * Clone masonry item content into lightbox
   */
  cloneItemContent(item) {
    console.log('🔆 Lightbox: Cloning item content', item);
    
    // Clear existing content
    this.clearContent();
    
    // Clone the entire item
    const clonedItem = item.cloneNode(true);
    
    // Remove any IDs to avoid duplicates
    this.removeIds(clonedItem);
    
    // Reset masonry positioning styles
    this.resetMasonryStyles(clonedItem);
    
    // Add is-in-lightbox class to cloned item
    clonedItem.classList.add(this.config.inLightboxClass);
    
    // Append to content container
    this.contentContainer.appendChild(clonedItem);
    
    console.log('✅ Lightbox: Content cloned successfully');
  }

  /**
   * Reset masonry positioning styles on cloned element
   */
  resetMasonryStyles(element) {
    // Reset the positioning styles applied by masonry
    element.style.position = '';
    element.style.left = '';
    element.style.top = '';
    element.style.width = '';
    element.style.height = '';
    
    // Remove masonry classes that might affect styling
    element.classList.remove('masonry_item-positioned');
    
    console.log('🔆 Lightbox: Reset masonry styles on cloned element');
  }

  /**
   * Clear lightbox content
   */
  clearContent() {
    while (this.contentContainer.firstChild) {
      this.contentContainer.removeChild(this.contentContainer.firstChild);
    }
  }

  /**
   * Remove IDs from cloned element to avoid duplicates
   */
  removeIds(element) {
    if (element.id) {
      element.removeAttribute('id');
    }
    
    // Remove IDs from all children
    const elementsWithIds = element.querySelectorAll('[id]');
    elementsWithIds.forEach(el => el.removeAttribute('id'));
  }

  /**
   * Dispatch custom events
   */
  dispatchEvent(eventName, detail) {
    this.masonry.container.dispatchEvent(new CustomEvent(eventName, {
      detail: {
        ...detail,
        lightboxInstance: this,
        masonryInstance: this.masonry
      }
    }));
  }

  /**
   * Check if lightbox is currently open
   */
  isLightboxOpen() {
    return this.isOpen;
  }

  /**
   * Get current lightbox item
   */
  getCurrentItem() {
    return this.currentItem;
  }

  /**
   * Programmatically open lightbox with specific item
   */
  openItem(item) {
    if (this.masonry.state.items.includes(item)) {
      this.open(item);
    } else {
      console.warn('🔆 Lightbox: Item not found in masonry layout', item);
    }
  }
}

/**
 * Lightbox Plugin Factory Function
 */
export function lightboxPlugin(masonryInstance, options = {}) {
  console.log('🔆 Lightbox: Plugin factory called', { masonryInstance, options });
  
  // Create lightbox instance
  const lightbox = new MasonryLightbox(masonryInstance, options);
  
  // Attach to masonry instance for external access
  masonryInstance.lightbox = lightbox;
  
  // Return the lightbox instance for chaining
  return lightbox;
}

// Export the plugin
export { MasonryLightbox, lightboxPlugin as default };

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MasonryLightbox, lightboxPlugin };
}

// AMD compatibility
if (typeof define === 'function' && define.amd) {
  define(() => ({ MasonryLightbox, lightboxPlugin }));
}

// Global export for browser
if (typeof window !== 'undefined') {
  window.MasonryLightboxPlugin = lightboxPlugin;
}