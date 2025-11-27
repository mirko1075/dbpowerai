export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  if (window && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: eventName,
      ...params
    });
  }
};
