const NotFoundPage = {
  async render() {
    return `
      <div class="not-found-container">
        <h2 class="not-found-title">404 - Halaman Tidak Ditemukan</h2>
        <p class="not-found-message">Maaf, halaman yang Anda cari tidak ditemukan.</p>
        <div class="not-found-image">
          <!-- Opsional: Tambahkan gambar ilustrasi 404 -->
        </div>
        <a href="#/" class="not-found-back-button">Kembali ke Beranda</a>
      </div>
    `;
  },

  async afterRender() {
    // Tambahkan event listener atau logika tambahan jika diperlukan
    const backButton = document.querySelector('.not-found-back-button');
    backButton.addEventListener('click', (event) => {
      // Opsional: Tambahkan logika khusus saat tombol kembali diklik
      // Misalnya, logging atau analitik
      console.log('User navigated back to home from 404 page');
    });
  },
};

export default NotFoundPage;