"use client";
import { useEffect, useState } from "react";

/**
 * Height (px) covered by the on-screen OS keyboard, measured with the VisualViewport API.
 * 0 on desktop and whenever no keyboard is open. Used to dock the symbol tray right above the keyboard.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > 80 ? Math.round(covered) : 0); // ignore browser chrome jitter
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

/** Tracks MathLive's full virtual keyboard (opened on demand from the tray / line focus). */
export function useFullKeyboard(): { visible: boolean; height: number; show: () => void; hide: () => void } {
  const [state, setState] = useState({ visible: false, height: 0 });
  useEffect(() => {
    let off: (() => void) | undefined;
    let dead = false;
    import("./mathlive-setup").then(({ loadMathlive }) =>
      loadMathlive().then(() => {
        if (dead) return;
        const k = window.mathVirtualKeyboard;
        if (!k) return;
        const sync = () => setState({ visible: k.visible, height: k.visible ? Math.round(k.boundingRect.height) : 0 });
        k.addEventListener("geometrychange", sync);
        k.addEventListener("virtual-keyboard-toggle", sync);
        off = () => {
          k.removeEventListener("geometrychange", sync);
          k.removeEventListener("virtual-keyboard-toggle", sync);
        };
      })
    );
    return () => {
      dead = true;
      off?.();
    };
  }, []);
  return {
    ...state,
    show: () => window.mathVirtualKeyboard?.show(),
    hide: () => window.mathVirtualKeyboard?.hide(),
  };
}
