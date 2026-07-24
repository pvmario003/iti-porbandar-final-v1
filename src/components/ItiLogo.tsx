import React from "react";

export default function ItiLogo({ className = "h-24 w-24" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center bg-white rounded-full p-1.5 border-2 border-slate-200/80 shadow-md ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Silver/Chrome Gradient for Wrench & Hammer Metal */}
          <linearGradient id="silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#E2E8F0" />
            <stop offset="70%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Dark Silver Gradient for Inner/Back Metal */}
          <linearGradient id="silver-dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" />
            <stop offset="50%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Wood Cylinder 3D Gradient for Hammer Handle */}
          <linearGradient id="wood-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C2D12" />
            <stop offset="40%" stopColor="#C2410C" />
            <stop offset="70%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>

          {/* Wrench Cutout Mask for smooth curved jaws */}
          <mask id="wrench-cutout">
            {/* White allows everything inside to be drawn */}
            <rect x="-100" y="-100" width="300" height="300" fill="white" />
            
            {/* Top jaw cutout: circular base + rectangle extending out, tilted 15 degrees */}
            <g transform="rotate(15 50 15)">
              <circle cx="50" cy="15" r="5.5" fill="black" />
              <rect x="44.5" y="-10" width="11" height="25" fill="black" />
            </g>
            
            {/* Bottom jaw cutout: circular base + rectangle extending out, tilted 15 degrees */}
            <g transform="rotate(15 50 85)">
              <circle cx="50" cy="85" r="5.5" fill="black" />
              <rect x="44.5" y="85" width="11" height="25" fill="black" />
            </g>
          </mask>
        </defs>

        {/* 1. Yellow Cogwheel Teeth */}
        <g>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect
              key={i}
              x="44"
              y="11"
              width="12"
              height="14"
              fill="#FFD700"
              stroke="#000000"
              strokeWidth="1.5"
              transform={`rotate(${i * 30} 50 50)`}
              rx="1.5"
            />
          ))}
        </g>

        {/* 2. Main Yellow Gear Body */}
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="#FFD700"
          stroke="#000000"
          strokeWidth="1.8"
        />

        {/* 3. Inner Blue Circle */}
        <circle
          cx="50"
          cy="50"
          r="21"
          fill="#0284c7"
          stroke="#000000"
          strokeWidth="1.5"
        />

        {/* 4. Crossed Tools */}
        
        {/* Wrench (Spanner) - Rotated bottom-left to top-right */}
        <g transform="rotate(45 50 50)">
          {/* Masked spanner body to create the cutouts */}
          <g mask="url(#wrench-cutout)">
            {/* Wrench Shaft */}
            <rect
              x="46"
              y="15"
              width="8"
              height="70"
              rx="2.5"
              fill="url(#silver-grad)"
              stroke="#000000"
              strokeWidth="1.5"
            />
            {/* Top Head Outer Circle */}
            <circle
              cx="50"
              cy="15"
              r="9.5"
              fill="url(#silver-grad)"
              stroke="#000000"
              strokeWidth="1.5"
            />
            {/* Bottom Head Outer Circle */}
            <circle
              cx="50"
              cy="85"
              r="9.5"
              fill="url(#silver-grad)"
              stroke="#000000"
              strokeWidth="1.5"
            />
          </g>

          {/* Draw high-quality black outlines inside the cutouts so jaws have crisp inner borders */}
          <path
            d="M 44.5,-5 L 44.5,15 A 5.5,5.5 0 0,0 55.5,15 L 55.5,-5"
            fill="none"
            stroke="#000000"
            strokeWidth="1.5"
            transform="rotate(15 50 15)"
          />
          <path
            d="M 44.5,105 L 44.5,85 A 5.5,5.5 0 0,1 55.5,85 L 55.5,105"
            fill="none"
            stroke="#000000"
            strokeWidth="1.5"
            transform="rotate(15 50 85)"
          />
        </g>

        {/* Hammer - Rotated top-left to bottom-right */}
        <g transform="rotate(-45 50 50)">
          {/* Wooden Handle with cylinder gradient */}
          <rect
            x="46"
            y="32"
            width="8"
            height="53"
            rx="2"
            fill="url(#wood-grad)"
            stroke="#000000"
            strokeWidth="1.5"
          />
          
          {/* Left neck and Ball Peen */}
          <polygon
            points="43,21 34,23.5 34,28.5 43,31"
            fill="url(#silver-grad)"
            stroke="#000000"
            strokeWidth="1.5"
          />
          <circle
            cx="33"
            cy="26"
            r="4.5"
            fill="url(#silver-grad)"
            stroke="#000000"
            strokeWidth="1.5"
          />

          {/* Right neck and Striking Face */}
          <polygon
            points="57,21 66,22.5 66,29.5 57,31"
            fill="url(#silver-grad)"
            stroke="#000000"
            strokeWidth="1.5"
          />
          <rect
            x="66"
            y="21"
            width="4"
            height="10"
            rx="1"
            fill="url(#silver-dark)"
            stroke="#000000"
            strokeWidth="1.5"
          />
          
          {/* Central Hammer Head Socket */}
          <rect
            x="43"
            y="21"
            width="14"
            height="10"
            rx="1.5"
            fill="url(#silver-grad)"
            stroke="#000000"
            strokeWidth="1.5"
          />
        </g>

        {/* 5. Center Red Lightning Bolt - Sharp, vertical and prominent */}
        <path
          d="M 50,3 L 57,36 L 45,36 L 55,51 L 45,51 L 50,97 L 41,56 L 53,56 L 44,43 L 53,43 Z"
          fill="#ef4444"
          stroke="#000000"
          strokeWidth="1.6"
          strokeLinejoin="miter"
        />
      </svg>
    </div>
  );
}
