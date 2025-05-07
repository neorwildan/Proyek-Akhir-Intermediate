const NotFoundPage = {
    async render() {
      return `
        <div class="not-found">
          <h1>404 - Page Not Found</h1>
          <p>The page you're looking for doesn't exist or has been moved.</p>
          <a href="#/" class="back-home">Back to Home</a>
        </div>
      `;
    },
  
    async afterRender() {
      // Tambahkan event listeners atau logika lainnya jika diperlukan
      const backHomeButton = document.querySelector('.back-home');
      if (backHomeButton) {
        backHomeButton.addEventListener('click', () => {
          // Tambahkan logika tambahan sebelum kembali ke home jika diperlukan
        });
      }
    },
  };
  
  export default NotFoundPage;