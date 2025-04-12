import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Clock, MessageSquare } from 'lucide-react';

interface VideoCardProps {
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  views: string;
  timestamp: string;
  duration: string;
  chatCount: number;
}

export function VideoCard({
  videoId,
  title,
  thumbnail,
  channelName,
  views,
  timestamp,
  duration,
  chatCount
}: VideoCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow transition-all duration-200"
    >
      <Link href={`/video/${videoId}`} className="block">
        <div className="relative rounded-t-lg overflow-hidden aspect-video bg-slate-800">
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-200" />
          
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
            {duration}
          </div>
          
          {/* Chat Badge */}
          {chatCount > 0 && (
            <div className="absolute bottom-2 left-2 bg-teal-600 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
              <MessageSquare size={12} />
              <span>{chatCount}</span>
            </div>
          )}
        </div>
        
        <div className="p-3">
          <h3 className="font-semibold text-slate-800 line-clamp-2 group-hover:text-teal-600 transition duration-200">
            {title}
          </h3>
          <div className="mt-1.5 flex items-center text-sm">
            <p className="text-slate-600">{channelName}</p>
            <span className="mx-1.5 text-slate-400">•</span>
            <p className="text-slate-500">{views} views</p>
          </div>
          <div className="mt-1.5 flex items-center text-xs text-slate-500">
            <Clock size={12} className="mr-1" />
            <span>{timestamp}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Skeleton loader version of the video card
export function VideoCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg overflow-hidden shadow-sm">
      <div className="rounded-t-lg overflow-hidden aspect-video bg-slate-200"></div>
      <div className="p-3 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-5/6"></div>
        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
      </div>
    </div>
  );
} 