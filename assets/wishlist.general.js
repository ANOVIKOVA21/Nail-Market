// wishlist.js - Singleton client-side wishlist functionality
class WishlistAPI {
  static instance = null;
  static shopDomain = null;
  static customerId = null;


  static showLoader() {
    document.getElementById('reviews-loader')?.removeAttribute('hidden');
  }

  static hideLoader() {
    document.getElementById('reviews-loader')?.setAttribute('hidden', 'true');
  }

  static showNotification(message) {
    const note = document.getElementById('reviews-notification');
    if (!note) return;
    note.textContent = message;
    note.classList.add('show');
    note.removeAttribute('hidden');

    setTimeout(() => {
      note.classList.remove('show');
      setTimeout(() => note.setAttribute('hidden', 'true'), 300);
    }, 2000);
  }


  static init() {
    if (!WishlistAPI.instance) {
      WishlistAPI.shopDomain = document.querySelector('meta[name="shop_domain"]')?.content || '';
      WishlistAPI.customerId = WishlistAPI.getCustomerId();
      WishlistAPI.instance = true;
      
      if (!WishlistAPI.shopDomain) {
        console.warn('Shop domain not found in meta tag. Wishlist may not work properly.');
      }
      
      WishlistAPI.setupEventListeners();
    }
  }

  static getCustomerId() {
    let customerId = document.querySelector('meta[name="customer_id"]')?.content || 
                    WishlistAPI.getCookie('customer_id');

    if (!customerId) {
      customerId = 'guest_' + Math.random().toString(36).substring(2, 15);
      
      // Set cookie with 1 year expiration
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `customer_id=${customerId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }

    return customerId;
  }

  static getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  static async getWishlist() {
    const url = new URL('/apps/api/wishlist', window.location.origin);
    url.searchParams.append('customerId', WishlistAPI.customerId);
    url.searchParams.append('shop', WishlistAPI.shopDomain);

    try {
      const headers = new Headers();
      // Add NGROK bypass headers
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: headers
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      throw error;
    }
  }

   static async makeRequest(method, data = {}) {
    const formData = new FormData();
    
    formData.append('shop', WishlistAPI.shopDomain);
    formData.append('customerId', WishlistAPI.customerId);
    
    for (const key in data) {
      formData.append(key, data[key]);
    }

    try {
      const headers = new Headers();
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      const response = await fetch('/apps/api/wishlist', {
        method,
        body: formData,
        credentials: 'include',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Wishlist API error details:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Wishlist API error:', error);
      throw error;
    }
  }

  static async getWishlist() {
    const url = new URL('/apps/api/wishlist', window.location.origin);
    url.searchParams.append('customerId', WishlistAPI.customerId);
    url.searchParams.append('shop', WishlistAPI.shopDomain);

    try {
      const headers = new Headers();
      // Add NGROK bypass headers
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: headers
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      throw error;
    }
  }

  static async toggleWishlist(button) {
    const productId = button.dataset.productId;
    const handle = button.dataset.handle || '';
    const isActive = button.classList.contains('active');

    try {
      if (isActive) {
        WishlistAPI.showLoader();
        await WishlistAPI.makeRequest('DELETE', { productId, handle });
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
        WishlistAPI.showNotification("Product was removed from wishlist");
      } else {
        WishlistAPI.showLoader();
        await WishlistAPI.makeRequest('POST', { productId, handle });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        WishlistAPI.showNotification("Product was added to wishlist");
      }
    } catch (error) {
      console.error('Wishlist toggle failed:', error);
    }
    finally {
      WishlistAPI.hideLoader();
    }
  }

  static setupEventListeners() {
    // Handle existing buttons
    document.querySelectorAll('button.card__wishlist-button, button.product__wishlist-button').forEach(button => {
      button.addEventListener('click', () => WishlistAPI.toggleWishlist(button));
    });

    // MutationObserver for dynamically added buttons
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            const buttons = node.matches('button.card__wishlist-button, button.product__wishlist-button') 
              ? [node] 
              : node.querySelectorAll('button.card__wishlist-button, button.product__wishlist-button');
            
            buttons.forEach(button => {
              button.addEventListener('click', () => WishlistAPI.toggleWishlist(button));
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initialize button states
    WishlistAPI.initButtonStates();
  }

  static async initButtonStates() {
    try {
      const wishlist = await WishlistAPI.getWishlist();

      console.log("wishlist", wishlist);
      
      wishlist.forEach(item => {
        document.querySelectorAll(`button.product__wishlist-button[data-product-id="${item.productId}"], button.card__wishlist-button[data-product-id="${item.productId}"]`).forEach(button => {
          button.classList.add('active');
          button.setAttribute('aria-pressed', 'true');
        });
      });
    } catch (error) {
      console.error('Could not initialize wishlist button states:', error);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => WishlistAPI.init());