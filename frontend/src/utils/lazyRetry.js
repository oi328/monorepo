import { lazy } from 'react';

/**
 * A wrapper around React.lazy that attempts to refresh the page once if the chunk fails to load.
 * This handles the "Failed to fetch dynamically imported module" error that occurs after deployments.
 */
export const lazyRetry = (componentImport) => {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assuming that the user is not on the latest version of the application.
        // Let's refresh the page immediately.
        console.warn('Chunk load failed, forcing refresh to get latest version...', error);
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Return a never-resolving promise to prevent error boundary from flashing before reload
        return new Promise(() => {}); 
      }
      
      // The page has already been reloaded
      // Assuming that user is already using the latest version of the application.
      // Let's let the application crash and raise the error.
      throw error;
    }
  });
};
