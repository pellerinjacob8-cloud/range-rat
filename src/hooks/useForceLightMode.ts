import { useEffect } from "react";

export function useForceLightMode() {
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    return () => {
      if (wasDark) document.documentElement.classList.add("dark");
    };
  }, []);
}
