import '../styles/styles.css';
import App from './pages/app';
import StoryApiService from './data/api';
import AuthService from './data/auth';

let appInstance = null;
let deferredPrompt = null; // Untuk PWA install prompt

// PWA Installation Handler
function setupPWAInstallation() {
  // Event untuk beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    
    // Tampilkan install button jika ada
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => installPWA());
    }
  });

  // Event untuk appinstalled
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    const installButton = document.getElementById('install-button');
    if (installButton) installButton.style.display = 'none';
  });
}

// Fungsi untuk menampilkan install prompt
function installPWA() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    deferredPrompt = null;
  });
}

// Network Status Detection
function setupNetworkDetection() {
  // 1. Cek atau buat elemen notifikasi
  let offlineNotification = document.getElementById('offline-notification');
  
  if (!offlineNotification) {
    console.warn('Membuat elemen notifikasi offline secara dinamis');
    offlineNotification = document.createElement('div');
    offlineNotification.id = 'offline-notification';
    offlineNotification.className = 'offline-notification';
    offlineNotification.innerHTML = '<p>You are currently offline. Some features may be limited.</p>';
    document.body.appendChild(offlineNotification);
  }

  // 2. Fungsi update status dengan error handling
  const updateOnlineStatus = () => {
    try {
      const element = document.getElementById('offline-notification');
      if (element) {
        element.style.display = navigator.onLine ? 'none' : 'block';
        console.log(`Status: ${navigator.onLine ? 'Online' : 'Offline'}`);
      }
    } catch (error) {
      console.error('Error updating network status:', error);
    }
  };

  // 3. Pasang event listeners dengan fallback
  if (window.addEventListener) {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  } else {
    // Fallback untuk browser lama
    setInterval(updateOnlineStatus, 5000);
  }

  // 4. Initial check
  updateOnlineStatus();
}

// Panggil setelah DOM siap
document.addEventListener('DOMContentLoaded', setupNetworkDetection);

// Update Navigation Based on Auth Status
function updateNavigation() {
  const navList = document.getElementById('nav-list');
  const isAuthenticated = AuthService.isAuthenticated();
  
  if (navList) {
    const authItem = Array.from(navList.children).find(item => {
      const link = item.querySelector('a');
      return link && (link.getAttribute('href') === '#/login' || link.getAttribute('href') === '#/logout');
    });
    
    if (authItem) {
      const authLink = authItem.querySelector('a');
      
      if (isAuthenticated) {
        authLink.textContent = 'Logout';
        authLink.setAttribute('href', '#/logout');
        authLink.setAttribute('id', 'logout-button');
      } else {
        authLink.textContent = 'Login';
        authLink.setAttribute('href', '#/login');
        authLink.removeAttribute('id');
      }
    }
  }
}

// Logout Button Handler
function setupLogoutButton() {
  document.addEventListener('click', (event) => {
    if (event.target.id === 'logout-button' || event.target.closest('#logout-button')) {
      event.preventDefault();
      AuthService.logout();
      window.location.hash = '#/';
      updateNavigation();
      
      // Refresh app after logout
      if (appInstance) {
        appInstance.renderPage();
      }
    }
  });
}

// Service Worker Registration
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registration successful with scope:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('New service worker activated');
            // Optional: Show update notification to user
            if (appInstance) {
              appInstance.showToast('A new version is available. Please refresh the page.');
            }
          }
        });
      });
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  }
}

// Initialize the Application
async function initApp() {
  console.log('Starting app initialization...');

  // Register Service Worker
  await registerServiceWorker();

  // Setup PWA features
  setupPWAInstallation();
  setupNetworkDetection();

  const elements = {
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer')
  };

  console.log('DOM Elements:', elements);

  // Check API connection with timeout
  try {
    console.log('Testing API connection...');
    const apiStatus = await Promise.race([
      StoryApiService.testConnection(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    console.log('API Status:', apiStatus);
  } catch (error) {
    console.warn('API Check Warning:', error.message);
    if (appInstance) {
      appInstance.showToast(error.message.includes('Timeout') ? 
        'Slow connection detected. Running in limited mode.' : 
        'Connection issues detected. Some features may be limited.');
    }
  }

  // Setup footer
  const footer = document.querySelector('footer');
  if (footer) {
    footer.classList.add('app-footer');
    footer.innerHTML = `
      <div class="container footer-content">
        <div class="footer-copyright">
          <p>&copy; ${new Date().getFullYear()} Story App. All rights reserved.</p>
        </div>
        <button id="install-button" class="install-button" style="display: none;">
          Install App
        </button>
      </div>
    `;
  }

  // Initial auth state
  const wasLoggedIn = AuthService.isAuthenticated();
  console.log('Initial auth state:', wasLoggedIn ? 'Logged in' : 'Not logged in');

  // Setup navigation and logout
  updateNavigation();
  setupLogoutButton();

  // Initialize main app
  appInstance = new App({
    content: elements.content,
    drawerButton: elements.drawerButton,
    navigationDrawer: elements.navigationDrawer
  });

  // Listen for auth changes
  window.addEventListener('storage', (event) => {
    if (event.key === 'user') {
      const isLoggedIn = AuthService.isAuthenticated();
      const wasChange = isLoggedIn !== wasLoggedIn;
      
      console.log('Auth state changed:', isLoggedIn ? 'Logged in' : 'Not logged in', 
                  'Changed:', wasChange);

      updateNavigation();
      
      if (wasChange && appInstance) {
        console.log('Forcing page re-render after auth change');
        appInstance.renderPage();
      }
    }
  });

  // Listen for messages from service worker
  navigator.serviceWorker?.addEventListener('message', (event) => {
    console.log('Message from Service Worker:', event.data);
    if (event.data.type === 'push-notification' && appInstance) {
      appInstance.showToast(event.data.payload.body || 'New notification received');
    }
  });

  console.log('App initialized successfully');
}

// Start the app when DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}

// Global refresh function
window.refreshApp = function() {
  if (appInstance) {
    console.log('Manual app refresh requested');
    appInstance.renderPage();
    updateNavigation();
    return true;
  }
  return false;
};

// Global install function
window.installPWA = installPWA;

// Export for testing
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    updateNavigation,
    setupLogoutButton,
    initApp
  };
}