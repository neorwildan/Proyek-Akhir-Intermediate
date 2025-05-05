import StoryApiService from '../scripts/data/api';
import AuthService from '../scripts/data/auth';

export default class RegisterModel {
  constructor() {
    this.apiService = StoryApiService;
    this.authService = AuthService;
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async checkEmailAvailability(email) {
    try {
      if (!this.validateEmail(email)) {
        console.warn('Invalid email format');
        return false;
      }

      const response = await this.apiService.checkEmailAvailability(email);
      console.log('API Response:', response);

      if (typeof response?.available === 'boolean') {
        return response.available;
      }

      if (response?.exists !== undefined) {
        return !response.exists;
      }
      
      console.warn('Unexpected API response, assuming available');
      return true;
      
    } catch (error) {
      console.error('Email check error:', error);
      return true;
    }
  }

  async registerUser({ name, email, password }) {
    const response = await this.apiService.register({ name, email, password });
    
    if (!response.user?.token) {
      throw new Error(response.message || 'Registration failed');
    }

    return {
      token: response.user.token,
      name: response.user.name,
      userId: response.user.userId
    };
  }

  saveUser(userData) {
    this.authService.saveUser(userData);
  }
}