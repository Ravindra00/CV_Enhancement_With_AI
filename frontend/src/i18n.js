import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  en: {
    translation: {
      "My Resumes": "My Resumes",
      "Create and manage your professional CVs": "Create and manage your professional CVs",
      "Import CV": "Import CV",
      "New Resume": "New Resume",
      "Edit": "Edit",
      "Letter": "Letter",
      "Delete": "Delete",
      "Cancel": "Cancel",
      "Dashboard": "Dashboard",
      "Cover Letters": "Cover Letters",
      "Job Tracker": "Job Tracker",
      "Logout": "Logout",
      "Personal Information": "Personal Information",
      "Experience": "Experience",
      "Education": "Education",
      "Skills": "Skills",
      "Soft Skills": "Soft Skills",
      "Languages": "Languages",
      "Projects": "Projects",
      "Certifications": "Certifications",
      "Custom Sections": "Custom Sections",
      "Interests & Hobbies": "Interests & Hobbies",
      "Profile Summary": "Profile Summary",
      "Save": "Save",
      "Back": "Back",
      "AI Rewrite": "AI Rewrite",
      "Analyze JD": "Analyze JD"
    }
  },
  de: {
    translation: {
      "My Resumes": "Meine Lebensläufe",
      "Create and manage your professional CVs": "Erstellen und verwalten Sie Ihre professionellen Lebensläufe",
      "Import CV": "Lebenslauf importieren",
      "New Resume": "Neuer Lebenslauf",
      "Edit": "Bearbeiten",
      "Letter": "Anschreiben",
      "Delete": "Löschen",
      "Cancel": "Abbrechen",
      "Dashboard": "Dashboard",
      "Cover Letters": "Anschreiben",
      "Job Tracker": "Job-Tracker",
      "Logout": "Abmelden",
      "Personal Information": "Persönliche Daten",
      "Experience": "Berufserfahrung",
      "Education": "Ausbildung",
      "Skills": "Kenntnisse",
      "Soft Skills": "Soft Skills",
      "Languages": "Sprachen",
      "Projects": "Projekte",
      "Certifications": "Zertifikate",
      "Custom Sections": "Eigene Abschnitte",
      "Interests & Hobbies": "Interessen & Hobbys",
      "Profile Summary": "Kurzprofil",
      "Save": "Speichern",
      "Back": "Zurück",
      "AI Rewrite": "KI Umschreiben",
      "Analyze JD": "Stellenanzeige analysieren"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
