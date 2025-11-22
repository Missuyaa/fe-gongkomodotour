"use client";

import Image from "next/image";
import { FaUser, FaRegCalendarAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import { Blog } from "@/types/blog";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Variants } from "framer-motion";
import { getImageUrl } from "@/lib/imageUrl";

export default function DetailBlog() {
  const [latestPosts, setLatestPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await apiRequest<{ data: Blog[] }>("GET", "/api/landing-page/blogs?status=1");
        const posts = Array.isArray(response.data) ? response.data : [];
        
        // Get latest 6 posts
        const sortedPosts = [...posts]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 6);
        
        setLatestPosts(sortedPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        duration: 0.8,
        ease: "easeOut" as const
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { 
      opacity: 0,
      x: -20,
      y: 20
    },
    show: { 
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 10,
        duration: 0.8
      }
    },
    hover: {
      scale: 1.02,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 10
      }
    }
  };

  if (loading) {
    return (
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full h-[600px] p-6"
      >
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Latest Post</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="bg-white rounded-2xl shadow-xl w-full h-[600px] p-6"
    >
      <div className="flex flex-col h-full">
        <motion.h2 
          className="text-3xl font-bold text-gray-800 mb-6 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Latest Post
        </motion.h2>
        <motion.div 
          className="flex-1 overflow-y-auto overflow-x-hidden pr-2 sm:pr-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{ maxHeight: "calc(100% - 4rem)" }}
        >
          <div className="space-y-4 sm:space-y-6 pb-2 sm:pb-4">
            {latestPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                itemVariants={itemVariants}
                imageErrors={imageErrors}
                setImageErrors={setImageErrors}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

function PostCard({ 
  post, 
  itemVariants,
  imageErrors,
  setImageErrors
}: { 
  post: Blog, 
  itemVariants: Variants,
  imageErrors: Set<number>,
  setImageErrors: React.Dispatch<React.SetStateAction<Set<number>>>
}) {
  const [decodedContent, setDecodedContent] = useState(post.content);
  const [plainText, setPlainText] = useState('');
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const txt = document.createElement("textarea");
      txt.innerHTML = post.content;
      setDecodedContent(txt.value);
      
      // Extract plain text for preview
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = post.content;
      const extractedText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Truncate to approximately 5 lines (around 250-300 characters)
      // Calculate based on average characters per line (around 50-60 chars per line for text-xs/sm)
      const maxChars = 280;
      if (extractedText.length > maxChars) {
        // Find the last space before maxChars to avoid cutting words
        const truncated = extractedText.substring(0, maxChars);
        const lastSpace = truncated.lastIndexOf(' ');
        const lastPeriod = truncated.lastIndexOf('.');
        // Prefer to cut at sentence end (period) if available, otherwise at word boundary
        const cutPoint = lastPeriod > maxChars * 0.7 ? lastPeriod + 1 : (lastSpace > 0 ? lastSpace : maxChars);
        setPlainText(extractedText.substring(0, cutPoint).trim() + '...');
      } else {
        setPlainText(extractedText);
      }
    }
  }, [post.content]);

  // Function to get image source with proper fallback
  const getImageSource = (post: Blog): string => {
    // Jika ada error pada gambar ini, gunakan fallback
    if (imageErrors.has(post.id)) {
      return '/img/default-trip.jpg';
    }

    // Jika tidak ada assets atau file_url kosong
    if (!post.assets || post.assets.length === 0 || !post.assets[0]) {
      return '/img/default-trip.jpg';
    }

    const asset = post.assets[0];

    // Helper function untuk safe URL encoding
    const toSafeUrl = (raw: string) => {
      try {
        // Jika sudah absolute URL dengan domain yang benar
        if (/^https?:\/\//.test(raw)) {
          // Cek apakah sudah ter-encode (mengandung %)
          if (raw.includes('%')) {
            return raw;
          }
          // Jika sudah absolute URL dari API, gunakan langsung
          if (raw.includes('api.gongkomodotour.com') || raw.includes('gongkomodotour.com')) {
            return raw;
          }
          return encodeURI(raw);
        }
        // Jika relative URL, gunakan getImageUrl helper
        return getImageUrl(raw);
      } catch (error) {
        console.error('Error processing URL:', error);
        return '/img/default-trip.jpg';
      }
    };

    // Untuk BlogAsset, kita hanya punya file_url
    // Prioritaskan file_url jika bukan placeholder
    if (asset.file_url && !asset.file_url.includes('placeholder')) {
      return toSafeUrl(asset.file_url);
    }

    return '/img/default-trip.jpg';
  };

  const handleImageError = () => {
    setImageErrors(prev => new Set(prev).add(post.id));
  };

  const imageUrl = getImageSource(post);

  return (
    <motion.div 
      key={post.id}
      variants={itemVariants}
      whileHover="hover"
      className="post-card border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4 flex flex-col md:flex-row gap-3 sm:gap-4 bg-white hover:shadow-md transition-all duration-300"
    >
      <motion.div 
        className="relative w-full md:w-40 lg:w-48 h-40 md:h-40 lg:h-48 overflow-hidden rounded-md flex-shrink-0 bg-gray-100"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        <Image
          src={imageUrl}
          alt={post.title || 'Blog post image'}
          fill
          className="object-cover rounded-md"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 160px, 192px"
          unoptimized
          onError={handleImageError}
        />
      </motion.div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex-shrink-0">
          {/* Title Section */}
          <motion.h3 
            className="text-base sm:text-lg font-semibold text-gray-800 mb-2"
            whileHover={{ scale: 1.01 }}
            style={{
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: '1.4',
              minHeight: '2.8rem' // ~2 lines dengan line-height 1.4
            }}
          >
            {post.title}
          </motion.h3>
          
          {/* Content Section - Diperpanjang untuk menampilkan lebih banyak text */}
          <div
            className="text-xs sm:text-sm text-gray-600 mb-3"
            style={{ 
              lineHeight: '1.5',
              minHeight: '7.5rem', // ~5 lines dengan line-height 1.5
              maxHeight: '7.5rem', // Max height untuk konsistensi
              overflow: 'hidden',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              maxWidth: '100%',
              position: 'relative'
            }}
          >
            <p
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                lineHeight: '1.5',
                margin: 0,
                padding: 0
              }}
            >
              {plainText || 'No content available'}
            </p>
          </div>
        </div>
        
        {/* Metadata Section - Selalu di bawah dengan mt-auto */}
        <div className="flex flex-wrap justify-between items-center border-t border-gray-100 text-xs sm:text-sm text-gray-500 gap-2 flex-shrink-0">
          <motion.div 
            className="flex items-center gap-1.5 min-w-0 flex-1"
            whileHover={{ scale: 1.05 }}
          >
            <FaUser className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-gray-400" />
            <span 
              className="text-xs sm:text-sm truncate"
              style={{
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                wordBreak: 'break-word'
              }}
            >
              Uploaded by: <span className="font-medium">{post.author?.name || 'Unknown'}</span>
            </span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-1.5 flex-shrink-0"
            whileHover={{ scale: 1.05 }}
          >
            <FaRegCalendarAlt className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-gray-400" />
            <span className="text-xs sm:text-sm whitespace-nowrap font-medium">
              {new Date(post.created_at).toLocaleDateString('id-ID', { 
                day: 'numeric', 
                month: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}