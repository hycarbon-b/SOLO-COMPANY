import { useEffect, useState } from 'react';
import logo from '../../imports/Union.png';

export function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    // 在所有主元素入场之后再显示点击提示
    const t = setTimeout(() => setHintVisible(true), 2400);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onEnter, 700);
  };

  // 键盘支持：Enter / Space / Escape 也可进入
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') handleEnter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  return (
    <div
      onClick={handleEnter}
      className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer select-none"
      style={{
        background: '#ffffff',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 350ms ease 350ms',
        // 顶部给 Electron 拖拽留出区域
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      <style>{`
        @keyframes splashRise {
          from { opacity: 0; transform: translateY(10px); filter: blur(3px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        .splash-rise {
          opacity: 0;
          animation: splashRise 1000ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        /* 退场：整体同步向外舒展 + 淡出 */
        @keyframes splashLeave {
          0%   { opacity: 1; transform: scale(1);    filter: blur(0px); }
          100% { opacity: 0; transform: scale(1.12); filter: blur(6px); }
        }
        .splash-leaving {
          animation: splashLeave 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div
        className={`flex flex-col items-center ${leaving ? 'splash-leaving' : ''}`}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Logo */}
        <div
          className="splash-rise splash-logo-wrap"
          style={{ animationDelay: '0ms', marginBottom: '32px' }}
        >
          <img
            src={logo}
            alt="YUANJI T"
            style={{ width: '112px', height: '112px', objectFit: 'contain' }}
          />
        </div>

        {/* 产品名 */}
        <div
          className="splash-rise splash-name"
          style={{
            animationDelay: '400ms',
            fontSize: '30px',
            fontWeight: 600,
            letterSpacing: '0.38em',
            paddingLeft: '0.38em',
            color: '#111111',
          }}
        >
          YUANJI T
        </div>

        {/* Slogan */}
        <div
          className="splash-rise splash-slogan"
          style={{
            animationDelay: '900ms',
            marginTop: '16px',
            fontSize: '13px',
            fontWeight: 300,
            letterSpacing: '0.12em',
            color: '#86868b',
          }}
        >
          AI 赋能 · 一人成军
        </div>
      </div>

      {/* 隐形点击提示 */}
      <div
        className="absolute bottom-12 left-0 right-0 flex justify-center"
        style={{
          fontSize: '11px',
          fontWeight: 300,
          letterSpacing: '0.3em',
          color: '#86868b',
          opacity: hintVisible ? 0.45 : 0,
          transition: 'opacity 1400ms ease',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        CLICK TO CONTINUE
      </div>
    </div>
  );
}
