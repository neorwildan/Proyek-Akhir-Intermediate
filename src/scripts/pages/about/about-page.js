import AboutView from "../../../views/about-page-views.js";
import AboutModel from "../../../models/about-page-models.js";
import AboutPresenter from "../../../presenters/about-page-presenters.js";

export default class AboutPage {
  constructor() {
    this.view = new AboutView();
    this.model = new AboutModel();
    this.presenter = new AboutPresenter(this.view, this.model);
  }

  async render() {
    try {
      const container = await this.presenter.render();
      return container.innerHTML;
    } catch (error) {
      console.error('Page render failed:', error);
      return `
        <section class="error-section">
          <h2>Gagal Memuat Halaman</h2>
          <p>Silakan coba lagi nanti</p>
        </section>
      `;
    }
  }
  
  async afterRender() {
    await this.presenter.afterRender();
  }
}