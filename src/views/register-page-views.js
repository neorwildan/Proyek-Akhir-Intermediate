export default class RegisterView {
    constructor() {
      this.template = this.getTemplate();
      this.emailCheckTimeout = null;
    }
  
    getTemplate() {
      return `
        <section class="register-container">
          <div class="register-card">
            <h1 class="register-title">Daftar Akun Baru</h1>
            
            <form id="registerForm" class="register-form" aria-label="Form pendaftaran">
              <div class="form-group">
                <label for="name" class="form-label">Nama Lengkap</label>
                <input 
                  type="text" 
                  id="name" 
                  class="form-input"
                  placeholder="Masukkan nama lengkap"
                  aria-describedby="name-help"
                  required
                >
                <small id="name-help" class="help-text">Gunakan nama asli Anda</small>
              </div>
              
              <div class="form-group">
                <label for="email" class="form-label">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  class="form-input"
                  placeholder="contoh@email.com"
                  aria-describedby="email-help"
                  required
                >
                <small id="email-help" class="help-text">Masukkan email yang valid</small>
                <div id="email-error" class="error-message" aria-live="polite"></div>
              </div>
              
              <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  class="form-input"
                  placeholder="Minimal 8 karakter"
                  aria-describedby="password-help"
                  required
                  minlength="8"
                >
                <small id="password-help" class="help-text">Minimal 8 karakter, kombinasi huruf dan angka</small>
              </div>
  
              <div class="forgot-password-container">
                <a href="#/forgot-password" class="forgot-password-link">Lupa password?</a>
              </div>
              
              <div id="registerMessage" class="message" aria-live="polite"></div>
              
              <button type="submit" class="primary-button" id="registerButton" disabled>
                <span class="button-text">Daftar Sekarang</span>
              </button>
            </form>
            
            <div class="auth-footer">
              <p>Sudah punya akun? <a href="#/login" class="text-link">Masuk disini</a></p>
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
        form: document.getElementById('registerForm'),
        name: document.getElementById('name'),
        email: document.getElementById('email'),
        password: document.getElementById('password'),
        emailError: document.getElementById('email-error'),
        messageEl: document.getElementById('registerMessage'),
        registerButton: document.getElementById('registerButton'),
        buttonText: document.querySelector('#registerButton .button-text')
      };
    }
  
    showEmailError(message) {
      const { emailError, email } = this.getFormElements();
      emailError.textContent = message;
      emailError.style.display = 'block';
      email.classList.add('invalid');
    }
  
    clearEmailError() {
      const { emailError, email } = this.getFormElements();
      emailError.style.display = 'none';
      email.classList.remove('invalid');
    }
  
    showMessage(message, type = 'error') {
      const { messageEl } = this.getFormElements();
      messageEl.textContent = message;
      messageEl.style.color = `var(--${type}-color)`;
    }
  
    setLoadingState(isLoading) {
      const { registerButton, buttonText } = this.getFormElements();
      if (isLoading) {
        registerButton.setAttribute('aria-busy', 'true');
        registerButton.disabled = true;
        buttonText.textContent = 'Mendaftarkan...';
      } else {
        registerButton.removeAttribute('aria-busy');
        buttonText.textContent = 'Daftar Sekarang';
      }
    }
  
    setButtonEnabled(enabled) {
      const { registerButton } = this.getFormElements();
      registerButton.disabled = !enabled;
    }

    showEmailError(message) {
        console.log('Showing email error:', message); // Debug log
        const { emailError, email } = this.getFormElements();
        emailError.textContent = message;
        emailError.style.display = 'block';
        email.classList.add('invalid');
      }
  }