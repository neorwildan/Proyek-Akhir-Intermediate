import StoryApiService from '../scripts/data/api';
import AuthService from '../scripts/data/auth';

export default class LoginModel {
  constructor() {
    this.apiService = StoryApiService;
    this.authService = AuthService;
  }

  async loginUser(email, password) {
    const response = await this.apiService.login({ email, password });
    
    if (!response.loginResult?.token) {
      throw new Error(response.message || 'Token not received from server');
    }

    return {
      token: response.loginResult.token,
      name: response.loginResult.name,
      userId: response.loginResult.userId
    };
  }

  saveUserData(userData) {
    this.authService.saveUser(userData);
    window.sessionStorage.setItem('force_reload_stories', 'true');
  }

  triggerAppRefresh() {
    if (typeof window.updateNavigation === 'function') {
      window.updateNavigation();
    } else if (typeof window.refreshApp === 'function') {
      window.refreshApp();
    }
    window.dispatchEvent(new Event('storage'));
  }
}