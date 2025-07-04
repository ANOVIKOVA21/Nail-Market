class ReviewsAPI {
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
    if (!ReviewsAPI.instance) {
      ReviewsAPI.shopDomain = document.querySelector('meta[name="shop_domain"]')?.content || '';
      ReviewsAPI.customerId = ReviewsAPI.getCustomerId();
      ReviewsAPI.instance = true;
      
      if (!ReviewsAPI.shopDomain) {
        console.warn('Shop domain not found in meta tag. Reviews may not work properly.');
      }
      
      ReviewsAPI.setupEventListeners();

      console.log("Reviews client initialized")
    }
  }

  static getCustomerId() {
    let customerId = document.querySelector('meta[name="customer_id"]')?.content || 
                    ReviewsAPI.getCookie('customer_id');

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

  static async getReviews(productId, params = {}) {
    const url = new URL('/apps/api/reviews', window.location.origin);
    url.searchParams.append('productId', productId);
    url.searchParams.append('shop', ReviewsAPI.shopDomain);
    
    // Add optional params
    if (params.minRating) url.searchParams.append('minRating', params.minRating);
    if (params.sortBy) url.searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) url.searchParams.append('sortOrder', params.sortOrder);

    try {
      const headers = new Headers();
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: headers
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      throw error;
    }
  }

  static async makeRequest(method, data = {}) {
    const formData = new FormData();
    
    formData.append('shop', ReviewsAPI.shopDomain);
    if (!data.customerId) {
      formData.append('customerId', data.customerId);
    }
    
    for (const key in data) {
    if (key === 'images' && Array.isArray(data[key])) {
      data[key].forEach(file => {
        if (file) formData.append('images', file);
      });
    } else {
      formData.append(key, data[key]);
    }
  }

    try {
      const headers = new Headers();
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      const response = await fetch(`/apps/api/reviews`, {
        method,
        body: formData,
        credentials: 'include',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Reviews API error details:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Reviews API error:', error);
      throw error;
    }
  }

  static async submitReview(form) {
    const formData = new FormData(form);
    const productId = formData.get("productId");
    
    // Collect all image files
    const imageInputs = form.querySelectorAll('input[type="file"]');
    const images = [];
    imageInputs.forEach(input => {
      if (input.files && input.files[0]) {
        images.push(input.files[0]);
      }
    });

    const reviewData = {
      productId,
      customerId: ReviewsAPI.customerId,
      rating: formData.get('review_rating'),
      title: formData.get('review_title'),
      content: formData.get('review_description'),
      images: images // Pass all collected images
    };

    try {
      ReviewsAPI.showLoader();
      const response = await ReviewsAPI.makeRequest('POST', reviewData);
      ReviewsAPI.displaySuccessMessage(form, 'Review submitted successfully!');
      ReviewsAPI.showNotification('Review submitted!');
      return response;
    } catch (error) {
      ReviewsAPI.displayErrorMessage(form, 'Failed to submit review.');
      ReviewsAPI.showNotification('Review submission failed');
      throw error;
    } finally {
      ReviewsAPI.hideLoader();
    }
  }


  static async updateReview(form, reviewId) {
    const formData = new FormData(form);
    const productId = form.dataset.productId;
    const reviewData = {
      id: reviewId,
      productId,
      customerId: ReviewsAPI.customerId,
      rating: formData.get('rating'),
      title: formData.get('title'),
      content: formData.get('body'),
      images: form.querySelector('input[type="file"]')?.files || []
    };

    try {
      const response = await ReviewsAPI.makeRequest('PUT', reviewData);
      ReviewsAPI.displaySuccessMessage(form, 'Review updated successfully!');
      return response;
    } catch (error) {
      ReviewsAPI.displayErrorMessage(form, 'Failed to update review. Please try again.');
      throw error;
    }
  }

  static async deleteReview(reviewId, productId) {
    try {
      const response = await ReviewsAPI.makeRequest('DELETE', {
        id: reviewId,
        productId
      });
      return response;
    } catch (error) {
      console.error('Failed to delete review:', error);
      throw error;
    }
  }

  static displaySuccessMessage(form, message) {
    const existingMessages = form.querySelectorAll('.review-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageElement = document.createElement('div');
    messageElement.className = 'review-message review-message--success';
    messageElement.textContent = message;
    form.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }

  static displayErrorMessage(form, message) {
    const existingMessages = form.querySelectorAll('.review-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageElement = document.createElement('div');
    messageElement.className = 'review-message review-message--error';
    messageElement.textContent = message;
    form.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }

  static setupEventListeners() {
    // Handle review form submission
    document.querySelectorAll('form.review-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reviewId = form.dataset.reviewId;
        
        try {
          if (reviewId) {
            await ReviewsAPI.updateReview(form, reviewId);
          } else {
            await ReviewsAPI.submitReview(form);
          }
          // Optionally refresh reviews display after submission
          // ReviewsAPI.refreshReviewsDisplay(form.dataset.productId);
        } catch (error) {
          console.error('Review submission failed:', error);
        }
      });
    });

    // Handle review deletion
    document.querySelectorAll('.review-delete-button').forEach(button => {
      button.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this review?')) {
          const reviewId = button.dataset.reviewId;
          const productId = button.dataset.productId;
          
          try {
            await ReviewsAPI.deleteReview(reviewId, productId);
            // Refresh reviews display after deletion
            ReviewsAPI.refreshReviewsDisplay(productId);
          } catch (error) {
            console.error('Review deletion failed:', error);
          }
        }
      });
    });

    // MutationObserver for dynamically added elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            // Review forms
            const forms = node.matches('form.review-form') 
              ? [node] 
              : node.querySelectorAll('form.review-form');
            
            forms.forEach(form => {
              form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const reviewId = form.dataset.reviewId;
                
                try {
                  if (reviewId) {
                    await ReviewsAPI.updateReview(form, reviewId);
                  } else {
                    await ReviewsAPI.submitReview(form);
                  }
                  ReviewsAPI.refreshReviewsDisplay(form.dataset.productId);
                } catch (error) {
                  console.error('Review submission failed:', error);
                }
              });
            });

            // Delete buttons
            const deleteButtons = node.matches('.review-delete-button') 
              ? [node] 
              : node.querySelectorAll('.review-delete-button');
            
            deleteButtons.forEach(button => {
              button.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this review?')) {
                  const reviewId = button.dataset.reviewId;
                  const productId = button.dataset.productId;
                  
                  try {
                    await ReviewsAPI.deleteReview(reviewId, productId);
                    ReviewsAPI.refreshReviewsDisplay(productId);
                  } catch (error) {
                    console.error('Review deletion failed:', error);
                  }
                }
              });
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  static async refreshReviewsDisplay(productId) {
    try {
      const reviewsContainer = document.querySelector(`.reviews-container[data-product-id="${productId}"]`);
      if (!reviewsContainer) return;
      
      const reviews = await ReviewsAPI.getReviews(productId);
      ReviewsAPI.renderReviews(reviewsContainer, reviews);
    } catch (error) {
      console.error('Failed to refresh reviews display:', error);
    }
  }

  static renderReviews(container, reviews) {
    // Implement your review rendering logic here
    // This is a basic example - customize according to your needs
    container.innerHTML = `
      <div class="reviews-header">
        <h3>Customer Reviews</h3>
        <div class="reviews-average">Average Rating: ${ReviewsAPI.calculateAverageRating(reviews)}/5</div>
      </div>
      <div class="reviews-list">
        ${reviews.map(review => `
          <div class="review" data-review-id="${review.id}">
            <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
            <h4 class="review-title">${review.title}</h4>
            <div class="review-body">${review.content}</div>
            <div class="review-meta">
              <span class="review-author">${review.customerId === ReviewsAPI.customerId ? 'You' : 'Customer'}</span>
              <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
            ${review.customerId === ReviewsAPI.customerId ? `
              <button class="review-delete-button" data-review-id="${review.id}" data-product-id="${review.productId}">
                Delete Review
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  static calculateAverageRating(reviews) {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => ReviewsAPI.init());