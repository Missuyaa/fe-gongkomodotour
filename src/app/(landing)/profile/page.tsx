"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logo from "../../../../public/img/logo.png";
import { Card } from "@/components/ui/card";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { motion } from "framer-motion";
import { User, Mail, MapPin, Phone, Globe, Calendar, Shield, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Inisialisasi daftar negara
countries.registerLocale(enLocale);
const countryList = countries.getNames("en", { select: "official" });
const countryOptions = Object.entries(countryList).map(([code, name]) => ({
  value: code,
  label: name,
}));

// Helper untuk mendapatkan nama negara dari country code
function getCountryName(countryCode: string): string {
  if (!countryCode) return "";
  const country = countryOptions.find(opt => opt.value === countryCode.toUpperCase());
  return country ? country.label : countryCode;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  customer?: {
    id: number;
    user_id: number;
    alamat: string;
    no_hp: string;
    nasionality: string;
    region: "domestic" | "overseas";
    status: string;
    created_at: string;
    updated_at: string;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();

  // Load user data from localStorage
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const userDataString = localStorage.getItem('user');
    if (!userDataString) {
      router.push('/auth/login');
      return;
    }

    try {
      const data = JSON.parse(userDataString);
      setUserData(data);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gold/5 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            Profile Saya
          </h1>
          <p className="text-lg text-gray-600">
            Informasi akun dan profil Anda
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="p-6 bg-gradient-to-br from-gold/10 to-gold/5 border-2 border-gold/20 shadow-lg">
              {/* Avatar Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-gold-dark-20 flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  {userData.customer && (
                    <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1.5 border-4 border-white">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center mb-1">
                  {userData.name || userData.customer?.user?.name || "User"}
                </h2>
                <p className="text-sm text-gray-600 text-center mb-3">
                  {userData.email || userData.customer?.user?.email || ""}
                </p>
                {userData.customer && (
                  <Badge 
                    variant="secondary" 
                    className={`${
                      userData.customer.region === "domestic" 
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-100/80" 
                        : "bg-purple-100 text-purple-700 hover:bg-purple-100/80"
                    }`}
                  >
                    {userData.customer.region === "domestic" ? "Domestic" : "Overseas"}
                  </Badge>
                )}
              </div>

              {/* Account Status */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Status Akun</span>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <Shield className="w-3 h-3 mr-1" />
                    Aktif
                  </Badge>
                </div>
                {userData.customer?.created_at && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Bergabung {new Date(userData.customer.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Information Cards - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* Contact Information */}
            <Card className="p-6 shadow-lg border-2 border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-gold" />
                Informasi Kontak
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-lg hover:bg-blue-50 transition-colors">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
                    <p className="text-gray-900 font-medium">
                      {userData.email || userData.customer?.user?.email || "-"}
                    </p>
                  </div>
                </div>

                {userData.customer && (
                  <div className="flex items-start gap-4 p-4 bg-green-50/50 rounded-lg hover:bg-green-50 transition-colors">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Nomor Telepon</p>
                      <p className="text-gray-900 font-medium">
                        {userData.customer.no_hp || "-"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Personal Information */}
            {userData.customer && (
              <Card className="p-6 shadow-lg border-2 border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-gold" />
                  Informasi Pribadi
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-purple-50/50 rounded-lg hover:bg-purple-50 transition-colors">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Alamat</p>
                      <p className="text-gray-900 font-medium">
                        {userData.customer.alamat || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-4 p-4 bg-orange-50/50 rounded-lg hover:bg-orange-50 transition-colors">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Globe className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 mb-1">Kebangsaan</p>
                        <p className="text-gray-900 font-medium">
                          {getCountryName(userData.customer.nasionality) || userData.customer.nasionality || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-indigo-50/50 rounded-lg hover:bg-indigo-50 transition-colors">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Globe className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 mb-1">Region</p>
                        <Badge 
                          variant="secondary" 
                          className={`mt-1 ${
                            userData.customer.region === "domestic" 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {userData.customer.region === "domestic" ? "Domestic" : "Overseas"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Info Message */}
            {!userData.customer && (
              <Card className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Shield className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 mb-1">Profil Belum Lengkap</h4>
                    <p className="text-sm text-yellow-700">
                      Profil Anda belum lengkap. Silakan lengkapi data profil saat melakukan registrasi atau booking.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

