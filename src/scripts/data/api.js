import CONFIG from '../config';

class StoryApiService {
  static async _fetchWithAuth(url, options = {}, token = null) {
    const headers = {
      ...options.headers,
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(`${CONFIG.BASE_URL}${url}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  static async getAllStories(token, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this._fetchWithAuth(`/stories?${query}`, {}, token);
  }

  static async getGuestStories() {
    try {
      const response = await fetch(`${CONFIG.BASE_URL}/stories?size=10`);
      
      if (!response.ok) {
        throw new Error('Failed to load stories');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching guest stories:', error);
      return { listStory: [] };
    }
  }

  static async getStoryDetail(token, id) {
    try {
      console.log(`Fetching story detail for ID: ${id} with token`);
      if (!id) {
        throw new Error('Story ID is required');
      }
      
      const response = await this._fetchWithAuth(`/stories/${id}`, {}, token);
      console.log('Raw API response for story detail:', response);

      if (response.story) {
        return response;
      }

      if (response.error === false && response.message === "Story found" && response.story) {
        return {
          error: false,
          message: response.message,
          story: response.story
        };
      }

      if (!response.error && response.data) {
        return {
          error: false,
          message: "Story found",
          story: response.data
        };
      }
      
      return {
        error: true,
        message: 'Invalid response format from API',
        story: null
      };
    } catch (error) {
      console.error('Error in getStoryDetail:', error);
      return {
        error: true,
        message: error.message || 'Failed to fetch story details',
        story: null
      };
    }
  }

  static async addStory(token, { description, photo, lat, lon }) {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);
    if (lat) formData.append('lat', lat);
    if (lon) formData.append('lon', lon);

    return this._fetchWithAuth('/stories', {
      method: 'POST',
      body: formData
    }, token);
  }

  static async addStoryGuest({ description, photo }) {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);

    return this._fetchWithAuth('/stories/guest', {
      method: 'POST',
      body: formData
    });
  }

  static async toggleLike(token, storyId, like) {
    return this._fetchWithAuth(`/stories/${storyId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ like })
    }, token);
  }

  static async addComment(token, storyId, content) {
    return this._fetchWithAuth(`/stories/${storyId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    }, token);
  }

  static async login({ email, password }) {
    return this._fetchWithAuth('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  }

  static async subscribePushNotification(token, subscription) {
    return this._fetchWithAuth('/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    }, token);
  }

  static async register(userData) {
    const response = await fetch(`${CONFIG.BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
  
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 400 && data.message.includes('email')) {
        throw new Error('Email sudah terdaftar. Gunakan email lain atau lupa password.');
      }
      throw new Error(data.message || 'Registrasi gagal');
    }
  
    return data;
  }

  static async subscribeToStory(token, storyId, subscription) {
    return this._fetchWithAuth(`/stories/${storyId}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    }, token);
  }

  static async unsubscribeFromStory(token, storyId) {
    return this._fetchWithAuth(`/stories/${storyId}/subscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    }, token);
  }

  static async checkStorySubscription(token, storyId) {
    try {
      const response = await this._fetchWithAuth(`/stories/${storyId}/subscribe/check`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, token);
      
      return response.subscribed || false;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }
}

export default StoryApiService;