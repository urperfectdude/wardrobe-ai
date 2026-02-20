/**
 * Analytics Utility
 * Handles Google Analytics custom events for tracking user behavior.
 */

export const trackPageVisit = (path) => {
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_visit', {
            page_path: path,
            page_title: document.title,
            timestamp: new Date().toISOString()
        });
    }
};

export const trackUserAction = (action, details = {}) => {
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'user_actions', {
            action_name: action,
            ...details,
            timestamp: new Date().toISOString()
        });
    } else {
        console.warn('GTag not initialized. Action:', action, details);
    }
};
