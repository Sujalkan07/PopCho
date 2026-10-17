import React, { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ringClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 'sm',
  className = '',
  ringClassName = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses: Record<string, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-32 h-32 text-3xl',
  };

  const currentSize = sizeClasses[size] || sizeClasses.sm;

  const initials = (name || 'P')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const cleanSrc = src && src.trim().length > 0 && !hasError ? src.trim() : null;

  if (cleanSrc) {
    return (
      <img
        src={cleanSrc}
        alt={name || 'User avatar'}
        onError={() => setHasError(true)}
        className={`rounded-full object-cover shrink-0 select-none ${currentSize} ${ringClassName} ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      aria-label={name || 'User avatar'}
      className={`rounded-full bg-gradient-to-br from-[#e50914] to-[#80050c] text-white font-extrabold flex items-center justify-center shrink-0 select-none shadow-inner ${currentSize} ${ringClassName} ${className}`}
    >
      {initials}
    </div>
  );
};
