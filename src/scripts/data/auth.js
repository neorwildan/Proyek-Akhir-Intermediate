class AuthService {
  static saveUser(userData) {
    localStorage.setItem('user', JSON.stringify({
      token: userData.token,
      name: userData.name,
      userId: userData.userId
    }));
  }

  static getUser() {
    return JSON.parse(localStorage.getItem('user'));
  }

  static getToken() {
    const user = this.getUser();
    return user?.token;
  }

  static getUserId() {
    const user = this.getUser();
    return user?.userId;
  }

  static isAuthenticated() {
    return !!this.getToken();
  }

  static logout() {
    localStorage.removeItem('user');
  }
}

export default AuthService;