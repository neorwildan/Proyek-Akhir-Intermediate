export default class RegisterPresenter {
    constructor(view, model) {
      this.view = view;
      this.model = model;
      this.emailCheckTimeout = null;
    }
  
    async init() {
      const { form, email } = this.view.getFormElements();
      
      if (!form) {
        console.error('Register form not found');
        return;
      }
  
      email.addEventListener('input', () => this.handleEmailInput());
      form.addEventListener('input', () => this.handleFormInput());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRegistration();
      });
    }
  
    handleEmailInput() {
        clearTimeout(this.emailCheckTimeout);
        const { email } = this.view.getFormElements();
        const emailValue = email.value.trim();
      
        if (!emailValue) {
          this.view.clearEmailError();
          return;
        }

        if (!this.model.validateEmail(emailValue)) {
          this.view.showEmailError('Format email tidak valid');
          this.view.setButtonEnabled(false);
          return;
        }
      
        this.emailCheckTimeout = setTimeout(async () => {
          try {
            this.view.showMessage('Memeriksa ketersediaan email...', 'info');
            
            const isAvailable = await this.model.checkEmailAvailability(emailValue);
            console.log('Email available:', isAvailable); // Debug
            
            if (!isAvailable) {
              this.view.showEmailError('Email sudah terdaftar');
              this.view.setButtonEnabled(false);
            } else {
              this.view.clearEmailError();
              this.view.showMessage('Email tersedia', 'success');
              this.validateForm();
            }
          } catch (error) {
            console.error('Email check failed:', error);
            this.view.showMessage('Gagal memeriksa email', 'error');
            this.view.clearEmailError();
            this.validateForm();
          }
        }, 500);
      }
  
    handleFormInput() {
      this.validateForm();
    }
  
    validateForm() {
      const { form, email } = this.view.getFormElements();
      const isValid = form.checkValidity() && !email.classList.contains('invalid');
      this.view.setButtonEnabled(isValid);
    }
  
    async handleRegistration() {
      const { name, email, password } = this.view.getFormElements();
      
      try {
        this.view.setLoadingState(true);
        this.view.showMessage('Membuat akun baru...', 'info');
  
        const userData = await this.model.registerUser({
          name: name.value,
          email: email.value,
          password: password.value
        });
  
        this.model.saveUser(userData);
        this.view.showMessage('Akun berhasil dibuat! Silakan login', 'success');
        this.view.setLoadingState(false);
  
        setTimeout(() => {
          window.location.hash = '#/';
        }, 2000);
  
      } catch (error) {
        console.error('Registration error:', error);
        
        if (error.message.includes('already taken')) {
          this.view.showEmailError('Email sudah terdaftar');
        }
        
        this.view.showMessage(`Gagal mendaftar: ${error.message}`, 'error');
        this.view.setLoadingState(false);
      }
    }
  }