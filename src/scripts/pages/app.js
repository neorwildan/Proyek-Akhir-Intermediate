import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

class App {
  #content = null;
  #drawerButton = null;
  #navigationForceReload = null;
  #navigationDrawer = null;
  #currentPage = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#navigationForceReload = false;

    this._setupDrawer();
    this._setupRouter();

    window.addEventListener('storage', () => {
      console.log('Storage change detected, setting navigation force reload');
      this.#navigationForceReload = true;
    });
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.#navigationDrawer.classList.toggle('open');
    });

    document.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && 
          !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
      }
    });

    this.#navigationDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const href = link.getAttribute('href');
        if (href.startsWith('#')) {
          window.location.hash = href;
        }
      });
    });
  }

  _setupRouter() {
    window.addEventListener('hashchange', () => this._handleNavigation());
    window.addEventListener('popstate', () => this._handleNavigation());
    this._handleNavigation();
  }

  async _handleNavigation() {
    try {
      const fullPath = location.hash.replace('#', '') || '/';
      console.log('Full path:', fullPath);

      let url = fullPath.split('?')[0];
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }

      if (url.startsWith('/detail')) {
        url = '/detail';
      }
      
      console.log('Routing to:', url);
      
      const PageClass = routes[url] || routes['/'];
      
      if (!PageClass || typeof PageClass !== 'function') {
        console.error(`Route not found for: ${url}`);
        throw new Error(`Route for ${url} is not properly configured`);
      }

      const shouldReload = this.#currentPage !== PageClass || this.#navigationForceReload;
      this.#currentPage = PageClass;
      this.#navigationForceReload = false;
      
      if (!shouldReload) {
        console.log('Skipping page reload - same page and no force reload');
        return;
      }

      console.log('Navigating to:', url, 'with class:', PageClass.name);
      
      if ('startViewTransition' in document) {
        await this._transitionToPage(PageClass);
      } else {
        await this._loadPageWithoutTransition(PageClass);
      }
    } catch (error) {
      console.error('Navigation Error:', error);
      this._showErrorPage(error);
    }
  }

  async _transitionToPage(PageClass) {
    const transition = document.startViewTransition(async () => {
      await this._renderPageContent(PageClass);
    });

    try {
      await transition.ready;
      const header = document.querySelector('header');
      if (header) {
        header.style.viewTransitionName = 'main-header';
      }
    } catch (transitionError) {
      console.warn('View Transition failed:', transitionError);
      await this._renderPageContent(PageClass);
    }
  }

  async _loadPageWithoutTransition(PageClass) {
    await this._renderPageContent(PageClass);
  }

  async _renderPageContent(PageClass) {
    console.log('Rendering page:', PageClass.name);
    this.#content.innerHTML = '<div class="loading" view-transition-name="loading">Loading...</div>';
    
    try {
      const page = new PageClass();
      this.#content.innerHTML = await page.render();
      await page.afterRender();
      
      this.#navigationDrawer.classList.remove('open');
      console.log('Page rendered successfully');
    } catch (error) {
      console.error('Error rendering page:', error);
      this._showErrorPage(error);
    }
  }

  async renderPage() {
    this.#navigationForceReload = true;
    await this._handleNavigation();
  }

  _showErrorPage(error) {
    this.#content.innerHTML = `
      <div class="error-container" view-transition-name="error-page">
        <h2>Gagal Memuat Halaman</h2>
        <p>${this._getFriendlyErrorMessage(error)}</p>
        <a href="#/" class="retry-button">Kembali ke Beranda</a>
      </div>
    `;
  }

  _getFriendlyErrorMessage(error) {
    if (error.message.includes('constructor')) {
      return 'Konfigurasi routing tidak valid. Silakan hubungi developer.';
    }
    return error.message || 'Terjadi kesalahan yang tidak diketahui';
  }
}

export default App;