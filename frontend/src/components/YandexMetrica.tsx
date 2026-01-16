'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

// УБРАЛИ слово 'default' 👇
export function YandexMetrica() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    if (!isInit) return;
    const url = `${pathname}?${searchParams}`;
    // @ts-ignore
    if (typeof window !== 'undefined' && window.ym) {
      // @ts-ignore
      window.ym(Number(process.env.NEXT_PUBLIC_YANDEX_METRICA_ID), 'hit', url);
    }
  }, [pathname, searchParams, isInit]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        clearInterval(interval);
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        const userId = user?.id;
        // @ts-ignore
        if (userId && window.ym) {
           // @ts-ignore
           window.ym(Number(process.env.NEXT_PUBLIC_YANDEX_METRICA_ID), 'setUserID', String(userId));
           // @ts-ignore
           window.ym(Number(process.env.NEXT_PUBLIC_YANDEX_METRICA_ID), 'params', {
             telegram_user: {
               id: userId,
               username: user.username || 'unknown',
               first_name: user.first_name
             }
           });
        }
        setIsInit(true);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <Script
      id="yandex-metrica"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          ym(${process.env.NEXT_PUBLIC_YANDEX_METRICA_ID}, "init", {
               clickmap:true,
               trackLinks:true,
               accurateTrackBounce:true,
               webvisor:true,
               trackHash:false, 
               triggerEvent:true
          });
        `,
      }}
    />
  );
}