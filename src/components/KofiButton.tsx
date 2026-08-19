import React from 'react';

interface KofiButtonProps {
  username?: string;
  className?: string;
}

export default function KofiButton({ username = "zerocold", className = "" }: KofiButtonProps) {
  return (
    <a
      href={`https://ko-fi.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2 bg-[#ff5e5b] hover:bg-[#e04a47] text-white font-medium text-sm rounded-lg shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${className}`}
    >
      <span className="text-base">☕</span>
      <span>Support on Ko-fi</span>
    </a>
  );
}
