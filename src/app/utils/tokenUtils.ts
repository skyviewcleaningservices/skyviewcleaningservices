interface TokenData {
  token: string;
  expiresAt: number;
  user: any;
}

export const checkTokenValidity = (): boolean => {
  const tokenData = localStorage.getItem('adminTokenData');
  if (!tokenData) {
    return false;
  }

  try {
    const parsed: TokenData = JSON.parse(tokenData);
    const now = Date.now();
    
    if (now >= parsed.expiresAt) {
      // Token has expired, remove it and redirect to login
      clearTokenData();
      redirectToLogin();
      return false;
    }
    
    // Token is still valid, ensure backward compatibility
    localStorage.setItem('adminToken', parsed.token);
    localStorage.setItem('adminUser', JSON.stringify(parsed.user));
    return true;
  } catch (error) {
    console.error('Error parsing token data:', error);
    clearTokenData();
    redirectToLogin();
    return false;
  }
};

export const clearTokenData = (): void => {
  localStorage.removeItem('adminTokenData');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
};

export const redirectToLogin = (): void => {
  // Check if we're not already on the login page to avoid infinite redirects
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
    window.location.href = '/admin/login';
  }
};

export const getValidToken = (): string | null => {
  if (checkTokenValidity()) {
    return localStorage.getItem('adminToken');
  }
  return null;
};

export const getTokenExpiryTime = (): number | null => {
  const tokenData = localStorage.getItem('adminTokenData');
  if (!tokenData) {
    return null;
  }

  try {
    const parsed: TokenData = JSON.parse(tokenData);
    return parsed.expiresAt;
  } catch (error) {
    return null;
  }
};

export const getTimeUntilExpiry = (): number | null => {
  const expiryTime = getTokenExpiryTime();
  if (!expiryTime) {
    return null;
  }

  const timeLeft = expiryTime - Date.now();
  return timeLeft > 0 ? timeLeft : null;
};

export const formatTimeUntilExpiry = (): string | null => {
  const timeLeft = getTimeUntilExpiry();
  if (!timeLeft) {
    return null;
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export const setupTokenExpiryRedirect = (expiresAt: number): void => {
  const timeUntilExpiry = expiresAt - Date.now();
  
  if (timeUntilExpiry > 0) {
    setTimeout(() => {
      clearTokenData();
      console.log('Token expired, redirecting to login page');
      redirectToLogin();
    }, timeUntilExpiry);
  }
};
