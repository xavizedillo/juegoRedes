'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { IMAGE_EXTENSIONS } from '../../shared/battleData';

interface AssetImageProps {
  basePath: string;
  alt: string;
  style?: CSSProperties;
  fallback: ReactNode;
}

export default function AssetImage({ basePath, alt, style, fallback }: AssetImageProps) {
  const [extensionIndex, setExtensionIndex] = useState(0);

  useEffect(() => {
    setExtensionIndex(0);
  }, [basePath]);

  const extension = IMAGE_EXTENSIONS[extensionIndex];
  if (!extension) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${basePath}.${extension}`}
      alt={alt}
      style={style}
      draggable={false}
      onError={() => setExtensionIndex((i) => i + 1)}
    />
  );
}
