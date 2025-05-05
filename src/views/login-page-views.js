export default class LoginView {
    constructor() {
      this.template = this.getTemplate();
    }
  
    getTemplate() {
      return `
        <section class="login-container">
          <div class="login-card">
            <h1 class="login-title">Login</h1>
            
            <form id="loginForm" class="login-form" aria-label="Login form">
              <div class="form-group">
                <label for="email" class="form-label">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  class="form-input"
                  placeholder="contoh@email.com"
                  aria-describedby="email-help"
                  required
                  autocomplete="email"
                >
                <small id="email-help" class="help-text">Masukkan email yang terdaftar</small>
              </div>
              
              <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  class="form-input"
                  placeholder="********"
                  aria-describedby="password-help"
                  required
                  autocomplete="current-password"
                >
                <small id="password-help" class="help-text">Masukkan password yang terdaftar</small>
              </div>
              
              <div class="forgot-password-container">
                <a href="#/forgot-password" class="forgot-password-link">Lupa password?</a>
              </div>
              
              <div id="loginMessage" class="login-message" aria-live="polite"></div>
              
              <button type="submit" class="login-button">
                <span class="button-text">Login</span>
              </button>
            </form>
            
            <div class="login-footer">
              <p>Belum punya akun? <a href="#/register" class="text-link">Daftar disini</a></p>
            </div>
          </div>
        </section>
      `;
    }
  
    render() {
      const container = document.createElement('div');
      container.innerHTML = this.template;
      return container;
    }
  
    getFormElements() {
      return {
        form: document.getElementById('loginForm'),
        email: document.getElementById('email'),
        password: document.getElementById('password'),
        messageEl: document.getElementById('loginMessage'),
        submitBtn: document.querySelector('#loginForm button[type="submit"]'),
        buttonText: document.querySelector('#loginForm .button-text')
      };
    }
  
    showMessage(element, message, color = '#e74c3c') {
      element.textContent = message;
      element.style.color = color;
    }
  
    setLoadingState(isLoading) {
      const { submitBtn, buttonText } = this.getFormElements();
      if (isLoading) {
        submitBtn.setAttribute('aria-busy', 'true');
        submitBtn.disabled = true;
        buttonText.textContent = 'Memproses...';
      } else {
        submitBtn.removeAttribute('aria-busy');
        submitBtn.disabled = false;
        buttonText.textContent = 'Login';
      }
    }
  }