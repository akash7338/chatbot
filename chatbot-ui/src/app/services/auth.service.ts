import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8080/api/auth';

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  login(username: string, password: string): Observable<any> {
    if (!username.trim() || !password.trim()) {
      throw new Error('Username and password are required.');
    }

    return this.http.post<any>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap(res => {
        const role = res.role.replace('ROLE_', '').toLowerCase();
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);
        localStorage.setItem('username', username);
        this.router.navigate([`/${role}`]);
      })
    );
  }

  logout(): Observable<any> {
    const username = localStorage.getItem('username');
    if (username) {
      return this.http.post(`${this.baseUrl}/logout`, { username });
    }
    return new Observable();
  }

  handleLogout() {
    this.logout().subscribe(() => {
      console.log('✅ User logged out');
      localStorage.clear();
      this.router.navigate(['/login']);
    });
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }
} 