'use client';

import { Dispatch, SetStateAction } from 'react';

interface TagSelectorProps {
  selectedTag: string;
  setSelectedTag: Dispatch<SetStateAction<string>>;
}

const tags = [
  { label: 'ВСЕ', fill: '#FF8000' },
  { label: 'ATP', fill: '#002BFF' },
  { label: 'WTA', fill: '#7B00FF' },
  { label: 'ТБШ', gradient: 'url(#paint0_linear_1872_30)' },
];

export default function TagSelector({ selectedTag, setSelectedTag }: TagSelectorProps) {
  return (
    <div className="flex justify-start space-x-[15px] mb-[40px]">
      {tags.map((tag) => {
        const isActive = selectedTag === tag.label;
        return (
          <div
            key={tag.label}
            data-svg-wrapper
            data-layer={isActive ? 'Rectangle 545' : 'Rectangle 546'}
            className={`Rectangle${isActive ? '545' : '546'} cursor-pointer flex items-center justify-center gap-1`}
            onClick={() => setSelectedTag(tag.label)}
          >
            <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              {isActive ? (
                <>
                  <rect width="40" height="20" rx="3.58491" fill={tag.fill || tag.gradient} />
                  {tag.gradient && (
                    <defs>
                      <linearGradient id="paint0_linear_1872_30" x1="20" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FDF765" />
                        <stop offset="1" stopColor="#DAB07F" />
                      </linearGradient>
                    </defs>
                  )}
                </>
              ) : (
                <rect x="0.25" y="0.25" width="39.5" height="19.5" rx="3.33491" stroke="#5F6067" strokeWidth="0.5" />
              )}
              <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="10"
                className={isActive ? 'font-black' : ''}
              >
                {tag.label}
              </text>
            </svg>
          </div>
        );
      })}
    </div>
  );
}