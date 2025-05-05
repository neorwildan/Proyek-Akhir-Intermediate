import LoginView from '../../views/login-page-views';
import LoginModel from '../../models/login-page-models';
import LoginPresenter from '../../presenters/login-page-presenters';

export default class LoginPage {
  constructor() {
    this.view = new LoginView();
    this.model = new LoginModel();
    this.presenter = new LoginPresenter(this.view, this.model);
  }

  async render() {
    const container = this.view.render();
    // Return the HTML string, not the DOM element
    return container.innerHTML;
  }

  async afterRender() {
    await this.presenter.init();
  }
}