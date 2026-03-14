import { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTenantSubdomain, setIsTenantSubdomain] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    let slug = null;
    
    // Logic to extract slug from hostname
    // Supports: slug.domain.com, slug.localhost
    const isLocalhost = hostname.includes('localhost');
    
    if (isLocalhost) {
        if (parts.length >= 2) {
            slug = parts[0];
        }
    } else {
        // Assume domain.com is the base, so anything more than 2 parts is a subdomain
        // Unless it's a double TLD like co.uk (logic might need refinement for production)
        if (parts.length >= 3) {
            slug = parts[0];
        }
    }

    const reservedSlugs = ['www', 'admin', 'api', 'support', 'app'];
    
    if (slug && !reservedSlugs.includes(slug)) {
      setIsTenantSubdomain(true);
      // We set the slug immediately. 
      // In a real scenario, we might want to fetch tenant details here (name, logo, etc.)
      // via a public API endpoint to check if tenant exists and is active.
      setTenant({ slug });
    } else {
      setIsTenantSubdomain(false);
      setTenant(null);
    }
    setLoading(false);
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isTenantSubdomain, loading, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
};
