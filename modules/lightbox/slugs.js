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
     * Build the complete URL with slug
     */
    buildSlugUrl(slugValue) {
      if (!slugValue) return this.originalUrl;
      
      // Get domain root URL (protocol + domain)
      const baseUrl = window.location.origin;
      
      // Ensure base URL ends with /
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      
      // Construct the slug URL
      let slugUrl = normalizedBaseUrl;
      
      // Add prefix if specified
      if (this.slugPrefix) {
        const normalizedPrefix = this.slugPrefix.startsWith('/') 
          ? this.slugPrefix.substring(1) 
          : this.slugPrefix;
        const prefixWithSlash = normalizedPrefix.endsWith('/') 
          ? normalizedPrefix 
          : normalizedPrefix + '/';
        
        slugUrl += prefixWithSlash;
      }
      
      // Add the slug value
      slugUrl += slugValue;
      
      console.log('🔗 Slugs: Built slug URL:', {
        baseUrl,
        prefix: this.slugPrefix,
        slug: slugValue,
        finalUrl: slugUrl
      });
      
      return slugUrl;
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
        // Update browser URL without page reload
        window.history.pushState({ 
          masonrySlug: slugValue,
          originalUrl: this.originalUrl 
        }, '', slugUrl);
        
        this.currentSlug = slugValue;
        
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
        // Restore original URL
        window.history.pushState({ 
          masonrySlug: null,
          originalUrl: this.originalUrl 
        }, '', this.originalUrl);
        
        const clearedSlug = this.currentSlug;
        this.currentSlug = null;
        
        console.log('🔗 Slugs: URL cleared back to:', this.originalUrl);
        
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