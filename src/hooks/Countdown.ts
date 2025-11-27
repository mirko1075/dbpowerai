import { useState, useEffect } from "react";

export function useCountdown(targetDate) {
  const target = new Date(targetDate).getTime();
  const [distance, setDistance] = useState(target - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setDistance(target - Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [target]);

  return {
    days: Math.max(0, Math.floor(distance / (1000 * 60 * 60 * 24))),
    hours: Math.max(0, Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
    minutes: Math.max(0, Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))),
    seconds: Math.max(0, Math.floor((distance % (1000 * 60)) / 1000)),
  };
}
