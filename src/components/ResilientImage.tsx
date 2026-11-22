import { useEffect, useRef, useState } from 'react';
import { Fish } from 'lucide-react';
import { sanitizeAssetUrl } from '../lib/firebase';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClassName?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  aspectClassName = 'aspect-[4/3]',
}: ResilientImageProps) {
  const safeSrc = sanitizeAssetUrl(src);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [errorSrc, setErrorSrc] = useState<string | null>(null);

  const loaded = Boolean(safeSrc) && loadedSrc === safeSrc;
  const hasError = Boolean(safeSrc) && errorSrc === safeSrc;

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !safeSrc) return;
    if (img.complete) {
      if (img.naturalWidth > 0) {
        setLoadedSrc(safeSrc);
      } else {
        setErrorSrc(safeSrc);
      }
    }
  }, [safeSrc]);

  if (hasError || !safeSrc) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#0B2240] via-[#071529] to-[#040B16] flex flex-col items-center justify-center p-6 text-center ${aspectClassName} ${className}`}
        role="img"
        aria-label={alt}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(34, 211, 238, 0.25), transparent 65%)',
          }}
        />
        <Fish className="w-8 h-8 text-cyan-300/70 mb-2 relative z-10" strokeWidth={1.5} />
        <span className="text-xs text-slate-300/80 font-medium tracking-wide relative z-10 max-w-[18ch] truncate">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#061326] ${aspectClassName}`}>
      {!loaded && (
        <div
          className="absolute inset-0 skeleton-shimmer z-0"
          aria-hidden="true"
        />
      )}
      <img
        ref={imgRef}
        src={safeSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        decoding="async"
        onLoad={() => setLoadedSrc(safeSrc)}
        onError={() => setErrorSrc(safeSrc)}
        className={`relative z-[1] w-full h-full object-cover transition-opacity duration-300 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      />
    </div>
  );
}

