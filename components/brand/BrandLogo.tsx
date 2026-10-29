import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type BrandLogoVariant = 'horizontal' | 'stacked' | 'symbol' | 'wordmark';
export type BrandLogoTheme = 'auto' | 'light' | 'dark';
export type BrandLogoFormat = 'svg' | 'png';

export interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BrandLogoVariant;
  theme?: BrandLogoTheme;
  format?: BrandLogoFormat;
  className?: string;
  imgClassName?: string;
  alt?: string;
  priority?: boolean;
}

const ASSETS = {
  svg: {
    horizontal: {
      light: '/brand/svg/logo-horizontal-light.svg',
      dark: '/brand/svg/logo-horizontal-dark.svg',
      width: 666,
      height: 271,
    },
    stacked: {
      light: '/brand/svg/logo-stacked-light.svg',
      dark: '/brand/svg/logo-stacked-dark.svg',
      width: 389,
      height: 443,
    },
    symbol: {
      light: '/brand/svg/symbol-light.svg',
      dark: '/brand/svg/symbol-dark.svg',
      width: 512,
      height: 512,
    },
    wordmark: {
      light: '/brand/svg/wordmark-light.svg',
      dark: '/brand/svg/wordmark-dark.svg',
      width: 428,
      height: 213,
    },
  },
  png: {
    horizontal: {
      light: '/brand/png/logo-horizontal-light@3x.png',
      dark: '/brand/png/logo-horizontal-dark@3x.png',
      width: 666,
      height: 270,
    },
    stacked: {
      light: '/brand/png/logo-stacked-light@3x.png',
      dark: '/brand/png/logo-stacked-dark@3x.png',
      width: 388,
      height: 443,
    },
    symbol: {
      light: '/brand/png/symbol-light-1024.png',
      dark: '/brand/png/symbol-dark-1024.png',
      width: 1024,
      height: 1024,
    },
    wordmark: {
      light: '/brand/png/wordmark-light@3x.png',
      dark: '/brand/png/wordmark-dark@3x.png',
      width: 428,
      height: 213,
    },
  },
} as const;

const DEFAULT_ALTS: Record<BrandLogoVariant, string> = {
  horizontal: 'فصيح — اللغة العربية للثانوية العامة',
  stacked: 'فصيح — اللغة العربية للثانوية العامة',
  wordmark: 'فصيح',
  symbol: 'فصيح',
};

export function BrandLogo({
  variant = 'horizontal',
  theme = 'auto',
  format = 'svg',
  className,
  imgClassName,
  alt,
  priority = true,
  ...props
}: BrandLogoProps) {
  const meta = ASSETS[format][variant];
  const resolvedAlt = alt ?? DEFAULT_ALTS[variant];

  if (theme === 'light') {
    return (
      <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)} {...props}>
        <Image
          src={meta.light}
          alt={resolvedAlt}
          width={meta.width}
          height={meta.height}
          className={cn('h-full w-auto object-contain', imgClassName)}
          priority={priority}
          unoptimized
        />
      </div>
    );
  }

  if (theme === 'dark') {
    return (
      <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)} {...props}>
        <Image
          src={meta.dark}
          alt={resolvedAlt}
          width={meta.width}
          height={meta.height}
          className={cn('h-full w-auto object-contain', imgClassName)}
          priority={priority}
          unoptimized
        />
      </div>
    );
  }

  // theme === 'auto' — CSS auto-switches light vs dark depending on html[data-theme="dark"]
  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)} {...props}>
      <Image
        src={meta.light}
        alt={resolvedAlt}
        width={meta.width}
        height={meta.height}
        className={cn('brand-logo-light h-full w-auto object-contain', imgClassName)}
        priority={priority}
        unoptimized
      />
      <Image
        src={meta.dark}
        alt={resolvedAlt}
        width={meta.width}
        height={meta.height}
        className={cn('brand-logo-dark h-full w-auto object-contain', imgClassName)}
        priority={priority}
        unoptimized
      />
    </div>
  );
}

export function BrandSymbol(props: Omit<BrandLogoProps, 'variant'>) {
  return <BrandLogo variant="symbol" {...props} />;
}

export function BrandStacked(props: Omit<BrandLogoProps, 'variant'>) {
  return <BrandLogo variant="stacked" {...props} />;
}

export function BrandWordmark(props: Omit<BrandLogoProps, 'variant'>) {
  return <BrandLogo variant="wordmark" {...props} />;
}

export default BrandLogo;
