class QuestionsAPI {
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
    if (!QuestionsAPI.instance) {
      QuestionsAPI.shopDomain =
        document.querySelector('meta[name="shop_domain"]')?.content || '';
      QuestionsAPI.customerId = QuestionsAPI.getCustomerId();
      QuestionsAPI.instance = true;

      if (!QuestionsAPI.shopDomain) {
        console.warn(
          'Shop domain not found in meta tag. Questions may not work properly.'
        );
      }

      QuestionsAPI.setupEventListeners();

      console.log('Questions client initialized');
    }
  }

  static getCustomerId() {
    let customerId =
      document.querySelector('meta[name="customer_id"]')?.content ||
      QuestionsAPI.getCookie('customer_id');

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

  static async getQuestions(productId, params = {}) {
    const url = new URL('/apps/api/questions', window.location.origin);
    url.searchParams.append('productId', productId);
    url.searchParams.append('shop', QuestionsAPI.shopDomain);

    // Add optional params
    if (params.sortBy) url.searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) url.searchParams.append('sortOrder', params.sortOrder);

    try {
      const headers = new Headers();
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: headers,
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      throw error;
    }
  }

  static async makeRequest(method, data = {}) {
    const formData = new FormData();

    formData.append('shop', QuestionsAPI.shopDomain);
    if (!data.customerId) {
      formData.append('customerId', data.customerId);
    }

    for (const key in data) {
      formData.append(key, data[key]);
    }

    try {
      const headers = new Headers();
      headers.append('ngrok-skip-browser-warning', 'true');
      headers.append('X-Requested-With', 'XMLHttpRequest');

      const response = await fetch(`/apps/api/questions`, {
        method,
        body: formData,
        credentials: 'include',
        headers: headers,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Questions API error details:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Questions API error:', error);
      throw error;
    }
  }

  static async submitQuestion(form) {
    const formData = new FormData(form);
    const productId = formData.get('productId');

    const questionData = {
      productId,
      customerId: QuestionsAPI.customerId,
      content: formData.get('question_content'),
    };

    try {
      QuestionsAPI.showLoader();
      const response = await QuestionsAPI.makeRequest('POST', questionData);
      QuestionsAPI.displaySuccessMessage(form, 'Question submitted successfully!');
      QuestionsAPI.showNotification('Question submitted!');
      return response;
    } catch (error) {
      QuestionsAPI.displayErrorMessage(form, 'Failed to submit question.');
      QuestionsAPI.showNotification('Question submission failed');
      throw error;
    } finally {
      QuestionsAPI.hideLoader();
    }
  }

  static async updateQuestion(form, questionId) {
    const formData = new FormData(form);
    const productId = form.dataset.productId;
    const questionData = {
      id: questionId,
      productId,
      customerId: QuestionsAPI.customerId,
      content: formData.get('content'),
    };

    try {
      const response = await QuestionsAPI.makeRequest('PUT', questionData);
      QuestionsAPI.displaySuccessMessage(form, 'Question updated successfully!');
      return response;
    } catch (error) {
      QuestionsAPI.displayErrorMessage(
        form,
        'Failed to update question. Please try again.'
      );
      throw error;
    }
  }

  static async deleteQuestion(questionId, productId) {
    try {
      const response = await QuestionsAPI.makeRequest('DELETE', {
        id: questionId,
        productId,
      });
      return response;
    } catch (error) {
      console.error('Failed to delete question:', error);
      throw error;
    }
  }

  static displaySuccessMessage(form, message) {
    const existingMessages = form.querySelectorAll('.question-message');
    existingMessages.forEach((msg) => msg.remove());

    const messageElement = document.createElement('div');
    messageElement.className = 'question-message question-message--success';
    messageElement.textContent = message;
    form.appendChild(messageElement);

    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }

  static displayErrorMessage(form, message) {
    const existingMessages = form.querySelectorAll('.question-message');
    existingMessages.forEach((msg) => msg.remove());

    const messageElement = document.createElement('div');
    messageElement.className = 'question-message question-message--error';
    messageElement.textContent = message;
    form.appendChild(messageElement);

    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  }

  static setupEventListeners() {
    // Handle question form submission
    document.querySelectorAll('form.question-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const questionId = form.dataset.questionId;

        try {
          if (questionId) {
            await QuestionsAPI.updateQuestion(form, questionId);
          } else {
            await QuestionsAPI.submitQuestion(form);
          }
          QuestionsAPI.refreshQuestionsDisplay(form.dataset.productId);
        } catch (error) {
          console.error('Question submission failed:', error);
        }
      });
    });

    // Handle question deletion
    document.querySelectorAll('.question-delete-button').forEach((button) => {
      button.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this question?')) {
          const questionId = button.dataset.questionId;
          const productId = button.dataset.productId;

          try {
            await QuestionsAPI.deleteQuestion(questionId, productId);
            QuestionsAPI.refreshQuestionsDisplay(productId);
          } catch (error) {
            console.error('Question deletion failed:', error);
          }
        }
      });
    });

    // MutationObserver for dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Element node
            // Question forms
            const forms = node.matches('form.question-form')
              ? [node]
              : node.querySelectorAll('form.question-form');

            forms.forEach((form) => {
              form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const questionId = form.dataset.questionId;

                try {
                  if (questionId) {
                    await QuestionsAPI.updateQuestion(form, questionId);
                  } else {
                    await QuestionsAPI.submitQuestion(form);
                  }
                  QuestionsAPI.refreshQuestionsDisplay(form.dataset.productId);
                } catch (error) {
                  console.error('Question submission failed:', error);
                }
              });
            });

            // Delete buttons
            const deleteButtons = node.matches('.question-delete-button')
              ? [node]
              : node.querySelectorAll('.question-delete-button');

            deleteButtons.forEach((button) => {
              button.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this question?')) {
                  const questionId = button.dataset.questionId;
                  const productId = button.dataset.productId;

                  try {
                    await QuestionsAPI.deleteQuestion(questionId, productId);
                    QuestionsAPI.refreshQuestionsDisplay(productId);
                  } catch (error) {
                    console.error('Question deletion failed:', error);
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
      subtree: true,
    });
  }

  static async refreshQuestionsDisplay(productId) {
    try {
      const questionsContainer = document.querySelector(
        `.questions-container[data-product-id="${productId}"]`
      );
      if (!questionsContainer) return;

      const questions = await QuestionsAPI.getQuestions(productId);
      QuestionsAPI.renderQuestions(questionsContainer, questions);
    } catch (error) {
      console.error('Failed to refresh questions display:', error);
    }
  }

  static renderQuestions(container, questions) {
    container.innerHTML = `
      <div class="questions-header">
        <h3>Customer Questions</h3>
        <div class="questions-count">${questions.length} ${
      questions.length === 1 ? 'Question' : 'Questions'
    }</div>
      </div>
      <div class="questions-list">
        ${questions
          .map(
            (question) => `
          <div class="question" data-question-id="${question.id}">
            <div class="question-content">${question.content}</div>
            ${
              question.response
                ? `
              <div class="question-response">
                <strong>Response:</strong>
                <div class="response-content">${question.response}</div>
                <div class="response-date">${new Date(
                  question.responseAt
                ).toLocaleDateString()}</div>
              </div>
            `
                : '<div class="no-response">No response yet</div>'
            }
            <div class="question-meta">
              <span class="question-author">${
                question.customerId === QuestionsAPI.customerId ? 'You' : 'Customer'
              }</span>
              <span class="question-date">${new Date(
                question.createdAt
              ).toLocaleDateString()}</span>
            </div>
            ${
              question.customerId === QuestionsAPI.customerId
                ? `
              <button class="question-delete-button" data-question-id="${question.id}" data-product-id="${question.productId}">
                Delete Question
              </button>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => QuestionsAPI.init());
