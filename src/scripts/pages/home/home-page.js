import StoryApiService from '../../data/api';
import AuthService from '../../data/auth';
import { showFormattedDate } from '../../utils';
import { initMap, addStoryMarkers } from '../../utils/map-utils';

export default class HomePage {
  constructor() {
    this.currentToken = null;
  }

  async render() {
    this.currentToken = AuthService.getToken();
    console.log('HomePage render - Auth token:', this.currentToken ? 'Present' : 'Not present');

    return `
      <section class="container">
        <div id="loading" class="loading-indicator hidden"></div>
        
        <div class="home-header">
          <h1>Story List</h1>
          <a href="#/add-story" class="add-story-button" aria-label="Add new story">+ Add Story</a>
        </div>

        <div id="story-list" class="story-list"></div>

        <div id="map-container" class="map-container">
          <div class="map-header">
            <h2>Story Locations</h2>
            <div class="map-actions">
              <button id="resetMap" class="map-action-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6-2.3l-3-2.7"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                Reset View
              </button>
            </div>
          </div>
          <div id="map"></div>
        </div>

        <!-- Toast Notification -->
        <div id="auth-toast" class="toast auth-toast">
          <div class="toast-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span id="toast-message">Please login to add a new story</span>
          </div>
          <button id="toast-login-btn" class="toast-button">Login</button>
          <button id="toast-close-btn" class="toast-close">&times;</button>
        </div>
      </section>
    `;
  }

  async afterRender() {
    console.log('HomePage afterRender - Starting...');
    this._showLoading(true);

    const forceReload = window.sessionStorage.getItem('force_reload_stories');
    if (forceReload) {
      console.log('HomePage - Detected force reload flag');
      window.sessionStorage.removeItem('force_reload_stories');
    }
    
    try {
      await this._loadStories();
      this._setupAddStoryButton();
      this._setupMapControls();
    } catch (error) {
      console.error('Homepage initialization error:', error);
      this._showError('Failed to initialize home page');
    } finally {
      this._showLoading(false);
    }
    
    window.addEventListener('storage', (event) => {
      if (event.key === 'user') {
        console.log('User data changed, reloading stories...');
        this._loadStories();
      }
    });
  }

  async _loadStories() {
    console.log('HomePage _loadStories - Starting story load process');
    try {
      console.log('HomePage - Fetching stories for all users');

      const token = AuthService.getToken();
      let response;
      
      if (token) {
        console.log('HomePage - Using authenticated request');
        response = await StoryApiService.getAllStories(token);
      } else {
        console.log('HomePage - Using guest request');
        response = await StoryApiService.getGuestStories();
      }
      
      if (!response || !response.listStory) {
        console.log('HomePage - No stories data in response:', response);
        throw new Error('No stories data received');
      }
      
      console.log('HomePage - Received stories, rendering', response.listStory.length);
      this._renderStories(response.listStory);
      this._initMap(response.listStory);
      
    } catch (error) {
      console.error('Error loading stories:', error);
      this._showError('Failed to load stories');
    }
  }

  _showAuthToast() {
    const authToast = document.getElementById('auth-toast');
    const loginBtn = document.getElementById('toast-login-btn');
    const closeBtn = document.getElementById('toast-close-btn');
    
    if (!authToast) {
      console.error('Auth toast element not found');
      window.location.hash = '#/login';
      return;
    }

    authToast.classList.add('show');

    loginBtn.addEventListener('click', () => {
      window.location.hash = '#/login';
    });
    
    closeBtn.addEventListener('click', () => {
      authToast.classList.remove('show');
    });

    setTimeout(() => {
      window.location.hash = '#/login';
    }, 3000);
  }

  _renderStories(stories) {
    const container = document.getElementById('story-list');
    
    if (!stories.length) {
      container.innerHTML = `
        <div class="empty-stories">
          <p>No stories available yet.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = stories.map(story => `
      <article class="story-card" data-id="${story.id}">
        <div class="story-card-inner">
          <img src="${story.photoUrl}" alt="${story.description || 'Story Image'}" class="story-image">
          <div class="story-content">
            <h3 class="story-title">${story.name}</h3>
            <p class="story-desc">${story.description.substring(0, 100)}${story.description.length > 100 ? '...' : ''}</p>
            <div class="story-footer">
              <time class="story-date">${showFormattedDate(story.createdAt)}</time>
              <button class="read-more-button">Read more →</button>
            </div>
          </div>
        </div>
      </article>
    `).join('');

    document.querySelectorAll('.story-card, .read-more-button').forEach(element => {
      element.addEventListener('click', (e) => {
        const card = element.closest('.story-card');
        if (!card) return;

        const storyId = card.getAttribute('data-id');
        if (!storyId) {
          console.error('No story ID found on clicked card');
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        console.log(`Navigating to story: ${storyId}`);

        window.location.href = `#/detail?id=${storyId}`;

        if (window.location.hash.includes('#/detail')) {
          window.dispatchEvent(new Event('hashchange'));
        }
      });
    });
  }

  _initMap(stories) {
    const mapContainer = document.getElementById('map-container');
    const storiesWithLocation = stories.filter(story => story.lat && story.lon);
    
    if (storiesWithLocation.length === 0) {
      mapContainer.style.display = 'none';
      return;
    }

    mapContainer.style.display = 'block';
    const map = initMap('map', storiesWithLocation);
    
    this._mapBounds = L.latLngBounds(
      storiesWithLocation.map(story => [story.lat, story.lon])
    );
  }

  _setupMapControls() {
    const resetButton = document.getElementById('resetMap');
    if (resetButton && this._mapBounds) {
      resetButton.addEventListener('click', () => {
        const map = document.getElementById('map')._leaflet_map;
        if (map) {
          map.fitBounds(this._mapBounds, { padding: [50, 50] });
        }
      });
    }
  }

  _setupAddStoryButton() {
    const addStoryBtn = document.querySelector('.add-story-button');
    if (addStoryBtn) {
      addStoryBtn.addEventListener('click', (e) => {
        if (!AuthService.isAuthenticated()) {
          e.preventDefault();
          this._showAuthToast();
          return false;
        }
      });
    }
  }

  _showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
      show ? loader.classList.remove('hidden') : loader.classList.add('hidden');
    }
  }

  _showError(message) {
    const container = document.getElementById('story-list');
    container.innerHTML = `
      <div class="error-message">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p>${message}</p>
        <button id="retry-button" class="retry-button">Try Again</button>
      </div>
    `;

    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        this._showLoading(true);
        this._loadStories();
      });
    }
  }
}