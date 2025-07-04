document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Validate if WishlistAPI is available
    if (typeof WishlistAPI === 'undefined' || !WishlistAPI.getWishlist) {
      throw new Error('WishlistAPI is not properly initialized');
    }

    // Get wishlist data with error handling
    let wishlistData;
    try {
      WishlistAPI.showLoader();
      const wishlistResult = await WishlistAPI.getWishlist();
      console.log("wishlistResult", wishlistResult);
      wishlistData = typeof wishlistResult === 'string' ? 
                    JSON.parse(wishlistResult) : 
                    wishlistResult;
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      wishlistData = []; // Fallback to empty array

      WishlistAPI.hideLoader();
    }

    // Validate wishlist data structure
    if (!Array.isArray(wishlistData)) {
      console.warn('Invalid wishlist data format, expected array. Received:', wishlistData);
      wishlistData = [];
    }

    const wishlist = {
      items: [],
      count: 0,
      errors: 0
    };

    // Process each wishlist item with proper error handling
    await Promise.all(wishlistData.map(async (wishlistElement) => {
      // Validate wishlist element structure
      if (!wishlistElement || !wishlistElement.handle) {
        console.warn('Invalid wishlist element:', wishlistElement);
        wishlist.errors++;
        return;
      }

      try {
        // Fetch product info with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const productInfoResponse = await fetch(`/products/${wishlistElement.handle}.js`, {
          method: "GET",
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);

        // Validate response
        if (!productInfoResponse.ok) {
          throw new Error(`HTTP error! status: ${productInfoResponse.status}`);
        }

        const productInfo = await productInfoResponse.json();

        // Validate product info
        if (!productInfo || !productInfo.title) {
          throw new Error('Invalid product data received');
        }

        wishlist.items.push({
          id: productInfo.id || wishlistElement.productId,
          title: productInfo.title || 'Unknown Product',
          image_url: productInfo.featured_image || '/assets/no-image.png',
          secondary_image_url: (productInfo.images && productInfo.images[1]) || null,
          url: `/products/${productInfo.handle}` || '#',
          handle: productInfo.handle,
          price: productInfo.price ? `$${(productInfo.price / 100).toFixed(2)}` : 'Price unavailable',
          available: productInfo.available || false,
          variants: productInfo.variants || []
        });
        
        wishlist.count++;
      } catch (error) {
        console.error(`Failed to fetch product ${wishlistElement.handle}:`, error);
        wishlist.errors++;
        
        // Add fallback item for failed fetches
        wishlist.items.push({
          id: wishlistElement.productId,
          title: `Product (${wishlistElement.handle})`,
          image_url: '/assets/no-image.png',
          secondary_image_url: null,
          url: '#',
          handle: "",
          price: 'Price unavailable',
          available: false,
          error: true
        });
      }
    }));

    // Log results
    console.log(`Wishlist processed: ${wishlist.count} items, ${wishlist.errors} errors`);
    
    const container = document.querySelector('#wishlist .tab-content-container');
    if (!container) {
      console.error('Wishlist container not found');
      return;
    }

    if (wishlist.items.length === 0) {
      const emptyWishlistHtml = `<div class="wishlist__warnings">
          <h1 class="wishlist__empty-text">Your wishlist is empty</h1>
          <a
            href="/collections/all"
            class="wishlist__button button-dark button"
            style="margin-bottom: 5rem;"
          >
            Continue Shopping
          </a>
          </div>`;
      container.innerHTML = emptyWishlistHtml;
    } else {
      const wishlistEl = document.createElement('ul');
      wishlistEl.className = 'grid product-grid contains-card contains-card--product contains-card--standard grid--3-col-desktop grid--2-col-tablet grid--2-col-tablet-down';
      
      wishlist.items.forEach((item) => {
        const firstVariantId = item.variants.length > 0 ? item.variants[0].id : '';
        const listItemHtml = `<li class="grid__item">
              <div class="card-wrapper product-card-wrapper">
                <div class="card card--standard card--media">
                  <div class="card__inner gradient ratio" style="--ratio-percent:100%;">
                    <div class="card__media">
                      <div class="media media--transparent media--hover-effect">
                        <img
                          src="${item.image_url}"
                          alt="${item.title}"
                          class="motion-reduce"
                          loading="lazy"
                          width="300"
                          height="300"
                        >
                        ${item.secondary_image_url ? `
                        <img
                          src="${item.secondary_image_url}"
                          alt="${item.title}"
                          class="motion-reduce"
                          loading="lazy"
                          width="300"
                          height="300"
                          style="position:absolute;left:0;top:0;opacity:0;transition:opacity .3s;"
                        >
                        ` : ''}
                      </div>
                    </div>
                    <div class="card__content">
                      <div class="card__utility">
                        <button class="card__wishlist-button active" data-product-id="${item.id}" 
                            data-handle="${item.handle}" aria-pressed="true">
                          <span class="svg-wrapper">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M4.222 13.5L12 21L19.778 13.5C21.128 12.4835 22 10.872 22 9.0555C22 5.989 19.511 3.5 16.4445 3.5C14.628 3.5 13.011 4.378 12 5.728C10.989 4.378 9.372 3.5 7.5555 3.5C4.489 3.5 2 5.989 2 9.0555C2 10.872 2.872 12.4835 4.222 13.5ZM7.5555 4.5C8.9805 4.5 10.3425 5.183 11.1995 6.327L12 7.396L12.8005 6.3275C13.6575 5.183 15.0195 4.5 16.4445 4.5C18.9565 4.5 21 6.5435 21 9.0555C21 10.4995 20.3355 11.8285 19.176 12.701L19.1275 12.7375L19.0835 12.78L12 19.611L4.9165 12.78L4.8725 12.7375L4.824 12.701C3.665 11.8285 3 10.4995 3 9.0555C3 6.5435 5.0435 4.5 7.5555 4.5Z" fill="currentColor"></path>
                            </svg>
                          </span>
                        </button>
                      </div>
                      <div class="card__information">
                        <h3 class="card__heading">
                          <a
                            href="${item.url}"
                            class="full-unstyled-link"
                          >
                            ${item.title}
                          </a>
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div class="card__content">
                      <div class="card__information">
                        <h3 class="card__heading h5">
                          <a href="${item.url}" class="full-unstyled-link">${item.title}</a>
                        </h3>
                        <div class="card-information">
                          <!--div class="card__reviews">
                            <div class="card__rating">
                              <span class="svg-wrapper">★</span>
                              <span class="svg-wrapper">★</span>
                              <span class="svg-wrapper">★</span>
                              <span class="svg-wrapper">★</span>
                              <span class="svg-wrapper">★</span>
                            </div>
                            <p class="card__review-count">100 reviews</p>
                          </div-->
                          <span class="caption-large light"></span>
                          <div class="price">
                            <span class="price-item price-item--regular">${item.price}</span>
                          </div>
                        </div>
                      </div>
                      <div class="card__buttons">
                        <a href="${item.url}" class="card__details-btn button">Details</a>
                        <div class="quick-add no-js-hidden">
                          <product-form>
                            <form
                              method="post"
                              action="/cart/add"
                              accept-charset="UTF-8"
                              class="form"
                              enctype="multipart/form-data"
                              novalidate="novalidate"
                              data-type="add-to-cart-form"
                            >
                              <input type="hidden" name="form_type" value="product">
                              <input type="hidden" name="utf8" value="✓">
                              <input type="hidden" name="id" value="${firstVariantId}" class="product-variant-id">
                              <button
                                type="submit"
                                name="add"
                                class="quick-add__submit button button--full-width button--secondary"
                                aria-haspopup="dialog"
                                aria-live="polite"
                                data-sold-out-message="true"
                                ${!item.available ? 'disabled' : ''}
                              >
                                <span>${item.available ? 'Buy now' : 'Sold out'}</span>
                                <span class="sold-out-message hidden">Sold out</span>
                                <div class="loading__spinner hidden">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="spinner" viewBox="0 0 66 66">
                                    <circle stroke-width="6" cx="33" cy="33" r="30" fill="none" class="path"></circle>
                                  </svg>
                                </div>
                              </button>
                              <input type="hidden" name="product-id" value="${item.id}">
                            </form>
                          </product-form>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </li>`;
        wishlistEl.insertAdjacentHTML('beforeend', listItemHtml);
      });
      
      container.innerHTML = ''; // Clear existing content
      container.appendChild(wishlistEl);
      
      // Add event listeners to wishlist buttons
      /*container.querySelectorAll('.card__wishlist-button').forEach(button => {
        button.addEventListener('click', async (e) => {
          e.preventDefault();
          const productId = button.dataset.productId;
          try {
            await WishlistAPI.toggleWishlist(button);
          } catch (error) {
            console.error('Failed to toggle wishlist:', error);
          }
        });
      });*/
    }
  } catch (error) {
    console.error('Critical error in wishlist processing:', error);
    const container = document.querySelector('#wishlist .tab-content-container');
    if (container) {
      container.innerHTML = `<div class="wishlist__error">
        <p>We couldn't load your wishlist. Please try again later.</p>
        <button class="button" onclick="window.location.reload()">Retry</button>
      </div>`;
    }
  } finally {
    WishlistAPI.hideLoader();
  }
});