import HomePage from '../pages/home/home-page';
import AboutPage from '../pages/about/about-page';
import LoginPage from '../pages/login-page';
import RegisterPage from '../pages/register-page';
import AddStoryPage from '../pages/add-story-page';
import GuestAddStoryPage from '../pages/guest-add-story-page';
import DetailStoryPage from '../pages/detail-story-page';
import NotFoundPage from '../pages/not-found-page';

const routes = {
  '/': HomePage,
  '/about': AboutPage,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/add-story': AddStoryPage,
  '/add-story/guest': GuestAddStoryPage,
  '/detail': DetailStoryPage,
};

export default routes;