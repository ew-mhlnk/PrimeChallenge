'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const navItems = [
  { label: 'Активные', path: '/' },
  { label: 'Архив', path: '/archive' },
  { label: 'Лидерборд', path: '/leaderboard' },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  // Ref для элемента-индикатора
  const indicatorRef = useRef<HTMLDivElement>(null);
  // Ref для родительского контейнера кнопок, чтобы правильно вычислить относительную позицию
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref для хранения ссылок на DOM-элементы каждой кнопки по их пути
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    // Находим активный элемент по текущему пути
    const activeItem = navItems.find((item) => pathname === item.path);

    const indicator = indicatorRef.current;
    const container = containerRef.current;
    // Получаем DOM-элемент активной кнопки из Map
    const activeButton = activeItem ? buttonRefs.current.get(activeItem.path) : null;

    // Если все необходимые элементы найдены
    if (indicator && container && activeButton) {
      // Получаем размеры и позицию контейнера и активной кнопки
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      // Вычисляем позицию индикатора относительно левого края контейнера
      // Это расстояние от левого края контейнера до левого края активной кнопки
      const translateX = buttonRect.left - containerRect.left;

      // Ширина индикатора должна быть равна ширине активной кнопки (которая уже включает текст и padding)
      const indicatorWidth = buttonRect.width;

      // Применяем вычисленные стили к индикатору
      indicator.style.transform = `translateX(${translateX}px)`;
      indicator.style.width = `${indicatorWidth}px`;

      // Опционально: если вы изначально скрывали индикатор, сделайте его видимым
      // indicator.style.opacity = '1';
    } else {
        // Если активный элемент не найден (например, на 404 странице, где нет меню)
        // Можно скрыть индикатор или установить нулевую ширину
        if (indicator) {
            indicator.style.width = '0px';
            // или переместить его за пределы видимости
            // indicator.style.transform = 'translateX(-9999px)';
        }
    }

    // Cleanup function не нужна в данном случае, т.к. список items статичен и кнопки всегда на месте
  }, [pathname]); // Эффект запускается при изменении pathname

  return (
    <nav className="bg-[#1B1A1F] w-full h-[39px] flex justify-center items-center">
      {/* Присваиваем ref контейнеру */}
      <div
        ref={containerRef}
        data-layer="Rectangle 543"
        className="Rectangle543 relative flex justify-center items-center gap-[32px] w-[430px] max-w-[90vw] h-[39px]"
      >
        {/* Индикатор: убираем фиксированную ширину w-[102px] */}
        {/* Добавляем transition-width для анимации ширины */}
        <div
          ref={indicatorRef}
          data-layer="Rectangle 544"
          className="Rectangle544 absolute top-1/2 -translate-y-1/2 h-[29px] bg-[#131215] rounded-[16.5px] border border-[#141414] transition-transform transition-width duration-300 ease-in-out"
          // Опционально: начальные стили для предотвращения мигания до первого позиционирования
          // style={{ width: '0px', opacity: '0' }}
        />
        {navItems.map((item) => (
          <button
            key={item.path}
            // Присваиваем ref каждой кнопке, сохраняя его в Map по пути
            ref={(el) => {
              if (el) {
                buttonRefs.current.set(item.path, el);
              } else {
                // При размонтировании элемента, удаляем его ref из Map
                buttonRefs.current.delete(item.path);
              }
            }}
            onClick={() => router.push(item.path)}
            // Добавляем padding: px-[15px] py-[5px]
            // Цвет текста меняется в зависимости от активности
            className={`relative z-10 px-[15px] py-[5px] text-[16px] font-medium ${
              pathname === item.path ? 'text-[#CCCCCC]' : 'text-[#5F6067]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}