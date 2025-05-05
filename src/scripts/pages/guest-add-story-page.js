import StoryApiService from '../data/api';
import { showToast } from '../utils/index';

export default class GuestAddStoryPage {
  async render() {
    return `
      <section class="container">
        <h1>Add Story as Guest</h1>
        <form id="guestStoryForm" enctype="multipart/form-data">
          <!-- Form yang sama seperti AddStoryPage -->
          <p class="guest-notice">You're posting as guest. <a href="#/register">Register</a> for full features.</p>
        </form>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('guestStoryForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const formData = {
          description: document.getElementById('description').value,
          photo: document.getElementById('photo').files[0]
        };

        const response = await StoryApiService.addStoryGuest(formData);
        showToast('Story added as guest!');
        window.location.hash = '#/';
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
    });
  }
}