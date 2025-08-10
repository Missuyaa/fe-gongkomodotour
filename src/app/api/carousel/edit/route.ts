import { NextResponse } from 'next/server';

// API untuk mengedit gambar carousel
export async function PUT(request: Request) {
  try {
    const { oldImageUrl, newImageUrl } = await request.json();
    
    if (!oldImageUrl || !newImageUrl) {
      return NextResponse.json(
        { error: 'oldImageUrl dan newImageUrl diperlukan' },
        { status: 400 }
      );
    }
    
    // Di sini, Anda akan mengupdate URL gambar di database
    // Contoh: await prisma.carousel.update({ 
    //   where: { imageUrl: oldImageUrl },
    //   data: { imageUrl: newImageUrl }
    // });
    
    // Untuk demo, kita anggap update berhasil
    return NextResponse.json({ 
      success: true,
      message: 'Gambar berhasil diperbarui',
      oldImageUrl,
      newImageUrl
    });
  } catch (error) {
    console.error('Error updating carousel image:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui gambar carousel' },
      { status: 500 }
    );
  }
}
