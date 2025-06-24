"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Translation data
const translations = {
  en: {
    // Navigation
    home: "Home",
    packages: "Packages",
    openTrip: "Open Trip",
    privateTrip: "Private Trip",
    gallery: "Gallery",
    blog: "Blog",
    aboutUs: "About Us",
    login: "Login",
    register: "Register",
    logout: "Logout",
    dashboard: "Dashboard",
    myProfile: "My Profile",
    english: "English",
    indonesia: "Indonesia",
    
    // Hero Section
    heroTitle: "Discover the Beauty of Komodo Island",
    heroSubtitle: "Experience unforgettable adventures with the best tour services",
    heroButton: "Explore Packages",
    
    // Trip Highlight
    tripHighlightTitle: "Popular Trip Packages",
    tripHighlightSubtitle: "Choose the best package for your adventure",
    
    // About Us
    aboutTitle: "About Gong Komodo Tour",
    aboutSubtitle: "Your trusted travel partner for Komodo adventures",
    aboutDescription: "We are a professional tour service provider with years of experience in organizing memorable trips to Komodo Island and surrounding areas.",
    
    // Why Choose Us
    whyChooseTitle: "Why Choose Us",
    whyChooseSubtitle: "The best reasons to travel with us",
    bestService: "Best Tour Service Provider",
    bestServiceDesc: "We are a trusted tour service provider with over 10 years of experience in Bali's tourism industry.",
    experiencedGuides: "Experienced Tour Guides",
    experiencedGuidesDesc: "Our team consists of professional and experienced tour guides who will make your journey more meaningful.",
    affordablePackages: "Affordable Travel Packages",
    affordablePackagesDesc: "Enjoy quality vacation experiences with competitive and transparent pricing without hidden costs.",
    bestDestination: "Best Destination Experience",
    bestDestinationDesc: "We present the best tourist destinations in Bali with unforgettable experiences for every guest.",
    hassleFree: "Hassle-Free Vacation",
    hassleFreeDesc: "We take care of all your travel needs so you can enjoy your vacation without worries.",
    enjoyableExperience: "Enjoyable Vacation Experience",
    enjoyableExperienceDesc: "Every journey is designed to provide a fun and memorable vacation experience.",
    
    // Testimonials
    testimonialsTitle: "What Our Customers Say",
    testimonialsSubtitle: "Real experiences from our satisfied customers",
    
    // FAQ
    faqTitle: "Frequently Asked Questions",
    faqSubtitle: "Find answers to common questions about our services",
    
    // Gallery
    galleryTitle: "Photo Gallery",
    gallerySubtitle: "Beautiful moments captured during our tours",
    noGalleryData: "No gallery data available.",
    
    // Common
    loading: "Loading...",
    noData: "No data available.",
    readMore: "Read More",
    bookNow: "Book Now",
    viewDetails: "View Details",
    contactUs: "Contact Us",
    learnMore: "Learn More",
    hide: "Hide"
  },
  id: {
    // Navigation
    home: "Beranda",
    packages: "Paket",
    openTrip: "Open Trip",
    privateTrip: "Private Trip",
    gallery: "Galeri",
    blog: "Blog",
    aboutUs: "Tentang Kami",
    login: "Masuk",
    register: "Daftar",
    logout: "Keluar",
    dashboard: "Dashboard",
    myProfile: "Profil Saya",
    english: "English",
    indonesia: "Indonesia",
    
    // Hero Section
    heroTitle: "Jelajahi Keindahan Pulau Komodo",
    heroSubtitle: "Rasakan petualangan tak terlupakan dengan layanan tur terbaik",
    heroButton: "Jelajahi Paket",
    
    // Trip Highlight
    tripHighlightTitle: "Paket Perjalanan Populer",
    tripHighlightSubtitle: "Pilih paket terbaik untuk petualangan Anda",
    
    // About Us
    aboutTitle: "Tentang Gong Komodo Tour",
    aboutSubtitle: "Partner perjalanan terpercaya untuk petualangan Komodo",
    aboutDescription: "Kami adalah penyedia layanan tur profesional dengan pengalaman bertahun-tahun dalam mengorganisir perjalanan tak terlupakan ke Pulau Komodo dan sekitarnya.",
    
    // Why Choose Us
    whyChooseTitle: "Mengapa Memilih Kami",
    whyChooseSubtitle: "Alasan terbaik untuk bepergian bersama kami",
    bestService: "Penyedia Layanan Tur Terbaik",
    bestServiceDesc: "Kami adalah penyedia layanan tur terpercaya dengan pengalaman lebih dari 10 tahun di industri pariwisata Bali.",
    experiencedGuides: "Pemandu Wisata Berpengalaman",
    experiencedGuidesDesc: "Tim kami terdiri dari pemandu wisata profesional dan berpengalaman yang akan membuat perjalanan Anda lebih bermakna.",
    affordablePackages: "Paket Perjalanan Terjangkau",
    affordablePackagesDesc: "Nikmati pengalaman liburan berkualitas dengan harga kompetitif dan transparan tanpa biaya tersembunyi.",
    bestDestination: "Pengalaman Destinasi Terbaik",
    bestDestinationDesc: "Kami menghadirkan destinasi wisata terbaik di Bali dengan pengalaman tak terlupakan untuk setiap tamu.",
    hassleFree: "Liburan Tanpa Ribet",
    hassleFreeDesc: "Kami mengurus semua kebutuhan perjalanan Anda sehingga Anda bisa menikmati liburan tanpa khawatir.",
    enjoyableExperience: "Pengalaman Liburan Menyenangkan",
    enjoyableExperienceDesc: "Setiap perjalanan dirancang untuk memberikan pengalaman liburan yang menyenangkan dan tak terlupakan.",
    
    // Testimonials
    testimonialsTitle: "Apa Kata Pelanggan Kami",
    testimonialsSubtitle: "Pengalaman nyata dari pelanggan kami yang puas",
    
    // FAQ
    faqTitle: "Pertanyaan yang Sering Diajukan",
    faqSubtitle: "Temukan jawaban untuk pertanyaan umum tentang layanan kami",
    
    // Gallery
    galleryTitle: "Galeri Foto",
    gallerySubtitle: "Momen indah yang tertangkap selama tur kami",
    noGalleryData: "Tidak ada data galeri.",
    
    // Common
    loading: "Memuat...",
    noData: "Tidak ada data tersedia.",
    readMore: "Baca Selengkapnya",
    bookNow: "Pesan Sekarang",
    viewDetails: "Lihat Detail",
    contactUs: "Hubungi Kami",
    learnMore: "Pelajari Lebih Lanjut",
    hide: "Sembunyikan"
  }
};

type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('id');

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'id')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}; 