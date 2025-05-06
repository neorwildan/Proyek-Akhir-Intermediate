class StoryDatabase {
    constructor() {
      this.dbName = 'StoryAppDB';
      this.dbVersion = 2;
      this.storeName = 'stories';
      this.db = null;
    }
  
    // Inisialisasi database
    async openDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
  
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
            console.log('Object store created');
          }
        };
  
        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };
  
        request.onerror = (event) => {
          reject(`IndexedDB error: ${event.target.error}`);
        };
      });
    }
  
    // Menyimpan story
    async saveStory(storyData) {
      if (!this.db) await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const request = store.add({
          ...storyData,
          timestamp: new Date().getTime(),
          isOffline: true
        });
  
        request.onsuccess = () => {
          console.log('Story saved offline:', storyData);
          resolve();
        };
  
        request.onerror = (event) => {
          reject(`Failed to save story: ${event.target.error}`);
        };
      });
    }
  
    // Mengambil semua story
    async getAllStories() {
      if (!this.db) await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
  
        request.onsuccess = () => {
          resolve(request.result || []);
        };
  
        request.onerror = (event) => {
          reject(`Failed to get stories: ${event.target.error}`);
        };
      });
    }
  
    // Menghapus story
    async deleteStory(storyId) {
      if (!this.db) await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(storyId);
  
        request.onsuccess = () => {
          console.log('Story deleted:', storyId);
          resolve();
        };
  
        request.onerror = (event) => {
          reject(`Failed to delete story: ${event.target.error}`);
        };
      });
    }
  
    // Sinkronisasi dengan API ketika online
    async syncWithAPI() {
      if (!navigator.onLine) return;
      
      const stories = await this.getAllStories();
      const offlineStories = stories.filter(story => story.isOffline);
      
      for (const story of offlineStories) {
        try {
          await StoryApiService.postStory(story);
          await this.deleteStory(story.id);
          console.log('Synced story:', story.id);
        } catch (error) {
          console.error('Sync failed:', error);
        }
      }
    }
  }
  
  export const db = new StoryDatabase();