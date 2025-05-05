export default class AboutPresenter {
    constructor(view, model) {
      this.view = view;
      this.model = model;
    }
  
    async render() {
        try {
          const [aboutContent, teamData] = await Promise.all([
            this.model.getAboutContent(),
            this.model.getTeamData()
          ]);
          
          const container = await this.view.render(aboutContent, teamData);
          return container;
        } catch (error) {
          console.error('Render error:', error);
          throw error;
        }
      }
    
      async afterRender() {
        this.setupSmoothScroll();
        this.setupScrollAnimations();
        this.view.setupEventListeners();
      }
  
    setupSmoothScroll() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        });
      });
    }
  
    setupScrollAnimations() {
      const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      };
  
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      }, observerOptions);
  
      document.querySelectorAll('.mission-card, .story-card, .team-card, .values-card').forEach(card => {
        observer.observe(card);
      });
    }
  }