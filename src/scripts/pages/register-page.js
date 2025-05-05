import RegisterView from '../../views/register-page-views';
import RegisterModel from '../../models/register-page-models';
import RegisterPresenter from '../../presenters/register-page-presenters';

export default class RegisterPage {
  constructor() {
    this.view = new RegisterView();
    this.model = new RegisterModel();
    this.presenter = new RegisterPresenter(this.view, this.model);
  }

  async render() {
    const container = this.view.render();
    return container.innerHTML;
  }

  async afterRender() {
    await this.presenter.init();
  }
}