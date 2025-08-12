// core/slugs.js

/**
 * Slug management system for masonry lightbox functionality
 * Handles URL updates when lightbox items are opened/closed
 */
import { SLUG_CONFIG } from './config.js';

export class SlugManager {
    constructor(container) {
      this.container = container;
      this.isEnabled = this.container.getAttribute(`data-${SLUG_CONFIG.enabledAttribute}`) === 'true';
      this.slugPrefix = this.container.getAttribute(`data-${SLUG_CONFIG.prefixAttribute}`) || '';
      this.originalUrl = window.location.href;
      this.currentSlug = null;
    this.lightboxInstance = null;
    this.isHandlingPopState = false;
      
      console.log('🔗 Slugs: Initializing slug manager...', {
        enabled: this.isEnabled,
        prefix: this.slugPrefix,
        originalUrl: this.originalUrl
      });
    }
  
    /**
     * Check if slug functionality is enabled for this container
     */
    isSlugEnabled() {
      return this.isEnabled;
    }
  
    /**
     * Get the slug value from a masonry item
     */
    getSlugFromItem(item) {
      if (!this.isEnabled) return null;
      
      const slugValue = item.getAttribute(`data-${SLUG_CONFIG.valueAttribute}`);
      if (!slugValue) {
        console.warn('🔗 Slugs: No slug value found on item:', item);
        return null;
      }
      
      return slugValue;
    }
  
    /**
     * Build the masonrySlug query-param value: "<prefix>/<slug>" or just "<slug>"
     */
    buildSlugParamValue(slugValue) {
      if (!slugValue) return '';
      return this.slugPrefix ? `${this.slugPrefix}/${slugValue}` : `${slugValue}`;
    }

    /**
     * Build a new URL for the current page, preserving path and other params,
     * and setting the masonrySlug query param to the provided slug value
     */
    buildSlugUrl(slugValue) {
      try {
        const url = new URL(window.location.href);
        const paramValue = this.buildSlugParamValue(slugValue);
        if (paramValue) {
          url.searchParams.set(SLUG_CONFIG.slugQueryParam, paramValue);
        } else {
          url.searchParams.delete(SLUG_CONFIG.slugQueryParam);
        }

        const finalUrl = url.toString();
        console.log('🔗 Slugs: Built slug URL (query param mode):', {
          path: url.pathname,
          existingParams: url.search,
          prefix: this.slugPrefix,
          slug: slugValue,
          [SLUG_CONFIG.slugQueryParam]: paramValue,
          finalUrl
        });
        return finalUrl;
      } catch (error) {
        console.error('🔗 Slugs: Failed building slug URL:', error);
        return this.originalUrl;
      }
    }
  
    /**
     * Set the slug in the browser address bar (when lightbox opens)
     */
    setSlug(item) {
      if (!this.isEnabled) return false;
      
      const slugValue = this.getSlugFromItem(item);
      if (!slugValue) return false;
      
      const slugUrl = this.buildSlugUrl(slugValue);
      
      try {
        // If this navigation is caused by a popstate (user back/forward),
        // do NOT push another history entry. Just sync internal state.
        if (this.isHandlingPopState) {
          this.currentSlug = slugValue;
        } else {
          // Update browser URL without page reload
          window.history.pushState({ 
            slug: slugValue, // slug only (no prefix)
            slugParam: this.buildSlugParamValue(slugValue),
            originalUrl: this.originalUrl 
          }, '', slugUrl);
          this.currentSlug = slugValue;
        }
        
        console.log('🔗 Slugs: URL updated to:', slugUrl);
        
        // Dispatch custom event for other systems to listen to
        this.container.dispatchEvent(new CustomEvent('masonry:slugSet', {
          detail: {
            item,
            slug: slugValue,
            url: slugUrl,
            originalUrl: this.originalUrl
          }
        }));
        
        return true;
        
      } catch (error) {
        console.error('🔗 Slugs: Failed to update URL:', error);
        return false;
      }
    }
  
    /**
     * Clear the slug from the browser address bar (when lightbox closes)
     */
    clearSlug() {
      if (!this.isEnabled || !this.currentSlug) return false;
      
      try {
        const clearedSlug = this.currentSlug;
        
        // If we're responding to a popstate, do not manipulate history again.
        if (this.isHandlingPopState) {
          this.currentSlug = null;
        } else {
          // Navigate back to the previous state so that Forward can re-open
          // the item. The popstate handler will take care of actually closing
          // the lightbox and syncing state.
          window.history.back();
          // Leave currentSlug as-is; it will be nulled by popstate path.
        }
        
        console.log('🔗 Slugs: Requested URL clear (back to original)');
        
        // Dispatch custom event
        this.container.dispatchEvent(new CustomEvent('masonry:slugCleared', {
          detail: {
            clearedSlug,
            url: this.originalUrl
          }
        }));
        
        return true;
        
      } catch (error) {
        console.error('🔗 Slugs: Failed to clear URL:', error);
        return false;
      }
    }
  
    /**
     * Get current slug value
     */
    getCurrentSlug() {
      return this.currentSlug;
    }
  
    /**
     * Check if a slug is currently active
     */
    hasActiveSlug() {
      return this.currentSlug !== null;
    }
  
    /**
     * Reset slug manager (useful for cleanup)
     */
    reset() {
      if (this.hasActiveSlug()) {
        this.clearSlug();
      }
      
      this.currentSlug = null;
      console.log('🔗 Slugs: Slug manager reset');
    }
  
    /**
     * Update original URL (useful if page URL changes)
     */
    updateOriginalUrl(newUrl = null) {
      const oldUrl = this.originalUrl;
      this.originalUrl = newUrl || window.location.href;
      
      console.log('🔗 Slugs: Original URL updated:', {
        from: oldUrl,
        to: this.originalUrl
      });
    }

    /**
     * Find a masonry item by slug value
     */
    findItemBySlug(slugValue) {
      if (!slugValue) return null;
      return this.container.querySelector(`[data-${SLUG_CONFIG.valueAttribute}="${CSS.escape(slugValue)}"]`);
    }

    /**
     * Attach lightbox instance and set up popstate handling
     */
    attachLightbox(lightboxInstance) {
      if (!this.isEnabled) return;
      this.lightboxInstance = lightboxInstance;
      
      // Bind once
      if (!this._boundPopStateHandler) {
        this._boundPopStateHandler = this.handlePopState.bind(this);
        window.addEventListener('popstate', this._boundPopStateHandler);
        console.log('🔗 Slugs: Popstate handler attached');
      }
    }

    /**
     * Detach lightbox and cleanup listeners
     */
    detachLightbox() {
      if (this._boundPopStateHandler) {
        window.removeEventListener('popstate', this._boundPopStateHandler);
        this._boundPopStateHandler = null;
        console.log('🔗 Slugs: Popstate handler detached');
      }
      this.lightboxInstance = null;
    }

    /**
     * Handle browser back/forward navigation
     */
    handlePopState(event) {
      if (!this.isEnabled) return;
      const state = event.state || {};
      let targetSlug = state.slug || null;
      
      // Fallback to current URL's query param if state missing
      if (!targetSlug) {
        try {
          const url = new URL(window.location.href);
          const combinedParam = url.searchParams.get(SLUG_CONFIG.slugQueryParam);
          if (combinedParam) {
            targetSlug = this.parseSlugParam(combinedParam);
          }
        } catch (e) {
          // ignore
        }
      }
      
      // Prevent recursive history updates while we respond to navigation
      this.isHandlingPopState = true;
      
      try {
        if (targetSlug) {
          const targetItem = this.findItemBySlug(targetSlug);
          if (targetItem && this.lightboxInstance) {
            // Open corresponding item without pushing new history
            this.lightboxInstance.openItem(targetItem);
          } else {
            console.warn('🔗 Slugs: No item found for slug on popstate:', targetSlug);
          }
        } else {
          // No slug in state → ensure lightbox is closed
          if (this.lightboxInstance && this.lightboxInstance.isLightboxOpen()) {
            this.lightboxInstance.close();
          }
          this.currentSlug = null;
        }
      } finally {
        // Allow normal slug pushes again after handlers complete in microtask
        setTimeout(() => { this.isHandlingPopState = false; }, 0);
      }
    }

    /**
     * Parse combined masonrySlug param ("<prefix>/<slug>" or "<slug>") to the slug part
     */
    parseSlugParam(paramValue) {
      if (!paramValue) return null;
      // URLSearchParams.get() returns decoded value
      const trimmed = String(paramValue).trim();
      if (!trimmed) return null;
      const parts = trimmed.split('/');
      return parts[parts.length - 1] || null;
    }
  
    /**
     * Validate slug configuration
     */
    validateConfiguration() {
      const issues = [];
      
      if (this.isEnabled) {
        // Check if we have items with slug values
        const itemsWithSlugs = this.container.querySelectorAll(`[data-${SLUG_CONFIG.valueAttribute}]`);
        
        if (itemsWithSlugs.length === 0) {
          issues.push('No items found with data-masonry-slug-value attribute');
        }
        
        // Check for duplicate slugs
        const slugValues = Array.from(itemsWithSlugs).map(item => 
          item.getAttribute(`data-${SLUG_CONFIG.valueAttribute}`)
        ).filter(Boolean);
        
        const uniqueSlugs = new Set(slugValues);
        if (slugValues.length !== uniqueSlugs.size) {
          issues.push('Duplicate slug values detected - each item should have a unique slug');
        }
        
        // Validate slug values (basic check)
        slugValues.forEach(slug => {
          if (!slug.trim()) {
            issues.push('Empty slug value detected');
          }
        });
      }
      
      if (issues.length > 0) {
        console.group('🔗 Slugs: Configuration Issues');
        issues.forEach(issue => console.warn('⚠️', issue));
        console.groupEnd();
      } else if (this.isEnabled) {
        console.log('✅ Slugs: Configuration validated successfully');
      }
      
      return issues;
    }
  }
  
  /**
   * Factory function to create a slug manager for a container
   */
  export function createSlugManager(container) {
    return new SlugManager(container);
  }
  
  /**
   * Plugin function for masonry instances
   * Usage: masonryInstance.use(slugPlugin)
   */
  export function slugPlugin(masonryInstance, options = {}) {
    console.log('🔗 Slugs: Installing slug plugin...');
    
    // Create slug manager
    const slugManager = createSlugManager(masonryInstance.container);
    
    // Attach to masonry instance for external access
    masonryInstance.slugManager = slugManager;
    
    // Validate configuration on initialization
    masonryInstance.addHook('afterInit', (instance) => {
      instance.slugManager.validateConfiguration();
    });
    
    // Cleanup on destroy
    masonryInstance.addHook('beforeDestroy', (instance) => {
      if (instance.slugManager) {
        instance.slugManager.reset();
      }
    });
    
    console.log('✅ Slugs: Plugin installed successfully');
    
    return masonryInstance;
  }
  
  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SlugManager, createSlugManager, slugPlugin };
  } else if (typeof define === 'function' && define.amd) {
    define(() => ({ SlugManager, createSlugManager, slugPlugin }));
  }
  
  export default { SlugManager, createSlugManager, slugPlugin };