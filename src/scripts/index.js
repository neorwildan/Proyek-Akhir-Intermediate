import '../styles/styles.css';
import App from './pages/app';
import StoryApiService from './data/api';
import AuthService from './data/auth';

// Safe reference to app elements with null checks
const elements = {
  content: () => document.querySelector('#main-content'),
  drawerButton: () => document.querySelector('#drawer-button'),
  navigationDrawer: () => document.querySelector('#navigation-drawer'),
  offlineNotification: () => document.getElementById('offline-notification'),
  installButton: () => document.getElementById('install-button'),
  footer: () => document.querySelector('footer')
};

// App State with proper initialization
const appState = {
  appInstance: null,
  deferredPrompt: null,
  isOnline: navigator.onLine,
  swRegistration: null
};

// Enhanced showToast function with type checking
function showToast(message, options = {}) {
  try {
    if (appState.appInstance?.showToast && typeof appState.appInstance.showToast === 'function') {
      appState.appInstance.showToast(message, options);
    } else {
      console.log('Toast:', message);
      // Enhanced fallback notification
      const toast = document.createElement('div');
      toast.className = `fallback-toast ${options.type || 'info'}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: ${options.type === 'error' ? '#ff4444' : '#333'};
        color: white;
        border-radius: 4px;
        z-index: 1000;
        animation: fadeIn 0.3s;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, options.duration || 3000);
    }
  } catch (error) {
    console.error('Toast error:', error);
  }
}

// Network status handler with debouncing
let networkStatusDebounce;
function handleNetworkStatusChange(online) {
  clearTimeout(networkStatusDebounce);
  networkStatusDebounce = setTimeout(() => {
    try {
      if (appState.appInstance?.onNetworkStatusChange && 
          typeof appState.appInstance.onNetworkStatusChange === 'function') {
        appState.appInstance.onNetworkStatusChange(online);
      }
      
      const notification = elements.offlineNotification();
      if (notification) {
        notification.style.display = online ? 'none' : 'flex';
        notification.textContent = online ? '' : 'Anda sedang offline, beberapa fitur dibatasi';
      }
      
      // Update app state
      appState.isOnline = online;
      
      // Show connection restored message
      if (online) {
        showToast('Koneksi pulih', { type: 'success', duration: 2000 });
      }
    } catch (error) {
      console.error('Network status handler error:', error);
    }
  }, 300);
}

// ========== PWA Installation ========== //
function setupPWAInstallation() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    appState.deferredPrompt = e;
    const button = elements.installButton();
    if (button) {
      button.style.display = 'block';
      button.addEventListener('click', async () => {
        try {
          if (appState.deferredPrompt) {
            const result = await appState.deferredPrompt.prompt();
            if (result.outcome === 'accepted') {
              showToast('App installed successfully!', { type: 'success' });
            }
            appState.deferredPrompt = null;
          }
        } catch (error) {
          console.error('Installation failed:', error);
        }
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    const button = elements.installButton();
    if (button) button.style.display = 'none';
    showToast('App installed successfully!', { type: 'success' });
  });
}

// ========== Network Detection ========== //
function setupNetworkDetection() {
  const updateStatus = () => {
    const online = navigator.onLine;
    if (online !== appState.isOnline) {
      handleNetworkStatusChange(online);
    }
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  
  // Initial update
  updateStatus();
}

// ========== Authentication ========== //
function updateNavigation() {
  try {
    const navList = document.getElementById('nav-list');
    if (!navList) return;

    const isAuthenticated = AuthService.isAuthenticated();
    const authLinks = navList.querySelectorAll('a[href^="#/login"], a[href^="#/logout"]');

    authLinks.forEach(link => {
      if (isAuthenticated) {
        link.textContent = 'Logout';
        link.href = '#/logout';
        link.id = 'logout-button';
      } else {
        link.textContent = 'Login';
        link.href = '#/login';
        link.removeAttribute('id');
      }
    });
  } catch (error) {
    console.error('Navigation update error:', error);
  }
}

function setupLogoutButton() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('#logout-button')) {
      e.preventDefault();
      try {
        AuthService.logout();
        updateNavigation();
        window.location.hash = '#/';
        if (appState.appInstance?.renderPage && typeof appState.appInstance.renderPage === 'function') {
          appState.appInstance.renderPage();
        }
        showToast('Logged out successfully', { type: 'success' });
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  });
}

// ========== Service Worker ========== //
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      appState.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      appState.swRegistration.addEventListener('updatefound', () => {
        const newWorker = appState.swRegistration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('New version available! Refresh to update.', {
              type: 'info',
              duration: 5000,
              action: {
                text: 'Refresh',
                callback: () => window.location.reload()
              }
            });
          }
        });
      });

      // Periodic SW update check
      setInterval(() => {
        appState.swRegistration.update().catch(err => 
          console.debug('SW update check failed:', err)
        );
      }, 6 * 60 * 60 * 1000);

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'sync-completed') {
          showToast('Data synchronized successfully', { type: 'success' });
          if (appState.appInstance?.renderPage) {
            appState.appInstance.renderPage();
          }
        }
      });

    } catch (error) {
      console.error('SW registration failed:', error);
      // Tidak menampilkan error ke pengguna
    }
  }
}

// ========== App Initialization ========== //
async function initApp() {
  try {
    // Show loading state
    document.body.classList.add('app-loading');

    // Register Service Worker first
    await registerServiceWorker();

    // Setup features
    setupPWAInstallation();
    setupNetworkDetection();
    updateNavigation();
    setupLogoutButton();

    // Initialize app
    appState.appInstance = new App({
      content: elements.content(),
      drawerButton: elements.drawerButton(),
      navigationDrawer: elements.navigationDrawer()
    });

    // Verify connection with timeout
    try {
      await Promise.race([
        StoryApiService.testConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
      ]);
    } catch (error) {
      console.warn('Connection test warning:', error);
      if (!appState.isOnline) {
        showToast('Anda sedang offline, beberapa fitur dibatasi', { 
          type: 'warning',
          duration: 5000
        });
      }
    }

    // Setup footer with version info
    const footer = elements.footer();
    if (footer) {
      footer.innerHTML = `
        <div class="footer-content">
          <p>&copy; ${new Date().getFullYear()} Story App v${process.env.APP_VERSION || '1.0.0'}</p>
          <button id="install-button" class="install-button" aria-label="Install app">
            <span>Install App</span>
          </button>
        </div>
      `;
    }

  } catch (error) {
    console.error('Initialization error:', error);
    // Tidak menampilkan pesan error ke pengguna
  } finally {
    // Ensure loading state is removed
    document.body.classList.remove('app-loading');
  }
}

// Enhanced DOM ready check
function onDOMReady() {
  if (document.readyState === 'complete' || 
      (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
    initApp();
  } else {
    document.addEventListener('DOMContentLoaded', initApp);
  }
}

// Start the app
onDOMReady();

// Global functions with safety checks
window.refreshApp = () => {
  if (appState.appInstance?.renderPage && typeof appState.appInstance.renderPage === 'function') {
    appState.appInstance.renderPage();
  }
};

window.installPWA = () => {
  if (appState.deferredPrompt) {
    appState.deferredPrompt.prompt()
      .then(result => {
        if (result.outcome === 'accepted') {
          showToast('App installation started', { type: 'success' });
        }
      })
      .catch(error => {
        console.error('Installation failed:', error);
      });
  } else {
    console.log('Installation not available');
  }
};

// Export for testing purposes
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    elements,
    appState,
    showToast,
    handleNetworkStatusChange,
    setupPWAInstallation,
    setupNetworkDetection,
    updateNavigation,
    setupLogoutButton,
    registerServiceWorker,
    initApp
  };
}