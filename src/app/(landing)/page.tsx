"use client";

import { useEffect, useState } from "react";
import LandingHero from "@/components/ui-home/LandingHero";
import TripHighlight from "@/components/ui-home/TripHighlight";
import AboutUs from "@/components/ui-home/AboutUs";
import WhyChooseUs from "@/components/ui-home/WhyChooseUs";
import Testimonials from "@/components/ui-home/Testimonials";
import FAQ from "@/components/ui-home/FAQ";
import Gallery from "@/components/ui-home/Gallery";
import { Gallery as GalleryType } from "@/types/galleries";
import { apiRequest } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const [galleryData, setGalleryData] = useState<GalleryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchGalleryData = async () => {
      try {
        const response = await apiRequest<unknown>(
          "GET",
          "/api/landing-page/gallery"
        );
        
        // Handle different response formats
        let galleryData: GalleryType[] = [];
        
        if (Array.isArray(response)) {
          // Response is directly an array
          galleryData = response as GalleryType[];
        } else if (response && typeof response === 'object' && 'data' in response) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const responseData = (response as any).data;
          if (Array.isArray(responseData)) {
            // Response has data property that is an array
            galleryData = responseData;
          } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nestedData = (responseData as any).data;
            if (Array.isArray(nestedData)) {
              // Response has nested data structure
              galleryData = nestedData;
            }
          }
        }
        
        if (galleryData.length === 0) {
          console.error("Invalid gallery data format:", response);
        }
        
        setGalleryData(galleryData);
      } catch (error) {
        console.error("Error fetching gallery data:", error);
        setGalleryData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGalleryData();
  }, []);

  const formattedGalleryData = Array.isArray(galleryData)
    ? galleryData
        .filter(item => item.status === "Aktif" && item.assets?.[0]?.file_url)
        .map((gallery) => ({
          id: gallery.id,
          title: gallery.title,
          description: gallery.description || 'No Description',
          category: gallery.category || 'Uncategorized',
          assets: gallery.assets ?? []
        }))
    : [];

  return (
    <>
      <LandingHero />
      <TripHighlight />
      <AboutUs />
      <WhyChooseUs />
      {isLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      ) : formattedGalleryData.length === 0 ? (
        <div className="text-center py-10 text-gray-500">{t('noGalleryData')}</div>
      ) : (
        <Gallery data={formattedGalleryData} />
      )}
      <Testimonials />
      <FAQ />
    </>
  );
}
