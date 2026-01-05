
export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export interface RecentContact {
  id: string;
  number: string;
  timestamp: number;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export type Locale = 'en' | 'zh-CN' | 'zh-HK' | 'vi' | 'pt' | 'hi' | 'es';

export interface Translation {
  navTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  labelPhone: string;
  labelMessage: string;
  placeholderPhone: string;
  placeholderMessage: string;
  btnSend: string;
  btnCopy: string;
  btnCopied: string;
  sidebarQRTitle: string;
  sidebarQRDesc: string;
  sidebarRecentTitle: string;
  sidebarRecentClear: string;
  sidebarRecentEmpty: string;
  qrInputNumber: string;
  qrDownload: string;
  qrMarketingNote: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  faqTitle: string;
  footerTagline: string;
  footerMadeWith: string;
  templates: string[];
  faqs: FAQItem[];
  // Trust Elements
  trustBarNoLogs: string;
  trustBarSecure: string;
  trustBarOpen: string;
  statsMessages: string;
  statsCountries: string;
  statsUsers: string;
  privacyHeader: string;
  privacySub: string;
  testimonialHeader: string;
  verifiedTech: string;
}