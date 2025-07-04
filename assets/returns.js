class ReturnsAPI {
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
    if (!ReturnsAPI.instance) {
      ReturnsAPI.shopDomain = document.querySelector('meta[name="shop_domain"]')?.content || '';
      ReturnsAPI.customerId = ReturnsAPI.getCustomerId();
      ReturnsAPI.instance = true;
      
      if (!ReturnsAPI.shopDomain) {
        console.warn('Shop domain not found in meta tag. Returns may not work properly.');
      }
      
      ReturnsAPI.setupEventListeners();
      console.log("Returns client initialized");
    }
  }

  static getCustomerId() {
    let customerId = document.querySelector('meta[name="customer_id"]')?.content || 
                    ReturnsAPI.getCookie('customer_id');

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

  static async getReturnableItems(orderId) {
    const url = new URL('/apps/api/returns', window.location.origin);
    url.searchParams.append('orderId', orderId);
    url.searchParams.append('shop', ReturnsAPI.shopDomain);

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
      console.error('Failed to fetch returnable items:', error);
      throw error;
    }
  }

  static async submitReturn(form) {
    const formData = new FormData(form);
    const orderId = formData.get("order_id");
    
    // First fetch the returnable fulfillments to get fulfillment line item IDs
    let fulfillmentsData;
    try {
        ReturnsAPI.showLoader();
      fulfillmentsData = await ReturnsAPI.getReturnableItems(orderId);
      ReturnsAPI.displaySuccessMessage(form, 'Return submitted successfully!');
      ReturnsAPI.showNotification('Return submitted!');
    } catch (error) {
      ReturnsAPI.displayErrorMessage(form, 'Failed to load order details. Please try again.');
      ReviewsAPI.showNotification('Return submission failed');
      throw error;
    } finally {
      ReturnsAPI.hideLoader();
    }

    // Collect selected items and quantities
    const selectedItems = [];
    const lineItemInputs = form.querySelectorAll('input[name^="line_items"]');
    
    lineItemInputs.forEach(input => {
      if (input.type === 'checkbox' && input.checked) {
        const index = input.name.match(/\[(\d+)\]/)[1];
        const quantity = parseInt(formData.get(`line_items[${index}][quantity]`));
        const lineItemId = formData.get(`line_items[${index}][id]`);
        
        selectedItems.push({
          lineItemId: `gid://shopify/LineItem/${lineItemId}`,
          quantity: quantity
        });
      }
    });

    if (selectedItems.length === 0) {
      ReturnsAPI.displayErrorMessage(form, 'Please select at least one item to return.');
      throw new Error('No items selected for return');
    }

    // Map selected line items to fulfillment line items
    const returnLineItems = ReturnsAPI.mapToFulfillmentLineItems(
      selectedItems, 
      fulfillmentsData.returnableFulfillments.edges
    );

    if (returnLineItems.length === 0) {
      ReturnsAPI.displayErrorMessage(form, 'Could not find fulfillment information for selected items.');
      throw new Error('No fulfillment line items found');
    }

    const returnData = {
      orderId: `${orderId}`,
      returnReason: formData.get('reason') || 'UNKNOWN',
      customerNote: formData.get('comment') || '',
      returnLineItems: returnLineItems
    };

    try {
      const response = await ReturnsAPI.makeRequest('POST', returnData);
      ReturnsAPI.displaySuccessMessage(form, 'Return request submitted successfully!');
      return response;
    } catch (error) {
      ReturnsAPI.displayErrorMessage(form, 'Failed to submit return request. Please try again.');
      throw error;
    }
  }

  static mapToFulfillmentLineItems(selectedItems, fulfillmentEdges) {
    const returnLineItems = [];
    
    // Iterate through each fulfillment
    for (const edge of fulfillmentEdges) {
      const fulfillment = edge.node;
      
      // Check each line item in the fulfillment
      for (const lineItemEdge of fulfillment.returnableFulfillmentLineItems.edges) {
        const fulfillmentLineItem = lineItemEdge.node;
        const lineItemId = fulfillmentLineItem.fulfillmentLineItem.lineItem.id;
        
        // Find if this line item was selected by the customer
        const selectedItem = selectedItems.find(item => item.lineItemId === lineItemId);
        
        if (selectedItem) {
          returnLineItems.push({
            fulfillmentLineItemId: fulfillmentLineItem.fulfillmentLineItem.id,
            quantity: Math.min(selectedItem.quantity, lineItemEdge.node.quantity),
            returnReason: 'UNKNOWN' // Will be set from form data later
          });
        }
      }
    }
    
    return returnLineItems;
  }


  static async makeRequest(method, data = {}) {
    const formData = new FormData();
    
    formData.append('shop', ReturnsAPI.shopDomain);
    formData.append('customerId', ReturnsAPI.customerId);
    
    for (const key in data) {
      if (key === 'returnLineItems') {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
    }

    try {
      const headers = new Headers();
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      const response = await fetch(`/apps/api/returns?shop=${ReviewsAPI.shopDomain}&orderId=${formData.get("orderId")}`, {
        method,
        body: formData,
        credentials: 'include',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Returns API error details:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Returns API error:', error);
      throw error;
    }
  }

  static displaySuccessMessage(form, message) {
    const existingMessages = form.querySelectorAll('.return-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageElement = document.createElement('div');
    messageElement.className = 'return-message return-message--success';
    messageElement.textContent = message;
    form.insertBefore(messageElement, form.firstChild);
    
    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }

  static displayErrorMessage(form, message) {
    const existingMessages = form.querySelectorAll('.return-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageElement = document.createElement('div');
    messageElement.className = 'return-message return-message--error';
    messageElement.textContent = message;
    form.insertBefore(messageElement, form.firstChild);
    
    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }

  static setupEventListeners() {
    // Handle return form submission
    document.querySelectorAll('form.return-form').forEach(form => {
        console.log("FORM", form);
    
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await ReturnsAPI.submitReturn(form);
          // Optionally redirect or show confirmation
        } catch (error) {
          console.error('Return submission failed:', error);
        }
      });
    });

    // MutationObserver for dynamically added elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            // Return forms
            const forms = node.matches('form.return-form') 
              ? [node] 
              : node.querySelectorAll('form.return-form');
            
            forms.forEach(form => {
              form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                  await ReturnsAPI.submitReturn(form);
                } catch (error) {
                  console.error('Return submission failed:', error);
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => ReturnsAPI.init());