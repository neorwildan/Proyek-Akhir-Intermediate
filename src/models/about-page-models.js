export default class AboutModel {
    constructor() {
      this.aboutContent = {
        mission: "Memberikan platform berbagi cerita yang aman, inklusif, dan inspiratif bagi semua orang tanpa terkecuali.",
        timeline: [
          { year: "2023", content: "Ide awal terbentuk dari kebutuhan akan platform berbagi cerita yang lebih personal" },
          { year: "2024", content: "Versi beta diluncurkan dengan fitur dasar berbagi cerita dan komentar" }
        ],
        team: [
            {
                name: "Neor Wildan",
                position: "Founder & CEO",
                avatar: "",
                socialLinks: []
              },
              {
                name: "Boboi Boy",
                position: "Lead Developer",
                avatar: "",
                socialLinks: []
              }
        ],
        values: [
          "Autentik - Cerita nyata dari kehidupan sehari-hari",
          "Inklusif - Untuk semua kalangan dan latar belakang"
        ]
      };
    }
  
    async getTeamData() {
      return this.aboutContent.team;
    }
  
    getAboutContent() {
      return this.aboutContent;
    }
  }