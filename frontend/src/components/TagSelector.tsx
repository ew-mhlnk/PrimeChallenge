'use client';

import { Dispatch, SetStateAction } from 'react';

interface TagSelectorProps {
  selectedTag: string;
  setSelectedTag: Dispatch<SetStateAction<string>>;
}

const tags = [
  { label: 'все', color: '#FF8000', width: '38px' },
  { label: 'ATP', color: '#002BFF', width: '38px' },
  { label: 'WTA', color: '#7B00FF', width: '38px' },
  { label: 'ТБШ', gradient: 'linear-gradient(180deg, #FDF765 0%, #7D490E 100%)', width: '93.87px' },
];

export default function TagSelector({ selectedTag, setSelectedTag }: TagSelectorProps) {
  return (
    <div className="flex justify-start space-x-[15px] mb-[40px]">
      {tags.map((tag) => {
        const isActive = selectedTag === tag.label;
        return (
          <div
            key={tag.label}
            data-svg-wrapper={tag.label !== 'ТБШ'}
            data-layer="Rectangle 545"
            className={`Rectangle545 cursor-pointer ${isActive ? `ring-2 ring-${tag.color || '[#FDF765]'}` : ''}`}
            style={
              tag.gradient
                ? { width: tag.width, height: '14.34px', background: tag.gradient, borderRadius: '3.58px' }
                : { width: tag.width, height: '14.34px' }
            }
            onClick={() => setSelectedTag(tag.label)}
          >
            {tag.gradient ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-[#FFFFFF] text-[10px] font-medium">{tag.label}</span>
              </div>
            ) : (
              <svg width={tag.width} height="15" viewBox="0 0 38 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="38" height="14.3396" rx="3.58491" fill={tag.color} />
                <text
                  x="50%"
                  y="50%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="10"
                >
                  {tag.label}
                </text>
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}