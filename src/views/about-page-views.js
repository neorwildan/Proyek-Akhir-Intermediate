export default class AboutView {
    constructor() {
      this.template = this.getTemplate();
    }
  
    getTemplate() {
      return `
        <section class="about-container">
          <div class="about-header">
            <h1>Tentang Kami</h1>
            <p class="tagline">Menceritakan kisah, menghubungkan dunia</p>
          </div>
  
          <div class="about-content">
            <article class="mission-card">
              <div class="icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z"/>
                </svg>
              </div>
              <h2>Misi Kami</h2>
              <p id="mission-text"></p>
            </article>
  
            <article class="story-card">
              <h2>Asal Usul</h2>
              <div class="timeline" id="timeline-container"></div>
            </article>
  
            <article class="team-card">
              <h2>Tim Kami</h2>
              <div class="team-grid" id="team-container"></div>
            </article>
  
            <article class="values-card">
              <h2>Nilai Kami</h2>
              <ul class="values-list" id="values-list"></ul>
            </article>
          </div>
  
          <div class="cta-section">
            <h2>Siap memulai perjalanan cerita Anda?</h2>
          </div>
        </section>
      `;
    }
  
    async render(aboutContent, teamData) {
        const container = document.createElement('div');
        container.innerHTML = this.template;
        
        // Render konten utama
        container.querySelector('#mission-text').textContent = aboutContent.mission;
        
        // Render timeline
        const timelineContainer = container.querySelector('#timeline-container');
        aboutContent.timeline.forEach(item => {
        timelineContainer.innerHTML += `
            <div class="timeline-item">
            <div class="year">${item.year}</div>
            <div class="content">${item.content}</div>
            </div>
        `;
        });
        
        const valuesList = container.querySelector('#values-list');
        aboutContent.values.forEach(value => {
          valuesList.innerHTML += `
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z"/>
              </svg>
              <span>${value}</span>
            </li>
          `;
        });

        const teamContainer = container.querySelector('#team-container');
        if (teamContainer && teamData) {
          teamData.forEach(member => {
            teamContainer.innerHTML += `
              <div class="team-member">
                <div class="avatar-placeholder"></div>
                <h3>${member.name}</h3>
                <p>${member.position}</p>
              </div>
            `;
          });
        }
        
        return container;
      }
  
    setupEventListeners(presenter) {
      document.querySelectorAll('.team-member').forEach(member => {
        member.addEventListener('mouseenter', () => {
          member.style.transform = 'translateY(-5px)';
          member.style.transition = 'transform 0.3s ease';
        });
        member.addEventListener('mouseleave', () => {
          member.style.transform = '';
        });
      });
  
      document.querySelectorAll('.values-list li').forEach(item => {
        item.addEventListener('click', function() {
          this.classList.toggle('highlighted');
        });
      });
    }
  }