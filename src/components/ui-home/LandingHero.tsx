"use client";

import * as React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation, EffectFade } from "swiper/modules";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

// Impor gaya Swiper
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/effect-fade";

// Interface untuk data carousel dari database
interface CarouselItem {
  id: number;
  title: string;
  description: string;
  order_num: string;
  is_active: string;
  assets: Array<{
    id: number;
    title: string;
    description: string;
    file_url: string;
    original_file_url: string;
    is_external: boolean;
    file_path: string;
    created_at: string;
    updated_at: string;
  }>;
  primary_image: {
    id: number;
    title: string;
    description: string;
    file_url: string;
    original_file_url: string;
    is_external: boolean;
    file_path: string;
    created_at: string;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
}

// Gaya kustom untuk pagination bullets
const customStyles = `
  .swiper-pagination-bullet {
    width: 18px;
    height: 18px;
    background: var(--gold);
    opacity: 0.7;
    transition: all 0.3s ease;
  }
  .swiper-pagination-bullet-active {
    width: 25px;
    height: 25px;
    background: var(--gold);
    opacity: 1;
  }
  .swiper-button-next,
  .swiper-button-prev {
    color: var(--gold) !important;
    transition: all 0.3s ease;
  }
  .swiper-button-next:hover,
  .swiper-button-prev:hover {
    color: var(--gold-dark-10) !important;
  }
`;

export default function LandingHero() {
  const { t } = useLanguage();
  
  // State untuk menyimpan data carousels dari API
  const [carouselItems, setCarouselItems] = React.useState<CarouselItem[]>([]);
  
  // State untuk loading
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch carousel data from API when component mounts
  React.useEffect(() => {
    const fetchCarouselImages = async () => {
      try {
        const response = await fetch('/api/landing-page/carousels');
        if (response.ok) {
          const data = await response.json();
          if (data && data.data && data.data.length > 0) {
            // Filter hanya item yang aktif dan memiliki primary image
            const activeItems = data.data.filter((item: CarouselItem) => 
              item.is_active === '1' && item.primary_image
            );
            // Sort berdasarkan order_num
            const sortedItems = activeItems.sort((a: CarouselItem, b: CarouselItem) => 
              parseInt(a.order_num) - parseInt(b.order_num)
            );
            setCarouselItems(sortedItems);
          }
        }
      } catch (error) {
        console.error("Failed to fetch carousels images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCarouselImages();
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  return (
    <section className="relative h-[80vh] w-screen">
      <style>{customStyles}</style>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <span>Memuat carousel...</span>
        </div>
      ) : carouselItems.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span>Tidak ada gambar carousel tersedia.</span>
        </div>
      ) : (
        <Swiper
          modules={[Autoplay, Pagination, Navigation, EffectFade]}
          spaceBetween={0}
          slidesPerView={1}
          effect="fade"
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          pagination={{ clickable: true }}
          navigation
          className="h-full w-full"
        >
          {carouselItems.map((carouselItem) => (
            <SwiperSlide key={carouselItem.id}>
              <div
                className="h-full w-full bg-cover bg-center flex items-center justify-start px-50"
                style={{ 
                  backgroundImage: `url(${carouselItem.primary_image?.file_url || carouselItem.assets?.[0]?.file_url || '/img/default-trip.jpg'})` 
                }}
              >
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0 bg-black/20"
                />
                <motion.div 
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="relative z-10 px-4 flex flex-col items-start gap-2"
                >
                  {/* Baris pertama: GONG KOMODO */}
                  <motion.h1
                    variants={fadeInUp}
                    className="text-white uppercase font-bold text-center"
                    style={{
                      fontSize: "clamp(3rem, 4vw, 2.5rem)",
                      lineHeight: "1",
                    }}
                  >
                    GONG KOMODO
                  </motion.h1>
                  {/* Baris kedua: TOUR dan tombol */}
                  <motion.div 
                    variants={fadeInUp}
                    className="flex items-center gap-6"
                  >
                    <motion.h1
                      className="text-white uppercase font-bold text-center"
                      style={{
                        fontSize: "clamp(3rem, 4vw, 2.5rem)", // Reduced font size
                        lineHeight: "1",
                      }}
                    >
                      TOUR
                    </motion.h1>
                    <Link href="/paket/open-trip">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}

                      >
                        <Button
                          className="bg-gold text-white hover:bg-gold-dark-10 rounded-full"
                          style={{
                            fontSize: "clamp(2rem, 2.75vw, 1.75rem)",
                            padding: "clamp(2rem, 2.75vw, 1.5rem) clamp(2rem, 4.5vw, 2.75rem)",
                          }}
                        >
                          {t('heroButton')}
                        </Button>
                      </motion.div>
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
}
