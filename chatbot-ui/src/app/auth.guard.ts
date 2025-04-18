import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (!token || isTokenExpired(token)) {
    router.navigate(['/login']);
    return false;
  }

  const payload = JSON.parse(atob(token.split('.')[1]));
  const role = payload.role;

  // Optional role checks
  if (state.url.startsWith('/agent') && !role.includes('ROLE_AGENT')) {
    router.navigate(['/login']);
    return false;
  }

  if (state.url.startsWith('/user') && !role.includes('ROLE_USER')) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
