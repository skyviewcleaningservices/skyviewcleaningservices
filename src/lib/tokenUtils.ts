interface TokenData {
  token: string;
  expiresAt: number;
  user: any;
}

// Hashes a password client-side before it's sent to the login API
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

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

// fetch wrapper that attaches the admin session token — use for any call to a
// protected /api/admin/* or /api/bookings* route.
export const authFetch = (input: string, init: RequestInit = {}): Promise<Response> => {
  const token = getValidToken();
  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
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
