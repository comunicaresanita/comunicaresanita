import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const frame = window.requestAnimationFrame(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
