import { NextResponse } from 'next/server';

// Ini adalah file API dummy untuk carousel
// Pada implementasi sebenarnya, data ini akan diambil dari database

export async function GET() {
  try {
    // Di sini, Anda akan mengambil data dari database Anda
    // Contoh: const carouselImages = await prisma.carousel.findMany();
    
    // Untuk sementara, kita gunakan data dummy
    const carouselImages = [
      "/img/landingpage/hero-slide1.png",
      "/img/boat/bg-luxury.jpg",
      "/img/boat/luxury_phinisi.jpg",
      "/img/landingpage/hero-slide2.png",
      // Admin dapat menambahkan lebih banyak gambar melalui panel admin
    ];
    
    return NextResponse.json(carouselImages);
  } catch (error) {
    console.error('Error fetching carousel data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch carousel data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Di sini, Anda akan menyimpan URL gambar baru ke database
    // Contoh: await prisma.carousel.create({ data: { imageUrl: data.imageUrl } });
    
    // Untuk demo, hanya kembalikan data yang diterima
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving carousel data:', error);
    return NextResponse.json(
      { error: 'Failed to save carousel data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { imageUrl } = await request.json();
    
    // Di sini, Anda akan menghapus URL gambar dari database
    // Contoh: await prisma.carousel.delete({ where: { imageUrl } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting carousel data:', error);
    return NextResponse.json(
      { error: 'Failed to delete carousel data' },
      { status: 500 }
    );
  }
}
