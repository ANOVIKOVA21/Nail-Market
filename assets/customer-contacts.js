// customer-contacts.js - Singleton client-side customer contacts functionality
class CustomerContactsAPI {
  static instance = null;
  static shopDomain = null;
  static customerId = null;

  static init() {
    if (!CustomerContactsAPI.instance) {
      CustomerContactsAPI.shopDomain = document.querySelector('meta[name="shop_domain"]')?.content || '';
      CustomerContactsAPI.customerId = CustomerContactsAPI.getCustomerId();
      CustomerContactsAPI.instance = true;
      
      if (!CustomerContactsAPI.shopDomain) {
        console.warn('Shop domain not found in meta tag. Customer contacts may not work properly.');
      }
      
      CustomerContactsAPI.setupEventListeners();
    }
  }

  static getCustomerId() {
    let customerId = document.querySelector('meta[name="customer_id"]')?.content || 
                    CustomerContactsAPI.getCookie('customer_id');

    if (!customerId) {
      console.error('Customer ID is required for contacts API');
      return null;
    }

    return customerId;
  }

  static getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  static async getCustomerContacts() {
    const url = new URL('/apps/api/customer/contacts', window.location.origin);
    url.searchParams.append('customerId', CustomerContactsAPI.customerId);
    url.searchParams.append('shop', CustomerContactsAPI.shopDomain);

    try {
      const headers = new Headers();
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch customer contacts:', error);
      throw error;
    }
  }

  static async updateCustomerContacts(formData) {
    const url = new URL('/apps/api/customer/contacts', window.location.origin);
    url.searchParams.append('shop', CustomerContactsAPI.shopDomain);
    url.searchParams.append('customerId', CustomerContactsAPI.customerId);

    try {
      const headers = new Headers();
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      // Add customerId to form data
      const data = new FormData(formData);
      data.append('customerId', CustomerContactsAPI.customerId);

      const response = await fetch(url.toString(), {
        method: 'POST',
        body: data,
        credentials: 'include',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Customer contacts API error details:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Customer contacts update failed:', error);
      throw error;
    }
  }

  static setupEventListeners() {
    // Handle form submission
    const contactForm = document.getElementById('customer-contacts-form');
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
          const result = await CustomerContactsAPI.updateCustomerContacts(contactForm);
          
          // Show success message
          const successBanner = document.createElement('div');
          successBanner.innerHTML = `
            <div class="Polaris-Banner Polaris-Banner--statusSuccess Polaris-Banner--withinPage" tabindex="0" role="status" aria-live="polite">
              <div class="Polaris-Banner__Ribbon">
                <span class="Polaris-Icon Polaris-Icon--colorSuccess Polaris-Icon--applyColor">
                  <svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true">
                    <path d="M10 20c-5.523 0-10-4.477-10-10s4.477-10 10-10 10 4.477 10 10-4.477 10-10 10zm-1.414-10l-3.536-3.536 1.414-1.414 2.122 2.122 4.95-4.95 1.414 1.414-6.364 6.364z"></path>
                  </svg>
                </span>
              </div>
              <div class="Polaris-Banner__ContentWrapper">
                <div class="Polaris-Banner__Content">
                  <p class="Polaris-Banner__Heading">Customer information updated successfully</p>
                </div>
              </div>
            </div>
          `;
          
          const formContainer = contactForm.closest('.Polaris-Card');
          if (formContainer) {
            formContainer.insertBefore(successBanner, contactForm);
            
            // Remove banner after 5 seconds
            setTimeout(() => {
              successBanner.remove();
            }, 5000);
          }
        } catch (error) {
          // Show error message
          const errorBanner = document.createElement('div');
          errorBanner.innerHTML = `
            <div class="Polaris-Banner Polaris-Banner--statusCritical Polaris-Banner--withinPage" tabindex="0" role="alert">
              <div class="Polaris-Banner__Ribbon">
                <span class="Polaris-Icon Polaris-Icon--colorCritical Polaris-Icon--applyColor">
                  <svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true">
                    <path d="M10 20c-5.523 0-10-4.477-10-10s4.477-10 10-10 10 4.477 10 10-4.477 10-10 10zm-1-5h2v2h-2v-2zm0-8h2v6h-2v-6z"></path>
                  </svg>
                </span>
              </div>
              <div class="Polaris-Banner__ContentWrapper">
                <div class="Polaris-Banner__Content">
                  <p class="Polaris-Banner__Heading">Failed to update customer information: ${error.message}</p>
                </div>
              </div>
            </div>
          `;
          
          const formContainer = contactForm.closest('.Polaris-Card');
          if (formContainer) {
            formContainer.insertBefore(errorBanner, contactForm);
          }
        }
      });
    }

    // Initialize form with current data
    //CustomerContactsAPI.initFormData();
  }

  static async initFormData() {
    try {
      const { customer } = await CustomerContactsAPI.getCustomerContacts();
      
      if (customer) {
        const firstNameInput = document.querySelector('#customer-contacts-form input[name="firstName"]');
        const lastNameInput = document.querySelector('#customer-contacts-form input[name="lastName"]');
        const phoneInput = document.querySelector('#customer-contacts-form input[name="phone"]');
        
        if (firstNameInput) firstNameInput.value = customer.firstName || '';
        if (lastNameInput) lastNameInput.value = customer.lastName || '';
        if (phoneInput) phoneInput.value = customer.phone || '';
      }
    } catch (error) {
      console.error('Could not initialize customer contacts form:', error);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => CustomerContactsAPI.init());