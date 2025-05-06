import StoryApiService from '../../data/api';
import AuthService from '../../data/auth';
import { showFormattedDate } from '../../utils';
import { initMap, addStoryMarkers } from '../../utils/map-utils';
import { db } from '../../utils/database';
import NotificationUtils from '../../utils/notification-utils';

export default class HomePage {
  constructor() {
    this.currentToken = null;
    this._mapBounds = null;
    this._cachedStories = null;
    this._initServiceWorker();
    this._setupNetworkListeners();
  }

  async render() {
    this.currentToken = AuthService.getToken();
    
    return `
      <section class="container">
        <!-- Header Section -->
        <div class="home-header">
          <h1>Story List</h1>
          <div class="header-actions">
            <a href="#/add-story" class="add-story-button ${navigator.onLine ? '' : 'disabled'}" 
               aria-label="Add new story">
              + Add Story
              ${!navigator.onLine ? '<span class="offline-badge">Offline</span>' : ''}
            </a>
            <button id="refresh-stories" class="refresh-button" aria-label="Refresh stories">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Status Message -->
        <div id="status-message" class="status-message hidden"></div>

        <!-- Main Content -->
        <div class="main-content">
          <!-- Story List -->
          <div id="story-list" class="story-list"></div>

          <!-- Map Container -->
          <div id="map-container" class="map-container">
            <div class="map-header">
              <h2>Story Locations</h2>
              <button id="resetMap" class="map-action-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6-2.3l-3-2.7"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                Reset View
              </button>
            </div>
            <div id="map"></div>
          </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div id="delete-modal" class="modal hidden">
          <div class="modal-content">
            <p>Are you sure you want to delete this story?</p>
            <div class="modal-actions">
              <button id="confirm-delete" class="danger-button">Delete</button>
              <button id="cancel-delete" class="secondary-button">Cancel</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this._showLoading(true);
    this._updateNetworkStatus();
    this._setupEventListeners();

    try {
      await this._loadStories();
    } catch (error) {
      console.error('Error loading stories:', error);
      this._showStatusMessage('Failed to load content. Please try again.', 'error');
    } finally {
      this._showLoading(false);
    }
  }

  _initServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.type === 'stories-updated') {
          this._loadStories();
        }
      });
    }
  }

  _setupNetworkListeners() {
    window.addEventListener('online', () => this._handleNetworkChange(true));
    window.addEventListener('offline', () => this._handleNetworkChange(false));
    window.addEventListener('storage', (e) => this._handleStorageChange(e));
  }

  async _loadStories() {
    try {
      let stories;
      
      if (navigator.onLine) {
        const token = AuthService.getToken();
        const response = token 
          ? await StoryApiService.getAllStories(token)
          : await StoryApiService.getGuestStories();
        
        stories = response?.listStory || [];
        this._cachedStories = stories;
        await this._cacheStories(stories);
      } else {
        stories = await db.getAllStories();
        if (!stories.length && this._cachedStories) {
          stories = this._cachedStories;
        }
        this._showStatusMessage('You\'re offline. Showing cached stories.', 'info');
      }
      
      this._renderStories(stories || []);
      this._initMap(stories || []);
      
    } catch (error) {
      console.error('Load stories error:', error);
      throw error;
    }
  }

  async _cacheStories(stories) {
    try {
      await db.clearStories();
      for (const story of stories) {
        await db.saveStory({
          ...story,
          isOffline: false,
          isPending: false
        });
      }
    } catch (error) {
      console.error('Failed to cache stories:', error);
    }
  }

  _renderStories(stories) {
    const container = document.getElementById('story-list');
    if (!container) return;
    
    container.innerHTML = stories.length ? stories.map(story => `
      <article class="story-card" data-id="${story.id}">
        <div class="story-card-inner">
          <img src="${story.photoUrl}" alt="${story.description || 'Story'}" loading="lazy">
          <div class="story-content">
            <h3>${story.name}</h3>
            <p>${story.description.substring(0, 100)}${story.description.length > 100 ? '...' : ''}</p>
            <div class="story-footer">
              <time>${showFormattedDate(story.createdAt)}</time>
              ${story.isPending ? '<span class="pending-badge">Pending</span>' : ''}
              ${story.isOffline ? '<span class="offline-badge">Offline</span>' : ''}
              ${AuthService.isAuthenticated() ? `
                <button class="story-action-button delete-button" data-id="${story.id}" aria-label="Delete story">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </article>
    `).join('') : this._createEmptyState();
    
    this._setupStoryCardListeners();
  }

  _initMap(stories) {
    const mapContainer = document.getElementById('map-container');
    const storiesWithLocation = stories?.filter(s => s.lat && s.lon) || [];
    
    if (storiesWithLocation.length) {
      const map = initMap('map');
      addStoryMarkers(map, storiesWithLocation);
      this._mapBounds = L.latLngBounds(storiesWithLocation.map(s => [s.lat, s.lon]));
      map.fitBounds(this._mapBounds);
    }
  }

  _setupEventListeners() {
    // Add Story Button
    document.querySelector('.add-story-button')?.addEventListener('click', (e) => {
      if (!AuthService.isAuthenticated()) {
        e.preventDefault();
        this._showAuthToast();
      }
    });

    // Refresh Button
    document.getElementById('refresh-stories')?.addEventListener('click', () => {
      this._showLoading(true);
      this._loadStories().finally(() => this._showLoading(false));
    });

    // Reset Map Button
    document.getElementById('resetMap')?.addEventListener('click', () => {
      const map = document.getElementById('map')?._leaflet_map;
      if (map && this._mapBounds) {
        map.fitBounds(this._mapBounds);
      }
    });

    // Delete Modal Handlers
    document.getElementById('cancel-delete')?.addEventListener('click', () => {
      document.getElementById('delete-modal').classList.add('hidden');
    });
  }

  _setupStoryCardListeners() {
    // Story Click Navigation
    document.querySelectorAll('.story-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.story-action-button')) {
          const storyId = card.dataset.id;
          window.location.hash = `#/detail?id=${storyId}`;
        }
      });
    });

    // Delete Buttons
    document.querySelectorAll('.delete-button').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = e.currentTarget.dataset.id;
        this._showDeleteModal(storyId);
      });
    });
  }

  _showDeleteModal(storyId) {
    const modal = document.getElementById('delete-modal');
    modal.dataset.storyId = storyId;
    modal.classList.remove('hidden');

    document.getElementById('confirm-delete').onclick = async () => {
      modal.classList.add('hidden');
      await this._handleDeleteStory(storyId);
    };
  }

  async _handleDeleteStory(storyId) {
    try {
      if (navigator.onLine) {
        await StoryApiService.deleteStory(storyId, AuthService.getToken());
        await db.deleteStory(storyId);
        NotificationUtils.showToast('Story deleted successfully');
      } else {
        await db.markStoryAsPending(storyId, 'delete');
        NotificationUtils.showToast('Story will be deleted when online');
      }
      this._loadStories();
    } catch (error) {
      console.error('Delete failed:', error);
      NotificationUtils.showToast('Failed to delete story');
    }
  }

  _showStatusMessage(message, type) {
    const container = document.getElementById('status-message');
    if (!container) return;
    
    const icons = {
      info: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
      error: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
      empty: `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/></svg>`
    };
    
    container.innerHTML = `
      <div class="status-content ${type}">
        ${icons[type] || ''}
        <p>${message}</p>
        ${type === 'error' ? '<button id="retry-button">Try Again</button>' : ''}
      </div>
    `;
    container.classList.remove('hidden');
    
    if (type === 'error') {
      document.getElementById('retry-button')?.addEventListener('click', () => {
        this._showLoading(true);
        this._loadStories().finally(() => this._showLoading(false));
      });
    }
  }

  _hideStatusMessage() {
    const container = document.getElementById('status-message');
    if (container) container.classList.add('hidden');
  }

  _handleNetworkChange(isOnline) {
    this._updateNetworkStatus();
    if (isOnline) {
      this._loadStories();
    }
  }

  _handleStorageChange(event) {
    if (event.key === 'user') {
      this._loadStories();
    }
  }

  _updateNetworkStatus() {
    const isOnline = navigator.onLine;
    const statusBar = document.getElementById('offline-status-bar');
    const addStoryBtn = document.querySelector('.add-story-button');
    
    if (statusBar) statusBar.classList.toggle('hidden', isOnline);
    if (addStoryBtn) addStoryBtn.classList.toggle('disabled', !isOnline);
  }

  _showAuthToast() {
    const toast = document.createElement('div');
    toast.className = 'auth-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Please login to add stories</span>
      </div>
      <button class="toast-button">Login</button>
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    
    toast.querySelector('.toast-button')?.addEventListener('click', () => {
      window.location.hash = '#/login';
    });
  }

  _showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) loader.classList.toggle('hidden', !show);
  }

  _createEmptyState() {
    return `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>No stories found</p>
        ${!navigator.onLine ? '<p>You are currently offline</p>' : ''}
      </div>
    `;
  }
}