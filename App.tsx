
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Copy,
  Trash2,
  UserPlus,
  ShieldCheck,
  Globe,
  ChevronDown,
  ChevronUp,
  QrCode,
  Check,
  ExternalLink,
  Twitter,
  Instagram,
  Languages,
  Lock,
  Zap,
  Users,
  Star,
  ListOrdered,
  ZapOff,
  Clock,
  Layout,
  Navigation,
  Facebook,
  Linkedin,
  Mail,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { COUNTRIES } from './constants';
import { TRANSLATIONS, LANGUAGES } from './i18n';
import { Country, RecentContact, Locale } from './types';
import BusinessQrGenerator from './BusinessQrGenerator';

// Animation Variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "backOut" } }
};

const itemReveal = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4 } }
};

// Helper for formatting phone numbers (simple version)
const formatPhoneInput = (val: string) => val.replace(/\D/g, '').slice(0, 15);

type Page = 'home' | 'privacy' | 'terms' | 'about' | 'contact' | 'business-qr-generator';

const PAGE_SLUGS: Record<Page, string> = {
  'home': '/',
  'privacy': '/privacy',
  'terms': '/terms',
  'about': '/about',
  'contact': '/contact',
  'business-qr-generator': '/Business-Qr-Generator',
};

const SLUG_TO_PAGE: Record<string, Page> = Object.fromEntries(
  Object.entries(PAGE_SLUGS).map(([page, slug]) => [slug.toLowerCase(), page as Page])
) as Record<string, Page>;

const getPageFromPath = (): Page => {
  const path = window.location.pathname.toLowerCase();
  return SLUG_TO_PAGE[path] || 'home';
};

const App: React.FC = () => {

  const [locale, setLocale] = useState<Locale>('en');
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [copyStatus, setCopyStatus] = useState(false);
  const [currentPage, setCurrentPageState] = useState<Page>(getPageFromPath());
  const [openFaqs, setOpenFaqs] = useState<number[]>([]);

  const t = TRANSLATIONS[locale];

  useEffect(() => {
    const savedContacts = localStorage.getItem('wa_recent_contacts');
    if (savedContacts) setRecentContacts(JSON.parse(savedContacts));
    const savedLocale = localStorage.getItem('wa_locale') as Locale;
    if (savedLocale && TRANSLATIONS[savedLocale]) setLocale(savedLocale);
    setOpenFaqs(t.faqs.map((_, i) => i));
  }, []);

  const setCurrentPage = useCallback((page: Page) => {
    setCurrentPageState(page);
    const slug = PAGE_SLUGS[page];
    if (window.location.pathname !== slug) {
      window.history.pushState({ page }, '', slug);
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const page = e.state?.page || getPageFromPath();
      setCurrentPageState(page);
    };
    window.addEventListener('popstate', handlePopState);
    // Replace initial state so back button works correctly
    window.history.replaceState({ page: currentPage }, '', PAGE_SLUGS[currentPage]);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const fullNumber = useMemo(() => {
    return selectedCountry.dialCode + phoneNumber.replace(/\D/g, '');
  }, [selectedCountry, phoneNumber]);

  const waLink = useMemo(() => {
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${fullNumber}${message ? `?text=${encodedMessage}` : ''}`;
  }, [fullNumber, message]);

  const handleOpenWhatsApp = () => {
    if (!phoneNumber) return;
    const newRecent: RecentContact = {
      id: Date.now().toString(),
      number: `+${selectedCountry.dialCode} ${phoneNumber}`,
      timestamp: Date.now()
    };
    const updated = [newRecent, ...recentContacts.filter(c => c.number !== newRecent.number)].slice(0, 5);
    setRecentContacts(updated);
    localStorage.setItem('wa_recent_contacts', JSON.stringify(updated));
    window.open(waLink, '_blank');
  };

  const handleCopyLink = () => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(waLink);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleClearHistory = () => {
    setRecentContacts([]);
    localStorage.removeItem('wa_recent_contacts');
  };

  const handleLanguageSelect = (code: Locale) => {
    setLocale(code);
    localStorage.setItem('wa_locale', code);
    setIsLanguageOpen(false);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqs(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin') => {
    const url = window.location.href;
    const text = `Message WhatsApp contacts without saving them! Check out ${t.navTitle}: `;
    let shareUrl = '';
    switch (platform) {
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`; break;
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`; break;
      case 'linkedin': shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`; break;
    }
    if (shareUrl) window.open(shareUrl, '_blank');
  };

  const renderHome = () => (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form Area */}
        <motion.div variants={fadeInUp} className="lg:col-span-8 space-y-8">
          <div className="glass p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-white/50 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Send size={160} className="rotate-12" />
            </div>

            <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight tracking-tight relative">{t.heroTitle}</h1>
            <p className="text-lg md:text-xl text-slate-800 mb-10 max-w-2xl relative">{t.heroSubtitle}</p>

            <div className="space-y-8 relative">
              <div className="relative">
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-700 mb-3 ml-2">{t.labelPhone}</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative sm:w-[45%] xl:w-1/3">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsCountryOpen(!isCountryOpen)}
                      className="w-full flex items-center gap-2 px-6 py-5 rounded-[1.5rem] bg-black/5 border-2 border-slate-200 hover:border-[#25D366] transition-all justify-between text-lg font-bold"
                    >
                      <div className="flex items-center gap-3">
                        <img src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`} alt={selectedCountry.code} className="w-8 h-5 rounded-sm object-cover shadow-sm" />
                        <span className="text-slate-600 text-sm font-black uppercase tracking-tighter">{selectedCountry.code}</span>
                        <span className="whitespace-nowrap">+{selectedCountry.dialCode}</span>
                      </div>
                      <ChevronDown size={18} className={`opacity-50 transition-transform duration-300 ${isCountryOpen ? 'rotate-180' : ''}`} />
                    </motion.button>

                    <AnimatePresence>
                      {isCountryOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(10px)' }}
                          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(10px)' }}
                          className="absolute top-full left-0 mt-3 w-80 glass rounded-[2rem] shadow-3xl overflow-hidden z-[60] py-3 border border-black/10"
                        >
                          <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {COUNTRIES.map(country => (
                              <button
                                key={country.code}
                                onClick={() => { setSelectedCountry(country); setIsCountryOpen(false); }}
                                className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-[#25D366]/10 transition-colors text-left"
                              >
                                <img src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`} alt={country.code} className="w-7 h-4 rounded-sm object-cover shadow-sm" />
                                <span className="w-8 text-[11px] font-black text-slate-600 uppercase tracking-tighter">{country.code}</span>
                                <span className="flex-grow font-semibold text-base whitespace-nowrap overflow-hidden text-ellipsis">{country.name}</span>
                                <span className="text-slate-600 text-sm font-mono whitespace-nowrap">+{country.dialCode}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneInput(e.target.value))}
                    placeholder={t.placeholderPhone}
                    className="flex-grow px-8 py-5 rounded-[1.5rem] bg-black/5 border-2 border-slate-200 focus:border-[#25D366] focus:ring-8 focus:ring-green-500/5 transition-all text-xl font-bold outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-700 mb-3 ml-2">{t.labelMessage}</label>
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t.placeholderMessage}
                    rows={5}
                    maxLength={1000}
                    className="w-full px-8 py-6 rounded-[1.5rem] bg-black/5 border-2 border-slate-200 focus:border-[#25D366] focus:ring-8 focus:ring-green-500/5 transition-all text-lg font-medium outline-none resize-none placeholder:text-slate-300 leading-relaxed"
                  />
                  <div className="absolute bottom-6 right-6 text-sm text-slate-700 font-bold bg-white/70 px-3 py-1.5 rounded-xl backdrop-blur-md">
                    {message.length} / 1000
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 mt-6">
                  {t.templates.map((tmpl) => (
                    <motion.button
                      key={tmpl}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMessage(tmpl)}
                      className="text-sm px-5 py-2.5 rounded-full border-2 border-black/5 hover:border-[#25D366] hover:bg-[#25D366]/5 transition-all font-bold whitespace-nowrap"
                    >
                      {tmpl}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenWhatsApp}
                  disabled={!phoneNumber}
                  className="flex-grow py-6 px-10 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#1eb856] hover:to-[#0f766a] text-white rounded-[1.5rem] font-black flex items-center justify-center gap-3 transition-all shadow-2xl shadow-green-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-xl group"
                >
                  {t.btnSend}
                  <ExternalLink size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(37, 211, 102, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyLink}
                  disabled={!phoneNumber}
                  className="sm:w-1/3 py-6 px-8 border-2 border-slate-200 text-[#25D366] hover:text-[#128C7E] rounded-[1.5rem] font-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {copyStatus ? <><Check size={24} strokeWidth={3} /> {t.btnCopied}</> : <><Copy size={24} strokeWidth={3} /> {t.btnCopy}</>}
                </motion.button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 px-6 py-4 opacity-80">
            <WhyBadge icon={<ShieldCheck />} text={t.trustBarNoLogs} />
            <WhyBadge icon={<Lock />} text={t.trustBarSecure} />
            <WhyBadge icon={<Zap />} text={t.trustBarOpen} />
          </div>
        </motion.div>

        {/* Sidebar Area */}
        <motion.div variants={fadeInUp} className="lg:col-span-4 space-y-8">
          <motion.div whileHover={{ y: -5 }} className="glass p-8 rounded-[2.5rem] flex flex-col items-center text-center space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#25D366]/40 to-transparent"></div>
            <div className="p-4 bg-[#25D366]/10 rounded-2xl">
              <QrCode size={32} className="text-[#25D366]" />
            </div>
            <div>
              <h3 className="text-xl font-black mb-1">{t.sidebarQRTitle}</h3>
              <p className="text-sm font-medium text-slate-700">{t.sidebarQRDesc}</p>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-inner inline-block border-8 border-slate-50">
              <AnimatePresence mode="wait">
                {phoneNumber ? (
                  <motion.img
                    key="qr"
                    initial={{ opacity: 0, rotateY: 90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: -90 }}
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(waLink)}`}
                    alt="QR Code"
                    className="w-40 h-40 md:w-48 md:h-48"
                  />
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-40 h-40 md:w-48 md:h-48 bg-slate-100 flex flex-col items-center justify-center gap-3 text-slate-300">
                    <QrCode size={48} />
                    <span className="text-xs uppercase tracking-[0.2em] font-black">{t.qrInputNumber}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-sm font-bold text-slate-900 px-4">{t.qrMarketingNote}</p>
            <button onClick={() => phoneNumber && window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(waLink)}`, '_blank')} disabled={!phoneNumber} className="text-sm font-black text-[#25D366] hover:underline disabled:opacity-30">
              {t.qrDownload}
            </button>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="glass p-8 rounded-[2.5rem] flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-emerald-500" />
                <h3 className="text-xl font-black">{t.sidebarRecentTitle}</h3>
              </div>
              {recentContacts.length > 0 && <button onClick={handleClearHistory} className="text-sm text-red-500 hover:text-red-600 font-bold">{t.sidebarRecentClear}</button>}
            </div>

            <AnimatePresence mode="popLayout">
              {recentContacts.length > 0 ? (
                <motion.div layout className="space-y-4">
                  {recentContacts.map((contact) => (
                    <motion.div
                      layout
                      key={contact.id}
                      variants={itemReveal}
                      initial="initial" animate="animate" exit={{ opacity: 0, x: 20 }}
                      className="group flex items-center justify-between p-4 bg-black/5 rounded-2xl border-2 border-transparent hover:border-[#25D366]/30 transition-all cursor-pointer"
                      onClick={() => {
                        const parts = contact.number.split(' ');
                        const dCode = parts[0].replace('+', '');
                        const pNum = parts.slice(1).join('');
                        const foundCountry = COUNTRIES.find(c => c.dialCode === dCode);
                        if (foundCountry) setSelectedCountry(foundCountry);
                        setPhoneNumber(pNum);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-lg font-bold">{contact.number}</span>
                        <span className="text-xs text-slate-600 font-medium">{new Date(contact.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <ExternalLink size={18} className="text-slate-600 group-hover:text-[#25D366] transition-colors" />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                  <UserPlus size={40} className="text-slate-200 mb-4" />
                  <p className="text-sm text-slate-600 font-medium px-6">{t.sidebarRecentEmpty}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>

      <SectionWrapper title="How to use Circlebunch">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
          <StepCard num="1" icon={<Globe />} title="Select Country" desc="Choose the destination country to automatically apply the correct dial code." />
          <StepCard num="2" icon={<ListOrdered />} title="Enter Phone Number" desc="Type the WhatsApp number you want to reach without any symbols or spaces." />
          <StepCard num="3" icon={<Navigation />} title="Start Chat" desc="Optionally type a message and hit send to open WhatsApp immediately." />
        </div>
      </SectionWrapper>

      <section className="mt-28 bg-black/5 p-12 md:p-20 rounded-[3.5rem] border border-black/5">
        <h2 className="text-4xl font-black text-center mb-16 tracking-tight">Why Choose Circlebunch?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          <WhyItem icon={<ZapOff />} title="No Junk Contacts" desc="Keep your phone book for friends and family, not one-time delivery calls." />
          <WhyItem icon={<ShieldCheck />} title="Privacy First" desc="We never track your activity or store the numbers you message." />
          <WhyItem icon={<Clock />} title="Save Time" desc="Skip the 'Save Contact' screen and get straight to the conversation." />
          <WhyItem icon={<Layout />} title="Universal Design" desc="Beautiful interface that works perfectly across all your devices." />
        </div>
      </section>

      <div className="mt-28 py-16 px-8 glass rounded-[3.5rem] shadow-2xl border-emerald-500/10 grid grid-cols-1 md:grid-cols-3 gap-12 text-center relative overflow-hidden">
        <StatItem val="1.2M+" label={t.statsMessages} />
        <StatItem val="150+" label={t.statsCountries} />
        <StatItem val="99.9%" label={t.statsUsers} />
      </div>

      <div className="mt-28 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <FeatureCard icon={<UserPlus className="text-emerald-500" />} title={t.feature1Title} desc={t.feature1Desc} />
        <FeatureCard icon={<ShieldCheck className="text-blue-500" />} title={t.feature2Title} desc={t.feature2Desc} />
        <FeatureCard icon={<Globe className="text-orange-500" />} title={t.feature3Title} desc={t.feature3Desc} />
      </div>

      <SectionWrapper title={t.testimonialHeader}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <TestimonialCard name="Sarah J." role="Freelancer" text="Essential tool for my work. I message dozens of clients daily without cluttering my contacts." />
          <TestimonialCard name="Marco P." role="Sales Lead" text="The QR code generator is a game changer for our physical networking events." />
          <TestimonialCard name="Ling W." role="Dev" text="Finally a WhatsApp direct tool that looks premium and respects privacy. No ads is a plus!" />
        </div>
      </SectionWrapper>

      <SectionWrapper title={t.faqTitle} maxWidth="max-w-4xl">
        <div className="space-y-6">
          {t.faqs.map((faq, idx) => (
            <FaqItem key={idx} faq={faq} isOpen={openFaqs.includes(idx)} onToggle={() => toggleFaq(idx)} />
          ))}
        </div>
      </SectionWrapper>
    </motion.div>
  );

  const renderPrivacy = () => (
    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass p-12 rounded-[3rem] space-y-8 max-w-4xl mx-auto shadow-2xl">
      <h1 className="text-5xl font-black tracking-tight">Privacy Policy</h1>
      <p className="text-lg text-slate-500">Last updated: October 2023</p>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">1. Introduction</h2>
        <p className="leading-relaxed text-slate-400">Circlebunch ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we handle information when you use our website. We are committed to ensuring that your privacy is protected.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">2. Data We Don't Collect</h2>
        <p className="leading-relaxed text-slate-700">Unlike other services, Circlebunch does <strong>not</strong> store your phone numbers, messages, or contact history on our servers. All processing happens locally in your web browser.</p>
      </section>
      <button onClick={() => setCurrentPage('home')} className="mt-8 font-black text-[#25D366] flex items-center gap-2 hover:gap-4 transition-all group">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
      </button>
    </motion.div>
  );

  const renderTerms = () => (
    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass p-12 rounded-[3rem] space-y-8 max-w-4xl mx-auto shadow-2xl">
      <h1 className="text-5xl font-black tracking-tight">Terms of Service</h1>
      <p className="text-lg text-slate-800">Last updated: October 2023</p>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
        <p className="leading-relaxed text-slate-700">By accessing and using Circlebunch, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
      </section>
      <button onClick={() => setCurrentPage('home')} className="mt-8 font-black text-[#25D366] flex items-center gap-2 hover:gap-4 transition-all group">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
      </button>
    </motion.div>
  );

  const renderAbout = () => (
    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass p-12 rounded-[3rem] space-y-12 max-w-4xl mx-auto text-center shadow-2xl">
      <motion.div variants={scaleIn} className="w-24 h-24 bg-[#25D366] rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-green-500/30">
        <Info size={48} strokeWidth={2.5} />
      </motion.div>
      <h1 className="text-5xl font-black tracking-tight">About Circlebunch</h1>
      <p className="text-2xl text-slate-800 leading-relaxed max-w-2xl mx-auto">We believe that starting a conversation shouldn't require a permanent commitment to your contact list.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
        <motion.div whileHover={{ scale: 1.02 }} className="p-8 bg-black/5 rounded-[2rem] space-y-4">
          <h3 className="text-xl font-bold">The Problem</h3>
          <p className="text-slate-700">Our phone books are filled with temporary contacts. This clutter makes it harder to find the people who actually matter.</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="p-8 bg-black/5 rounded-[2rem] space-y-4">
          <h3 className="text-xl font-bold">The Solution</h3>
          <p className="text-slate-700">Circlebunch provides a premium gateway to WhatsApp direct messaging. No registration, no clutter.</p>
        </motion.div>
      </div>
      <button onClick={() => setCurrentPage('home')} className="mx-auto mt-12 font-black text-[#25D366] flex items-center gap-2 hover:gap-4 transition-all group">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
      </button>
    </motion.div>
  );

  const renderContact = () => (
    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass p-12 rounded-[3rem] space-y-8 max-w-4xl mx-auto shadow-2xl">
      <h1 className="text-5xl font-black tracking-tight">Contact Us</h1>
      <p className="text-xl text-slate-800">Have questions, feedback, or need help? We're here for you.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500"><Mail size={28} /></div>
            <div><p className="text-sm font-bold uppercase text-slate-700">Email Us</p><p className="text-xl font-black">support@circlebunch.com</p></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500"><Linkedin size={28} /></div>
            <div><p className="text-sm font-bold uppercase text-slate-700">Social</p><p className="text-xl font-black">@circlebunch</p></div>
          </div>
        </div>
      </div>
      <button onClick={() => setCurrentPage('home')} className="mt-12 font-black text-[#25D366] flex items-center gap-2 hover:gap-4 transition-all group">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[180px] opacity-40 bg-emerald-200"
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[180px] opacity-30 bg-green-200"
        />
      </div>

      <nav className="sticky top-0 z-50 px-6 py-4 glass mb-6 border-b shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 bg-[#25D366] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-green-500/30">
              <Send size={24} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">{t.navTitle}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage('business-qr-generator')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
              currentPage === 'business-qr-generator'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'hover:bg-black/5 text-slate-600 hover:text-emerald-600'
            }`}
          >
            <QrCode size={18} />
            <span className="hidden sm:inline">Business QR Generator</span>
          </motion.button>

        </div>
      </nav>

      <main className="flex-grow max-w-6xl mx-auto w-full px-6 pt-4 pb-20">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && renderHome()}
          {currentPage === 'privacy' && renderPrivacy()}
          {currentPage === 'terms' && renderTerms()}
          {currentPage === 'about' && renderAbout()}
          {currentPage === 'contact' && renderContact()}
          {currentPage === 'business-qr-generator' && <BusinessQrGenerator onNavigateHome={() => setCurrentPage('home')} />}
        </AnimatePresence>
      </main>

      <footer className="glass border-t mt-20 py-16 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1 space-y-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('home')}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-[#25D366] rounded-xl flex items-center justify-center text-white">
                  <Send size={20} strokeWidth={2.5} />
                </div>
                <span className="text-xl font-black tracking-tight">{t.navTitle}</span>
              </motion.button>
              <p className="text-sm font-bold text-slate-600 leading-relaxed">{t.footerTagline}</p>
              <div className="flex gap-4">
                <SocialShareBtn icon={<Twitter size={20} />} onClick={() => handleShare('twitter')} />
                <SocialShareBtn icon={<Facebook size={20} />} onClick={() => handleShare('facebook')} />
                <SocialShareBtn icon={<Linkedin size={20} />} onClick={() => handleShare('linkedin')} />
              </div>
            </div>

            <FooterCol title="Company" links={[{ label: 'About Us', action: () => setCurrentPage('about') }, { label: 'Contact Us', action: () => setCurrentPage('contact') }]} />
            <FooterCol title="Legal" links={[{ label: 'Privacy Policy', action: () => setCurrentPage('privacy') }, { label: 'Terms of Service', action: () => setCurrentPage('terms') }]} />
            <FooterCol title="Tools" links={[{ label: 'WA Direct', action: () => setCurrentPage('home') }, { label: 'WhatsApp Web', url: 'https://wa.me' }]} />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-black/5 text-slate-600 text-sm font-bold">
            <div className="flex items-center gap-1">
              {t.footerMadeWith} <span className="text-red-500">❤️</span> by{' '}
              <a
                href="https://www.linkedin.com/in/vipulsingh97/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#25D366] hover:underline transition-all"
              >
                Vipul Singh
              </a>
            </div>
            <div>&copy; {new Date().getFullYear()} Circlebunch. All rights reserved.</div>
          </div>
        </div>
      </footer>

      {/* Language Switcher */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end">
        <AnimatePresence>
          {isLanguageOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="mb-6 w-64 glass rounded-[2rem] shadow-3xl overflow-hidden py-3 border-2 border-white"
            >
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code as Locale)}
                  className={`w-full flex items-center justify-between px-6 py-4 hover:bg-[#25D366]/10 transition-colors text-left text-base ${locale === lang.code ? 'text-emerald-500 font-black bg-emerald-500/5' : 'font-bold'}`}
                >
                  <div className="flex flex-col">
                    <span>{lang.native}</span>
                    <span className="text-xs text-slate-600 font-medium">{lang.name}</span>
                  </div>
                  {locale === lang.code && <Check size={20} strokeWidth={3} className="text-emerald-500" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsLanguageOpen(!isLanguageOpen)}
          className="w-20 h-20 rounded-[1.75rem] bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-3xl shadow-indigo-500/40 border-4 border-white transition-all relative"
        >
          {isLanguageOpen ? <Check size={36} strokeWidth={3} /> : <Languages size={36} strokeWidth={3} />}
          <span className="absolute -top-2 -right-2 flex h-8 w-12 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white shadow-lg border-2 border-white uppercase">
            {locale.split('-')[0]}
          </span>
        </motion.button>
      </div>
    </div>
  );
};

// Sub-components with animations
const SectionWrapper: React.FC<{ title: string, children: React.ReactNode, maxWidth?: string }> = ({ title, children, maxWidth = "max-w-6xl" }) => (
  <motion.section
    initial="initial"
    whileInView="animate"
    viewport={{ once: true, margin: "-100px" }}
    variants={fadeInUp}
    className={`mt-28 relative z-10 mx-auto ${maxWidth}`}
  >
    <h2 className="text-4xl font-black text-center mb-16 tracking-tight">{title}</h2>
    {children}
  </motion.section>
);

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
  <motion.div
    whileHover={{ y: -10, scale: 1.02 }}
    className="glass p-10 rounded-[3rem] text-center flex flex-col items-center gap-6 shadow-lg hover:shadow-2xl transition-all"
  >
    <motion.div
      variants={scaleIn}
      className="w-20 h-20 bg-black/5 rounded-[2rem] flex items-center justify-center"
    >
      {React.cloneElement(icon as React.ReactElement, { size: 40 })}
    </motion.div>
    <h3 className="text-2xl font-black tracking-tight">{title}</h3>
    <p className="text-base text-slate-700 font-medium leading-relaxed">{desc}</p>
  </motion.div>
);

const TestimonialCard: React.FC<{ name: string, role: string, text: string }> = ({ name, role, text }) => (
  <motion.div
    whileHover={{ scale: 1.05, y: -5 }}
    className="glass p-8 rounded-[2.5rem] space-y-6 shadow-lg"
  >
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="#25D366" className="text-[#25D366]" />)}
    </div>
    <p className="text-lg italic font-medium text-slate-800 leading-relaxed">"{text}"</p>
    <div className="flex items-center gap-4 border-t border-black/5 pt-6">
      <div className="w-12 h-12 rounded-2xl bg-[#25D366]/20 flex items-center justify-center text-[#25D366] font-black text-lg uppercase">{name[0]}</div>
      <div className="flex flex-col">
        <span className="text-base font-black">{name}</span>
        <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">{role}</span>
      </div>
    </div>
  </motion.div>
);

const StepCard: React.FC<{ num: string, icon: React.ReactNode, title: string, desc: string }> = ({ num, icon, title, desc }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    className="relative glass p-10 pt-14 rounded-[3.5rem] text-center space-y-6 border-white/40 shadow-xl"
  >
    <motion.div
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
      className="absolute top-0 left-0 -mt-5 -ml-4 w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl z-20"
    >
      {num}
    </motion.div>
    <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto text-[#25D366]">
      {React.cloneElement(icon as React.ReactElement, { size: 40, strokeWidth: 2 })}
    </div>
    <div className="space-y-4">
      <h3 className="text-2xl font-black tracking-tight">{title}</h3>
      <p className="text-slate-700 font-medium leading-relaxed px-2">{desc}</p>
    </div>
  </motion.div>
);

const WhyItem: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
  <motion.div whileHover={{ scale: 1.05 }} className="text-center space-y-4">
    <div className="text-[#25D366] flex justify-center">
      {React.cloneElement(icon as React.ReactElement, { size: 48, strokeWidth: 1.5 })}
    </div>
    <h3 className="text-xl font-black">{title}</h3>
    <p className="text-sm text-slate-700 font-medium leading-relaxed">{desc}</p>
  </motion.div>
);

const WhyBadge: React.FC<{ icon: React.ReactNode, text: string }> = ({ icon, text }) => (
  <div className="flex items-center gap-3 text-sm md:text-base font-bold text-slate-700">
    <span className="text-[#25D366]">{React.cloneElement(icon as React.ReactElement, { size: 20 })}</span>
    <span>{text}</span>
  </div>
);

const StatItem: React.FC<{ val: string, label: string }> = ({ val, label }) => (
  <div className="space-y-2">
    <motion.h4
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, type: "spring" }}
      className="text-5xl font-black text-[#25D366] tracking-tighter"
    >
      {val}
    </motion.h4>
    <p className="text-base font-bold text-slate-600 uppercase tracking-widest">{label}</p>
  </div>
);

const FaqItem: React.FC<{ faq: { question: string, answer: string }, isOpen: boolean, onToggle: () => void }> = ({ faq, isOpen, onToggle }) => (
  <div className="glass rounded-[2rem] overflow-hidden border-2 border-transparent hover:border-emerald-500/10 transition-all">
    <button onClick={onToggle} className="w-full flex items-center justify-between p-8 text-left hover:bg-black/5 transition-colors">
      <span className="text-xl font-bold">{faq.question}</span>
      <ChevronDown size={24} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="p-8 pt-0 text-lg text-slate-700 border-t border-black/5 leading-relaxed">{faq.answer}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const FooterCol: React.FC<{ title: string, links: { label: string, action?: () => void, url?: string }[] }> = ({ title, links }) => (
  <div className="space-y-6">
    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">{title}</h4>
    <ul className="space-y-3">
      {links.map(link => (
        <li key={link.label}>
          {link.url ? (
            <a href={link.url} target="_blank" rel="noopener" className="text-slate-600 hover:text-[#25D366] font-bold transition-colors">{link.label}</a>
          ) : (
            <button onClick={link.action} className="text-slate-600 hover:text-[#25D366] font-bold transition-colors">{link.label}</button>
          )}
        </li>
      ))}
    </ul>
  </div>
);

const SocialShareBtn: React.FC<{ icon: React.ReactNode, onClick: () => void }> = ({ icon, onClick }) => (
  <motion.button
    whileHover={{ y: -3, scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className="p-2 rounded-xl hover:bg-black/5 text-slate-600 hover:text-[#25D366] transition-all"
  >
    {icon}
  </motion.button>
);

export default App;
