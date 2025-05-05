import StoryApiService from '../data/api';
import AuthService from '../data/auth';
import Swal from 'sweetalert2';

const PUBLIC_VAPID_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

class NotificationUtils {
  /**
   * Check if browser supports notifications
   */
  static isSupported() {
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }

  /**
   * Request notification permission
   */
  static async requestPermission() {
    if (!this.isSupported()) return false;
    
    try {
      return await Notification.requestPermission();
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Subscribe to push notifications for story updates
   */
  static async subscribeForStoryNotifications(token) {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        return true;
      }

      // Create new subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });

      // Send subscription to server
      await StoryApiService.subscribePushNotification(token, {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(subscription.getKey('auth'))
        }
      });

      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw new Error('Failed to subscribe for notifications');
    }
  }

  /**
   * Show local notification when story is created
   */
  static async showStoryCreatedNotification(description) {
    if (!this.isSupported()) return false;

    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') return false;

      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification('Story Berhasil Dibuat', {
        body: `Deskripsi: ${description}`,
        icon: '/images/icon-192x192.png',
        badge: '/images/badge.png',
        data: { url: '/', type: 'story_created' },
        vibrate: [200, 100, 200]
      });

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  static urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
  }

  /**
   * Convert array buffer to base64
   */
  static arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  /**
   * Show notification prompt with SweetAlert
   */
  static async showNotificationPrompt() {
    if (!this.isSupported()) {
      await Swal.fire({
        title: 'Not Supported',
        text: 'Your browser does not support notifications',
        icon: 'info'
      });
      return false;
    }

    try {
      const result = await Swal.fire({
        title: 'Enable Notifications?',
        text: 'Get notified when new stories are published',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Enable',
        cancelButtonText: 'Not Now'
      });

      if (result.isConfirmed) {
        const token = AuthService.getToken();
        if (!token) throw new Error('Please login first');
        
        const success = await this.subscribeForStoryNotifications(token);
        if (success) {
          await Swal.fire({
            title: 'Notifications Enabled',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
        return success;
      }
      return false;
    } catch (error) {
      await Swal.fire('Error', error.message, 'error');
      return false;
    }
  }
}

export default NotificationUtils;