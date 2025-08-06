// modules/related-posts.js

/**
 * Related Posts Plugin for Masonry Layout System
 * 
 * Usage:
 * masonry.use(relatedPostsPlugin);
 * 
 * Simple 2-step setup:
 * 1. Add data-masonry-related="true" to main masonry grid
 * 2. Add data-masonry-related="target" to specify clone destination
 */

import { RELATED_POSTS_CONFIG } from './config.js';

const DEFAULT_RELATED_CONFIG = {
  ...RELATED_POSTS_CONFIG
};
  
  class MasonryRelatedPosts {
    constructor(masonryInstance, options = {}) {
      this.masonry = masonryInstance;
      this.config = { ...DEFAULT_RELATED_CONFIG, ...options };
      
      // Get the attribute prefix from masonry config
      this.attributePrefix = this.masonry.config.autoInitAttribute;
      
      // State
      this.isEnabled = false;
      this.sourceContainer = null;
      this.targetContainer = null;
      this.currentItem = null;
      this.clonedMasonryInstance = null;
      this.noResultsElement = null;
      
      // Bound methods for event listeners
      this.handleLightboxOpen = this.handleLightboxOpen.bind(this);
      this.handleLightboxClose = this.handleLightboxClose.bind(this);
      
      this.init();
    }
  
    /**
     * Initialize the related posts plugin
     */
    init() {
      console.log('🔗 Related Posts: Initializing plugin...');
      
      // Check if related posts are enabled on the masonry container
      const isEnabled = this.masonry.container.getAttribute(`${this.attributePrefix}-related`) === this.config.enabledAttribute;
      
      if (!isEnabled) {
        console.log('🔗 Related Posts: Not enabled on this masonry instance');
        return;
      }
      
      this.isEnabled = true;
      
      // Find required elements
      if (!this.findElements()) {
        console.error('🔗 Related Posts: Required elements not found');
        return;
      }
      
      // Setup event listeners
      this.setupEventListeners();
      this.setupHooks();
      
      console.log('✅ Related Posts: Plugin initialized successfully');
    }
  
    /**
     * Find required DOM elements
     */
    findElements() {
      // Find target container
      this.targetContainer = document.querySelector(`[${this.attributePrefix}-related="${this.config.targetAttribute}"]`);
      
      if (!this.targetContainer) {
        console.error('🔗 Related Posts: Target container not found with selector:', `[${this.attributePrefix}-related="${this.config.targetAttribute}"]`);
        return false;
      }
      
      // Find source container (or use current masonry container as default)
      const customSource = this.masonry.container.getAttribute(`${this.attributePrefix}-related-${this.config.sourceAttribute}`);
      
      if (customSource) {
        this.sourceContainer = document.querySelector(`[${this.attributePrefix}="${customSource}"]`);
        if (!this.sourceContainer) {
          console.error('🔗 Related Posts: Custom source container not found:', customSource);
          return false;
        }
      } else {
        this.sourceContainer = this.masonry.container;
      }
      
      // Find no results element if specified
      const noResultsSelector = this.masonry.container.getAttribute(`${this.attributePrefix}-related-${this.config.noResultsAttribute}`);
      if (noResultsSelector) {
        this.noResultsElement = document.querySelector(noResultsSelector);
        this.config.noResultsSelector = noResultsSelector;
      }
      
      console.log('🔗 Related Posts: Found elements', {
        source: this.sourceContainer,
        target: this.targetContainer,
        noResults: this.noResultsElement
      });
      
      return true;
    }
  
    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // Listen for lightbox events on the masonry container
      this.masonry.container.addEventListener('masonry:lightboxOpen', this.handleLightboxOpen);
      this.masonry.container.addEventListener('masonry:lightboxClose', this.handleLightboxClose);
    }
  
    /**
     * Setup masonry hooks
     */
    setupHooks() {
      // Clean up when masonry is destroyed
      this.masonry.addHook('beforeDestroy', () => {
        this.cleanup();
      });
    }
  
    /**
     * Handle lightbox open event
     */
    handleLightboxOpen(event) {
      if (!this.isEnabled) return;
      
      const item = event.detail.item;
      console.log('🔗 Related Posts: Lightbox opened with item', item);
      
      this.currentItem = item;
      this.populateRelatedPosts(item);
    }
  
    /**
     * Handle lightbox close event
     */
    handleLightboxClose(event) {
      if (!this.isEnabled) return;
      
      console.log('🔗 Related Posts: Lightbox closed, cleaning up');
      this.clearRelatedPosts();
      this.currentItem = null;
    }
  
    /**
     * Populate related posts based on current item
     */
    populateRelatedPosts(currentItem) {
      console.log('🔗 Related Posts: Populating related posts for item', currentItem);
      
      // Dispatch before populate event
      this.dispatchEvent('masonry:relatedPostsBeforePopulate', {
        currentItem,
        sourceContainer: this.sourceContainer,
        targetContainer: this.targetContainer
      });
      
      // Get all items from source container
      const allItems = Array.from(this.sourceContainer.children);
      
      // Filter related items
      const relatedItems = this.filterRelatedItems(currentItem, allItems);
      
      // Apply max items limit
      const limitedItems = this.limitItems(relatedItems);
      
      console.log(`🔗 Related Posts: Found ${relatedItems.length} related items, showing ${limitedItems.length}`);
      
      // Clone and populate
      this.cloneItemsToTarget(limitedItems);
      
      // Handle no results
      this.handleNoResults(limitedItems.length === 0);
      
      // Initialize cloned masonry instance
      this.initializeClonedMasonry();
      
      // Dispatch after populate event
      this.dispatchEvent('masonry:relatedPostsAfterPopulate', {
        currentItem,
        relatedItems: limitedItems,
        totalFound: relatedItems.length,
        clonedInstance: this.clonedMasonryInstance
      });
      
      console.log('✅ Related Posts: Population complete');
    }
  
    /**
     * Filter items based on current item's filter attributes
     */
    filterRelatedItems(currentItem, allItems) {
      let candidates = allItems;
      
      // Exclude current item if configured
      const excludeCurrent = this.getExcludeCurrentSetting();
      if (excludeCurrent) {
        candidates = candidates.filter(item => item !== currentItem);
      }
      
      // Get filter attributes from current item
      const filters = this.extractFilters(currentItem);
      
      if (filters.length === 0) {
        console.log('🔗 Related Posts: No filters found, returning all candidates');
        return candidates;
      }
      
      console.log('🔗 Related Posts: Applying filters', filters);
      
      // Filter candidates based on all filters (ALL must match)
      const filtered = candidates.filter(candidate => {
        return filters.every(filter => {
          const candidateValue = candidate.getAttribute(filter.attribute);
          const matches = candidateValue === filter.value;
          
          if (!matches) {
            console.log(`🔗 Related Posts: Item filtered out - ${filter.attribute}: "${candidateValue}" !== "${filter.value}"`);
          }
          
          return matches;
        });
      });
      
      return filtered;
    }
  
    /**
     * Extract filter attributes from current item
     */
    extractFilters(item) {
      const filters = [];
      
      // Check for simple filter attribute
      const simpleFilter = item.getAttribute(`${this.attributePrefix}-related-${this.config.filterAttribute}`);
      if (simpleFilter) {
        filters.push({
          attribute: `${this.attributePrefix}-related-${this.config.filterAttribute}`,
          value: simpleFilter
        });
      }
      
      // Check for prefixed filter attributes (data-masonry-related-filter-*)
      const attributes = Array.from(item.attributes);
      const filterPrefix = `${this.attributePrefix}-related-${this.config.filterPrefixAttribute}`;
      
      attributes.forEach(attr => {
        if (attr.name.startsWith(filterPrefix)) {
          filters.push({
            attribute: attr.name,
            value: attr.value
          });
        }
      });
      
      return filters;
    }
  
    /**
     * Apply max items limit
     */
    limitItems(items) {
      const maxItems = this.getMaxItemsSetting();
      
      if (maxItems && maxItems > 0) {
        return items.slice(0, maxItems);
      }
      
      return items;
    }
  
    /**
     * Get max items setting from container attribute or config
     */
    getMaxItemsSetting() {
      const attributeValue = this.masonry.container.getAttribute(`${this.attributePrefix}-related-${this.config.maxItemsAttribute}`);
      
      if (attributeValue) {
        const parsed = parseInt(attributeValue, 10);
        return isNaN(parsed) ? this.config.maxItems : parsed;
      }
      
      return this.config.maxItems;
    }
  
    /**
     * Get exclude current setting from container attribute or config
     */
    getExcludeCurrentSetting() {
      const attributeValue = this.masonry.container.getAttribute(`${this.attributePrefix}-related-${this.config.excludeCurrentAttribute}`);
      
      if (attributeValue !== null) {
        return attributeValue !== 'false';
      }
      
      return this.config.excludeCurrent;
    }
  
    /**
     * Clone filtered items to target container
     */
    cloneItemsToTarget(items) {
      // Clear existing content first
      this.clearRelatedPosts();
      
      // Add related container class to target container
      this.targetContainer.classList.add(this.config.relatedContainerClass);
      
      items.forEach(item => {
        // Clone the entire item
        const clonedItem = item.cloneNode(true);
        
        // Remove any IDs to avoid duplicates
        this.removeIds(clonedItem);
        
        // Reset any masonry positioning styles
        this.resetMasonryStyles(clonedItem);
        
        // Add related post class
        clonedItem.classList.add(this.config.relatedItemClass);
        
        // Append to target container
        this.targetContainer.appendChild(clonedItem);
      });
    }
  
    /**
     * Initialize cloned masonry instance with inherited attributes
     */
    initializeClonedMasonry() {
      // Copy all masonry-related attributes from source to target
      this.inheritMasonryAttributes();
      
      // Initialize masonry on target container if it has masonry attribute
      const hasMasonryAttribute = this.targetContainer.getAttribute(this.attributePrefix);
      
      if (hasMasonryAttribute && window.MasonryLayout) {
        console.log('🔗 Related Posts: Initializing cloned masonry instance');
        
        try {
          // Small delay to allow DOM to settle
          setTimeout(() => {
            this.clonedMasonryInstance = new window.MasonryLayout(this.targetContainer);
            
            // Initialize any plugins that the original masonry had
            this.inheritPlugins();
            
            console.log('✅ Related Posts: Cloned masonry instance initialized');
          }, 50);
          
        } catch (error) {
          console.error('🔗 Related Posts: Failed to initialize cloned masonry:', error);
        }
      }
    }
  
    /**
     * Inherit masonry attributes from source to target
     */
    inheritMasonryAttributes() {
      const sourceAttributes = Array.from(this.sourceContainer.attributes);
      
      sourceAttributes.forEach(attr => {
        // Copy all attributes that start with the masonry prefix
        if (attr.name.startsWith(this.attributePrefix)) {
          // Skip the related posts attributes to avoid recursion
          if (!attr.name.includes('-related')) {
            this.targetContainer.setAttribute(attr.name, attr.value);
            console.log(`🔗 Related Posts: Inherited attribute ${attr.name}="${attr.value}"`);
          }
        }
      });
    }
  
    /**
     * Inherit plugins from original masonry instance
     */
    inheritPlugins() {
      if (!this.clonedMasonryInstance) return;
      
      // Check if original masonry has lightbox
      if (this.masonry.lightbox && window.MasonryLightboxPlugin) {
        console.log('🔗 Related Posts: Inheriting lightbox plugin');
        
        try {
          // Initialize lightbox on cloned instance
          this.clonedMasonryInstance.use(window.MasonryLightboxPlugin, {
            escapeKey: true,
            backdrop: true,
            animationDuration: 300
          });
        } catch (error) {
          console.warn('🔗 Related Posts: Failed to inherit lightbox plugin:', error);
        }
      }
      
      // Future plugins can be added here
      // Example: infinite scroll, animations, etc.
    }
  
    /**
     * Handle no results scenario
     */
    handleNoResults(hasNoResults) {
      if (this.noResultsElement) {
        if (hasNoResults) {
          this.noResultsElement.classList.add(this.config.noResultsVisibleClass);
          console.log('🔗 Related Posts: No results - showing no results element');
        } else {
          this.noResultsElement.classList.remove(this.config.noResultsVisibleClass);
        }
      }
    }
  
    /**
     * Clear related posts and cleanup
     */
    clearRelatedPosts() {
      // Destroy cloned masonry instance if it exists
      if (this.clonedMasonryInstance) {
        try {
          this.clonedMasonryInstance.destroy();
          console.log('🔗 Related Posts: Destroyed cloned masonry instance');
        } catch (error) {
          console.warn('🔗 Related Posts: Error destroying cloned masonry:', error);
        }
        this.clonedMasonryInstance = null;
      }
      
      // Clear target container content
      while (this.targetContainer.firstChild) {
        this.targetContainer.removeChild(this.targetContainer.firstChild);
      }
      
      // Remove related container class from target container
      this.targetContainer.classList.remove(this.config.relatedContainerClass);
      
      // Hide no results element
      if (this.noResultsElement) {
        this.noResultsElement.classList.remove(this.config.noResultsVisibleClass);
      }
      
      console.log('🔗 Related Posts: Cleared all related posts');
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
     * Reset masonry positioning styles on cloned element
     */
    resetMasonryStyles(element) {
      element.style.position = '';
      element.style.left = '';
      element.style.top = '';
      element.style.width = '';
      element.style.height = '';
      
      // Remove masonry classes that might affect styling
      element.classList.remove('masonry_item-positioned');
    }
  
    /**
     * Dispatch custom events
     */
    dispatchEvent(eventName, detail) {
      this.masonry.container.dispatchEvent(new CustomEvent(eventName, {
        detail: {
          ...detail,
          relatedPostsInstance: this,
          masonryInstance: this.masonry
        }
      }));
    }
  
    /**
     * Public API: Refresh related posts for current item
     */
    refresh() {
      if (this.currentItem && this.isEnabled) {
        this.populateRelatedPosts(this.currentItem);
      }
    }
  
    /**
     * Public API: Update configuration
     */
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
  
    /**
     * Public API: Get current state
     */
    getState() {
      return {
        isEnabled: this.isEnabled,
        currentItem: this.currentItem,
        hasClonedInstance: !!this.clonedMasonryInstance,
        targetContainer: this.targetContainer,
        sourceContainer: this.sourceContainer
      };
    }
  
    /**
     * Cleanup when plugin is destroyed
     */
    cleanup() {
      console.log('🔗 Related Posts: Cleaning up...');
      
      // Remove event listeners
      this.masonry.container.removeEventListener('masonry:lightboxOpen', this.handleLightboxOpen);
      this.masonry.container.removeEventListener('masonry:lightboxClose', this.handleLightboxClose);
      
      // Clear related posts
      this.clearRelatedPosts();
      
      // Clear references
      this.currentItem = null;
      this.sourceContainer = null;
      this.targetContainer = null;
      this.noResultsElement = null;
      
      console.log('✅ Related Posts: Cleanup complete');
    }
  
    /**
     * Destroy related posts plugin
     */
    destroy() {
      this.cleanup();
    }
  }
  
  /**
   * Related Posts Plugin Factory Function
   */
  export function relatedPostsPlugin(masonryInstance, options = {}) {
    console.log('🔗 Related Posts: Plugin factory called', { masonryInstance, options });
    
    // Create related posts instance
    const relatedPosts = new MasonryRelatedPosts(masonryInstance, options);
    
    // Attach to masonry instance for external access
    masonryInstance.relatedPosts = relatedPosts;
    
    // Return the related posts instance for chaining
    return relatedPosts;
  }
  
  // Export the plugin
  export { MasonryRelatedPosts, relatedPostsPlugin as default };
  
  // CommonJS compatibility
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MasonryRelatedPosts, relatedPostsPlugin };
  }
  
  // AMD compatibility
  if (typeof define === 'function' && define.amd) {
    define(() => ({ MasonryRelatedPosts, relatedPostsPlugin }));
  }
  
  // Global export for browser
  if (typeof window !== 'undefined') {
    window.MasonryRelatedPostsPlugin = relatedPostsPlugin;
  }