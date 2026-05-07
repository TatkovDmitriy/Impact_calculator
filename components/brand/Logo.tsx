import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  linkTo?: string;
}

export function Logo({ className, width = 120, height = 32, linkTo = '/dashboard' }: LogoProps) {
  const img = (
    <Image
      src="/lemana-pro-logo.png"
      alt="Lemana PRO"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
  return linkTo ? <Link href={linkTo} className="block leading-none">{img}</Link> : img;
}
