import { Tractor } from 'lucide-react';
import { useState } from 'react';

interface ResilientImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-stone-100 to-amber-50 text-[#14532D] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Tractor className="w-8 h-8 opacity-75 mb-2" aria-hidden="true" />
        {fallbackTitle && (
          <span className="text-xs font-medium text-slate-700 line-clamp-2 max-w-[200px]">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
