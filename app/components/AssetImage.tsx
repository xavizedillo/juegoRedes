'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

interface AssetImageProps {
  src: string;
  alt: string;
  style?: CSSProperties;
  fallback: ReactNode;
}

export default function AssetImage({ src, alt, style, fallback }: AssetImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={style}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
