import { NextResponse } from 'next/server';
import { apiRequest } from '@/lib/api';

// Interface untuk response carousel
interface CarouselResponse {
  success: boolean;
  data: Array<{
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
  }>;
}

// API untuk mengambil data carousel dari backend
export async function GET() {
  try {
    console.log('Fetching carousel data from backend...');
    
    // Menggunakan apiRequest untuk mengambil data dari backend yang sudah terhosting
    const response = await apiRequest<CarouselResponse>(
      'GET',
      '/api/landing-page/carousels'
    );
    
    console.log('Carousel API response:', response);
    
    // Validasi response
    if (!response || !response.data) {
      console.warn('No carousel data received from backend');
      return NextResponse.json(
        { 
          success: false,
          error: 'Tidak ada data carousel yang tersedia',
          data: []
        },
        { status: 404 }
      );
    }

    // Filter hanya item yang aktif dan memiliki primary image
    const activeItems = response.data.filter(item => 
      item.is_active === '1' && item.primary_image && item.primary_image.file_url
    );
    
    console.log('Active items before sorting:', activeItems.map(item => ({
      id: item.id,
      title: item.title,
      order_num: item.order_num,
      primary_image_url: item.primary_image?.file_url
    })));
    
    // Sort berdasarkan order_num
    const sortedItems = activeItems.sort((a, b) => 
      parseInt(a.order_num) - parseInt(b.order_num)
    );
    
    console.log('Sorted items after sorting:', sortedItems.map(item => ({
      id: item.id,
      title: item.title,
      order_num: item.order_num,
      primary_image_url: item.primary_image?.file_url
    })));
    
    console.log(`Loaded ${sortedItems.length} active carousel items`);

    return NextResponse.json(
      {
        success: true,
        data: sortedItems
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching carousel data from backend:', error);
    
    // Fallback data jika backend tidak tersedia
    const fallbackData = {
      success: true,
      data: [
        {
          id: 1,
          title: "Komodo Island Adventure",
          description: "Jelajahi keindahan Pulau Komodo dengan pengalaman tak terlupakan",
          order_num: "1",
          is_active: "1",
          assets: [
            {
              id: 1,
              title: "Komodo Dragon",
              description: "Hewan purba yang masih hidup",
              file_url: "/img/landingpage/hero-slide1.png",
              original_file_url: "/img/landingpage/hero-slide1.png",
              is_external: false,
              file_path: "/img/landingpage/hero-slide1.png",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z"
            }
          ],
          primary_image: {
            id: 1,
            title: "Komodo Island",
            description: "Pulau Komodo yang menakjubkan",
            file_url: "/img/landingpage/hero-slide1.png",
            original_file_url: "/img/landingpage/hero-slide1.png",
            is_external: false,
            file_path: "/img/landingpage/hero-slide1.png",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
          },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        },
        {
          id: 2,
          title: "Pink Beach Paradise",
          description: "Nikmati keindahan pantai pink yang memukau",
          order_num: "2",
          is_active: "1",
          assets: [
            {
              id: 2,
              title: "Pink Beach",
              description: "Pantai dengan pasir berwarna pink",
              file_url: "/img/landingpage/hero-slide2.png",
              original_file_url: "/img/landingpage/hero-slide2.png",
              is_external: false,
              file_path: "/img/landingpage/hero-slide2.png",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z"
            }
          ],
          primary_image: {
            id: 2,
            title: "Pink Beach",
            description: "Pantai pink yang menakjubkan",
            file_url: "/img/landingpage/hero-slide2.png",
            original_file_url: "/img/landingpage/hero-slide2.png",
            is_external: false,
            file_path: "/img/landingpage/hero-slide2.png",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
          },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        },
        {
          id: 3,
          title: "Padar Island View",
          description: "Pemandangan spektakuler dari puncak Pulau Padar",
          order_num: "3",
          is_active: "1",
          assets: [
            {
              id: 3,
              title: "Padar Island",
              description: "Pulau dengan pemandangan yang menakjubkan",
              file_url: "/img/landingpage/hero-slide3.png",
              original_file_url: "/img/landingpage/hero-slide3.png",
              is_external: false,
              file_path: "/img/landingpage/hero-slide3.png",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z"
            }
          ],
          primary_image: {
            id: 3,
            title: "Padar Island",
            description: "Pulau Padar yang menakjubkan",
            file_url: "/img/landingpage/hero-slide3.png",
            original_file_url: "/img/landingpage/hero-slide3.png",
            is_external: false,
            file_path: "/img/landingpage/hero-slide3.png",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
          },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        }
      ]
    };

    console.log('Using fallback carousel data due to backend error');
    
    return NextResponse.json(fallbackData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

// Handler untuk method lain jika diperlukan
export async function POST() {
  return NextResponse.json(
    { error: 'Method POST tidak didukung untuk endpoint ini' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method PUT tidak didukung untuk endpoint ini' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method DELETE tidak didukung untuk endpoint ini' },
    { status: 405 }
  );
}
