"use client";

import DetailPaketOpenTrip from "@/components/ui-detail/DetailPaketOpenTrip";
import DetailPaketPrivateTrip from "@/components/ui-detail/DetailPaketPrivateTrip";
import DetailFAQ from "@/components/ui-detail/ui-call/DetailFAQ";
import DetailReview from "@/components/ui-detail/ui-call/DetailReview";
import DetailMoreTrip from "@/components/ui-detail/ui-call/DetailMoreTrip";
import DetailBlog from "@/components/ui-detail/ui-call/DetailBlog";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Trip, FlightSchedule } from "@/types/trips";
import { Boat } from "@/types/boats";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function untuk mendapatkan URL gambar
const getImageUrl = (fileUrl: string) => {
  if (!fileUrl || fileUrl.trim() === '') {
    return '/img/default-trip.jpg';
  }
  
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  
  if (fileUrl.startsWith('/img/') || fileUrl.startsWith('/_next/') || fileUrl.startsWith('/api/')) {
    return fileUrl;
  }
  
  const cleanUrl = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return `${API_URL}${cleanUrl}`;
};

interface ApiResponse {
  data: Trip;
}

interface SimilarTripsResponse {
  data: Trip[];
}

interface TripData {
  image: string;
  label: string;
  name: string;
  duration: string;
  priceIDR: string;
  slug: string;
}

interface PackageData {
  id: string;
  title: string;
  price: string;
  meetingPoint: string;
  destination: string;
  daysTrip: string;
  description: string;
  itinerary: {
    durationId: number;
    durationLabel: string;
    days: { day: string; activities: string }[];
  }[];
  information: string;
  boat: string;
  groupSize?: string;
  privateGuide?: string;
  images: string[];
  destinations?: number;
  include?: string[];
  exclude?: string[];
  session?: {
    highSeason: { period: string; price: string };
    peakSeason: { period: string; price: string };
  };
  flightInfo?: {
    guideFee1: string;
    guideFee2: string;
  };
  boatImages?: { image: string; title: string; id: string }[];
  mainImage?: string;
  flightSchedules?: FlightSchedule[];
  has_boat: boolean;
  destination_count: number;
  trip_durations: {
    id: number;
    duration_label: string;
    itineraries: { day: string; activities: string }[];
  }[];
  boat_ids?: number[];
  operational_days?: string[];
  tentation?: "Yes" | "No";
  note?: string;
}

interface BoatResponse {
  data: Boat[];
}

type TripType = "open-trip" | "private-trip";

export default function DetailTrip() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const packageId = searchParams.get("id");
  
  // Tentukan type dari path (open-trip atau private-trip)
  // Path akan seperti: /detail-paket/open-trip atau /detail-paket/private-trip
  const getTypeFromPath = (): TripType => {
    if (pathname?.includes("open-trip")) {
      return "open-trip";
    } else if (pathname?.includes("private-trip")) {
      return "private-trip";
    }
    // Fallback: ambil dari query param jika ada
    const tripTypeParam = searchParams.get("type") as TripType | null;
    return tripTypeParam || "open-trip";
  };
  
  const [selectedPackage, setSelectedPackage] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarTrips, setSimilarTrips] = useState<TripData[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [displayType, setDisplayType] = useState<TripType>(getTypeFromPath());

  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!packageId) {
        setError("ID paket tidak ditemukan");
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest<ApiResponse>(
          "GET",
          `/api/landing-page/trips/${packageId}`
        );

        if (!response?.data) {
          throw new Error("Data trip tidak valid");
        }

        setSelectedPackage(response.data);

        // Tentukan display type: prioritas path > query param > trip.type
        const pathType = getTypeFromPath();
        const tripType = response.data.type;
        let finalDisplayType: TripType;
        
        // Prioritas: path > query param > trip.type
        if (pathname?.includes("open-trip") || pathname?.includes("private-trip")) {
          finalDisplayType = pathType;
        } else {
          const tripTypeParam = searchParams.get("type") as TripType | null;
          if (tripTypeParam) {
            finalDisplayType = tripTypeParam;
          } else {
            // Fallback ke trip.type
            finalDisplayType = tripType === "Open Trip" ? "open-trip" : "private-trip";
          }
        }
        
        setDisplayType(finalDisplayType);

        // Fetch similar trips berdasarkan display type
        const similarType = finalDisplayType === "open-trip" ? "open" : "private";
        const similarResponse = await apiRequest<SimilarTripsResponse>(
          "GET",
          `/api/landing-page/trips?status=1&type=${similarType}`
        );
        
        if (similarResponse?.data) {
          const similarTripsData = similarResponse.data
            .filter((trip: Trip) => trip.id !== response.data.id)
            .slice(0, 3)
            .map((trip: Trip) => {
              const firstAsset = trip.assets?.[0];
              let imageUrl = "/img/default-trip.jpg";
              
              if (firstAsset) {
                if (firstAsset.original_file_url) {
                  imageUrl = getImageUrl(firstAsset.original_file_url);
                } else if (firstAsset.file_url && !firstAsset.file_url.includes('placeholder')) {
                  imageUrl = getImageUrl(firstAsset.file_url);
                }
              }
              
              return {
                image: imageUrl,
                label: trip.type || (finalDisplayType === "open-trip" ? "Open Trip" : "Private Trip"),
                name: trip.name || "Trip Name",
                duration:
                  trip.trip_durations?.[0]?.duration_label || "Custom Duration",
                priceIDR: trip.trip_durations?.[0]?.trip_prices?.[0]
                  ?.price_per_pax
                  ? `IDR ${parseInt(
                      String(trip.trip_durations[0].trip_prices[0].price_per_pax)
                    ).toLocaleString("id-ID")}/pax`
                  : "Price not available",
                slug: trip.id?.toString() || "",
              };
            });
          setSimilarTrips(similarTripsData);
        }

        // Fetch boats data
        const boatsResponse = await apiRequest<BoatResponse>(
          "GET",
          "/api/landing-page/boats"
        );
        if (boatsResponse?.data) {
          setBoats(boatsResponse.data);
        }
      } catch (error) {
        console.error("Error fetching trip details:", error);
        setError("Gagal memuat detail trip");
      } finally {
        setLoading(false);
      }
    };

    fetchTripDetails();
  }, [packageId, pathname, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (error || !selectedPackage) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-800">
          {error || "Paket Tidak Ditemukan"}
        </h1>
        <p className="text-gray-600">
          Mohon maaf, paket yang Anda cari tidak ditemukan.
        </p>
        <Link href="/">
          <button className="mt-4 bg-[#CFB53B] text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-[#7F6D1F] hover:scale-95 transition-all duration-300">
            Kembali ke Beranda
          </button>
        </Link>
      </div>
    );
  }

  // Transform data dari API ke format yang diharapkan oleh komponen
  const transformedData: PackageData = {
    id: selectedPackage.id?.toString() || "",
    title: selectedPackage.name || "Nama Trip",
    price: selectedPackage.trip_durations?.[0]?.trip_prices?.[0]?.price_per_pax
      ? `IDR ${selectedPackage.trip_durations[0].trip_prices[0].price_per_pax.toLocaleString(
          "id-ID"
        )}/pax`
      : "Harga belum tersedia",
    meetingPoint:
      selectedPackage.meeting_point || "Meeting point belum ditentukan",
    destination: selectedPackage.name || "Destinasi",
    daysTrip:
      selectedPackage.trip_durations?.[0]?.duration_label || "Custom Duration",
    description: selectedPackage.note || "Deskripsi belum tersedia",
    itinerary:
      selectedPackage.trip_durations?.map((duration) => ({
        durationId: duration.id,
        durationLabel: duration.duration_label,
        days:
          duration.itineraries?.map((itinerary) => ({
            day: `Day ${itinerary.day_number}`,
            activities: itinerary.activities
              .split("\n")
              .filter((activity) => activity.trim())
              .join("<br>"),
          })) || [],
      })) || [],
    trip_durations:
      selectedPackage.trip_durations?.map((duration) => ({
        id: duration.id,
        duration_label: duration.duration_label,
        itineraries:
          duration.itineraries?.map((itinerary) => ({
            day: `Day ${itinerary.day_number}`,
            activities: itinerary.activities
              .split("\n")
              .filter((activity) => activity.trim())
              .join("<br>"),
          })) || [],
      })) || [],
    information: selectedPackage.note || "Informasi belum tersedia",
    boat: "Speed Boat",
    groupSize: "10-15 people",
    images:
      selectedPackage.assets
        ?.map((asset) => {
          if (asset.original_file_url) {
            return getImageUrl(asset.original_file_url);
          }
          if (asset.file_url && !asset.file_url.includes('placeholder')) {
            return getImageUrl(asset.file_url);
          }
          return null;
        })
        .filter((url): url is string => url !== null) || [],
    destinations: selectedPackage.destination_count || 0,
    include:
      selectedPackage.include?.split("\n").filter((item) => item.trim()) || [],
    exclude:
      selectedPackage.exclude?.split("\n").filter((item) => item.trim()) || [],
    mainImage: (() => {
      const firstAsset = selectedPackage.assets?.[0];
      if (!firstAsset) {
        return "/img/default-trip.jpg";
      }
      
      if (firstAsset.original_file_url) {
        return getImageUrl(firstAsset.original_file_url);
      }
      if (firstAsset.file_url && !firstAsset.file_url.includes('placeholder')) {
        return getImageUrl(firstAsset.file_url);
      }
      return "/img/default-trip.jpg";
    })(),
    flightSchedules: selectedPackage.flight_schedules || [],
    has_boat: selectedPackage.has_boat || false,
    destination_count: selectedPackage.destination_count || 0,
    boat_ids: selectedPackage.boat_ids || [],
    operational_days: selectedPackage.operational_days || [],
    tentation: selectedPackage.tentation === "Yes" ? "Yes" : "No",
    flightInfo: {
      guideFee1:
        selectedPackage.additional_fees
          ?.find(
            (fee) =>
              fee.fee_category === "Guide Fee" && fee.unit === "per_day_guide"
          )
          ?.price?.toString() || "0",
      guideFee2:
        selectedPackage.additional_fees
          ?.find(
            (fee) =>
              fee.fee_category === "Guide Fee" && fee.unit === "per_5pax"
          )
          ?.price?.toString() || "0",
    },
    session: {
      highSeason: {
        period: selectedPackage.surcharges?.find(
          (s) => s.season === "High Season"
        )
          ? `${
              selectedPackage.surcharges.find((s) => s.season === "High Season")
                ?.start_date
            } ~ ${
              selectedPackage.surcharges.find((s) => s.season === "High Season")
                ?.end_date
            }`
          : "Not specified",
        price: selectedPackage.surcharges?.find(
          (s) => s.season === "High Season"
        )
          ? `IDR ${parseInt(
              selectedPackage.surcharges
                .find((s) => s.season === "High Season")
                ?.surcharge_price?.toString() || "0"
            ).toLocaleString("id-ID")}/pax`
          : "Not specified",
      },
      peakSeason: {
        period: selectedPackage.surcharges?.find(
          (s) => s.season === "Peak Season"
        )
          ? `${
              selectedPackage.surcharges.find((s) => s.season === "Peak Season")
                ?.start_date
            } ~ ${
              selectedPackage.surcharges.find((s) => s.season === "Peak Season")
                ?.end_date
            }`
          : "Not specified",
        price: selectedPackage.surcharges?.find(
          (s) => s.season === "Peak Season"
        )
          ? `IDR ${parseInt(
              selectedPackage.surcharges
                .find((s) => s.season === "Peak Season")
                ?.surcharge_price?.toString() || "0"
            ).toLocaleString("id-ID")}/pax`
          : "Not specified",
      },
    },
    boatImages: boats
      .filter(boat => selectedPackage.boat_ids?.includes(boat.id))
      .map((boat) => {
        const firstAsset = boat.assets?.[0];
        let imageUrl = "/img/default-trip.jpg";
        
        if (firstAsset) {
          if (firstAsset.original_file_url) {
            imageUrl = getImageUrl(firstAsset.original_file_url);
          } else if (firstAsset.file_url && !firstAsset.file_url.includes('placeholder')) {
            imageUrl = getImageUrl(firstAsset.file_url);
          }
        }
        
        return {
          image: imageUrl,
          title: boat.boat_name,
          id: boat.id.toString(),
        };
      }),
    note: selectedPackage.note,
  };

  return (
    <div>
      {/* Detail Paket - Render berdasarkan display type */}
      {displayType === "open-trip" ? (
        <DetailPaketOpenTrip data={transformedData} />
      ) : (
        <DetailPaketPrivateTrip data={transformedData} />
      )}

      {/* Review Section */}
      <DetailReview />

      {/* More Trip Section - Menggunakan display type */}
      <DetailMoreTrip trips={similarTrips} tripType={displayType} />

      {/* Section Latest Post dan FAQ */}
      <div className="px-4 py-12 md:flex md:space-x-6">
        {/* Latest Post */}
        <div className="md:w-1/2 mb-6 md:mb-0">
          <DetailBlog />
        </div>
        {/* FAQ */}
        <div className="md:w-1/2">
          <DetailFAQ />
        </div>
      </div>
    </div>
  );
}

