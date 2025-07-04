// components/ui/TripHighlight.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Trip {
  id: number;
  name: string;
  type: string;
  is_highlight: string;
  status: string;
  assets: {
    id: number;
    file_url: string;
    is_external: boolean;
  }[];
  trip_durations: {
    id: number;
    duration_label: string;
    duration_days: string;
    duration_nights: string;
    status: string;
    trip_prices: {
      id: number;
      trip_duration_id: string;
      pax_min: string;
      pax_max: string;
      price_per_pax: string;
      status: string;
      region: string;
    }[];
  }[];
}

interface TripResponse {
  data: Trip[];
  message?: string;
  status?: string;
}

// Gaya kustom untuk efek shadow dan transisi
const customStyles = `
  .text-shadow-nike {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7), 0 0 10px rgba(0, 0, 0, 0.5);
  }
  .custom-card {
    padding: 0 !important;
    transition: box-shadow 0.3s ease-in-out;
  }
  .custom-card:hover {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  }
  .hover-text {
    color: white;
    transition: color 0.8s ease-in-out 0.4s, top 2s ease-in-out, bottom 2s ease-in-out, opacity 0.8s ease-in-out;
  }
  .hover-text.hovered {
    color: #CFB53B;
  }
  .hover-text-top {
    margin-bottom: 0;
    line-height: 1;
  }
  .hover-text-bottom {
    margin-top: 0;
    line-height: 1;
  }
  .trip-overlay {
    background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
  }
  .trip-info {
    transform: translateY(100%);
    transition: transform 0.3s ease-in-out;
  }
  .group:hover .trip-info {
    transform: translateY(0);
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function TripHighlight() {
  const [highlights, setHighlights] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.4,
        duration: 1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const response = await apiRequest<TripResponse>(
          'GET',
          '/api/landing-page/trips?status=1&is_highlight=Yes'
        );
        console.log('Trip Highlight Response:', response);
        console.log('Trip Highlight Data:', response.data);
        console.log('Trip Highlight Data Type:', typeof response.data);
        console.log('Trip Highlight Data Length:', response.data?.length);
        if (response.data && response.data.length > 0) {
          console.log('First trip:', response.data[0]);
          console.log('First trip name:', response.data[0].name);
          console.log('First trip type:', response.data[0].type);
        }
        setHighlights(response.data || []);
      } catch (error) {
        console.error('Error fetching highlighted trips:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHighlights();
  }, []);

  if (loading) {
    return (
      <section className="p-4 py-10 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">{t('tripHighlightTitle')}</h2>
            <p className="text-muted-foreground mt-2">{t('loading')}</p>
          </div>
        </div>
      </section>
    );
  }

  console.log('Highlights to render:', highlights);
  console.log('Highlights count:', highlights.length);

  return (
    <section className="p-4 py-10 bg-gray-50">
      <style>{customStyles}</style>
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-6"
        >
          <h2 className="text-3xl font-bold text-gray-800">{t('tripHighlightTitle')}</h2>
          <p className="text-gray-600 mt-2">{t('tripHighlightSubtitle')}</p>
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
        >
          {highlights.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">{t('noData')}</p>
            </div>
          ) : (
            highlights.map((highlight) => {
              console.log('Rendering highlight:', highlight);
              const imageUrl = highlight.assets?.[0]?.file_url 
                ? `${API_URL}${highlight.assets[0].file_url}`
                : '/images/placeholder.jpg';

              return (
                <motion.div
                  key={highlight.id}
                  variants={item}
                >
                  <Link
                    href={`/detail-paket/${
                      highlight.type === "Open Trip" ? "open-trip" : "private-trip"
                    }?id=${highlight.id}`}
                    className="aspect-[3/2] block group"
                  >
                    <Card
                      className="custom-card rounded-tr-sm overflow-hidden cursor-pointer h-full"
                    >
                      <CardContent className="p-0 relative h-full">
                        <motion.div 
                          className="relative w-full h-full"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                          <Image
                            src={imageUrl}
                            alt={highlight.name}
                            fill
                            className="object-cover rounded-sm"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            quality={100}
                          />
                          <div className="absolute inset-0 trip-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute bottom-0 left-0 right-0 p-4 trip-info">
                            <h3 className="text-white text-sm font-semibold text-center line-clamp-2 mb-2">
                              {highlight.name || 'Trip Name'}
                            </h3>
                            <Badge className="mt-2 bg-gold text-white text-xs">
                              {highlight.type || 'Trip Type'}
                            </Badge>
                          </div>
                        </motion.div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </section>
  );
}
