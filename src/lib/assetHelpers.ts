import { apiRequest } from "./api"

/**
 * Helper functions untuk mengelola assets di dashboard
 * Memperbaiki masalah route API yang salah format
 */

export interface Asset {
  id: number
  title: string
  description: string | null
  file_url: string
  original_file_url?: string
  file_path?: string
  is_external: boolean
  created_at: string
  updated_at: string
}

/**
 * Menghapus asset berdasarkan file_url
 * Mencari asset di list yang diberikan dan menghapus berdasarkan ID
 */
export const deleteAssetByFileUrl = async (
  fileUrl: string, 
  assetList: Asset[]
): Promise<Asset | null> => {
  try {
    // Cari asset berdasarkan file_url
    const assetToDelete = assetList.find(asset => asset.file_url === fileUrl)
    
    if (!assetToDelete) {
      console.warn(`Asset dengan file_url ${fileUrl} tidak ditemukan`)
      return null
    }
    
    // Hapus asset menggunakan ID yang benar
    await apiRequest('DELETE', `/api/assets/${assetToDelete.id}`)
    console.log(`Asset berhasil dihapus: ${assetToDelete.id}`)
    
    return assetToDelete
  } catch (error) {
    console.error('Error deleting asset:', error)
    throw error
  }
}

/**
 * Menghapus multiple assets berdasarkan file_urls
 */
export const deleteMultipleAssetsByFileUrls = async (
  fileUrls: string[],
  assetList: Asset[]
): Promise<Asset[]> => {
  const deletedAssets: Asset[] = []
  
  for (const fileUrl of fileUrls) {
    try {
      const deletedAsset = await deleteAssetByFileUrl(fileUrl, assetList)
      if (deletedAsset) {
        deletedAssets.push(deletedAsset)
      }
    } catch (error) {
      console.warn(`Gagal hapus asset ${fileUrl}:`, error)
      // Lanjutkan dengan asset berikutnya
    }
  }
  
  return deletedAssets
}

/**
 * Membersihkan asset lama sebelum upload yang baru
 * Memastikan tidak ada duplikasi asset
 */
export const cleanupOldAssets = async (
  modelType: string,
  modelId: number,
  currentAssets: Asset[]
): Promise<void> => {
  if (currentAssets.length === 0) return
  
  console.log(`Membersihkan ${currentAssets.length} asset lama untuk ${modelType} ${modelId}`)
  
  for (const asset of currentAssets) {
    try {
      await apiRequest('DELETE', `/api/assets/${asset.id}`)
      console.log(`Asset lama berhasil dihapus: ${asset.id}`)
    } catch (error) {
      console.warn(`Gagal hapus asset lama ${asset.id}:`, error)
      // Lanjutkan meski gagal hapus asset lama
    }
  }
}
