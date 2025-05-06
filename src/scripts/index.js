import '../styles/styles.css';
import App from './pages/app';
import StoryApiService from './data/api';
import AuthService from './data/auth';

// Safe reference to app elements
const elements = {
  content: () => document.querySelector('#main-content'),
  drawerButton: () => document.querySelector('#drawer-button'),
  navigationDrawer: () => document.querySelector('#navigation-drawer'),
  offlineNotification: () => document.getElementById('offline-notification'),
  installButton: () => document.getElementById('install-button')
};

// App State
let appInstance = null;
let deferredPrompt = null;
let isOnline = navigator.onLine;

// Safe showToast function
function showToast(message, options) {
  if (appInstance?.showToast) {
    appInstance.showToast(message, options);
  } else {
    console.log('Toast:', message);
    // Fallback notification
    const toast = document.createElement('div');
    toast.className = 'fallback-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// Safe network status handler
function handleNetworkStatusChange(online) {
  if (appInstance?.onNetworkStatusChange) {
    appInstance.onNetworkStatusChange(online);
  }
  // Default behavior
  const notification = elements.offlineNotification();
  if (notification) {
    notification.style.display = online ? 'none' : 'block';
  }
}

// ========== PWA Installation ========== //

function setupPWAInstallation() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const button = elements.installButton();
    if (button) {
      button.style.display = 'block';
      button.onclick = () => deferredPrompt.prompt();
    }
  });

  window.addEventListener('appinstalled', () => {
    const button = elements.installButton();
    if (button) button.style.display = 'none';
  });
}

// ========== Network Detection ========== //

function setupNetworkDetection() {
  const updateStatus = () => {
    isOnline = navigator.onLine;
    const notification = elements.offlineNotification();
    if (notification) {
      notification.style.display = isOnline ? 'none' : 'block';
    }
    handleNetworkStatusChange(isOnline);
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

// ========== Authentication ========== //

function updateNavigation() {
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
}

function setupLogoutButton() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('#logout-button')) {
      e.preventDefault();
      AuthService.logout();
      updateNavigation();
      window.location.hash = '#/';
      if (appInstance?.renderPage) appInstance.renderPage();
    }
  });
}

// ========== Service Worker ========== //

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('New version available. Refresh to update.');
          }
        });
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }
}

// ========== App Initialization ========== //

async function initApp() {
  try {
    // Register Service Worker
    await registerServiceWorker();

    // Setup features
    setupPWAInstallation();
    setupNetworkDetection();
    updateNavigation();
    setupLogoutButton();

    // Initialize app
    appInstance = new App({
      content: elements.content(),
      drawerButton: elements.drawerButton(),
      navigationDrawer: elements.navigationDrawer()
    });

    // Verify connection
    try {
      await StoryApiService.testConnection();
    } catch (error) {
      showToast('Connection issues detected. Running in limited mode.');
    }

    // Setup footer
    const footer = document.querySelector('footer');
    if (footer) {
      footer.innerHTML = `
        <p>&copy; ${new Date().getFullYear()} Story App</p>
        <button id="install-button" style="display:none">Install App</button>
      `;
    }

  } catch (error) {
    console.error('App initialization failed:', error);
    showToast('App failed to initialize. Please refresh.');
  }
}

// Start the app
if (document.readyState !== 'loading') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}

// Global functions
window.refreshApp = () => appInstance?.renderPage?.();
window.installPWA = () => deferredPrompt?.prompt?.();