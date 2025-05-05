export default class LoginPresenter {
    constructor(view, model) {
      this.view = view;
      this.model = model;
    }
  
    async init() {
      const { form, messageEl } = this.view.getFormElements();
      
      if (!form) {
        console.error('Login form not found');
        return;
      }
  
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }
  
    async handleLogin() {
      const { email, password, messageEl } = this.view.getFormElements();
      const emailValue = email.value.trim();
      const passwordValue = password.value;
  
      if (!emailValue || !passwordValue) {
        this.view.showMessage(messageEl, 'Email dan password harus diisi');
        return;
      }
  
      try {
        this.view.setLoadingState(true);
        this.view.showMessage(messageEl, 'Sedang memverifikasi...', '#3498db');
  
        const userData = await this.model.loginUser(emailValue, passwordValue);
        this.model.saveUserData(userData);
        this.model.triggerAppRefresh();
  
        this.view.showMessage(messageEl, 'Anda akan dialihkan...', '#27ae60');
        this.view.setLoadingState(false);
        
        window.location.hash = '#/';
      } catch (error) {
        console.error('Login error:', error);
        this.view.showMessage(messageEl, `Gagal login: ${error.message}`);
        this.view.setLoadingState(false);
      }
    }
  }