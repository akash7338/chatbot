import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  role = 'user';
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Username and password are required.';
      return;
    }

    const payload = {
      username: this.username,
      password: this.password,
      role: this.role
    };

    this.http.post<any>('http://localhost:8080/api/auth/login', payload).subscribe({
      next: (res) => {
        localStorage.setItem('username', this.username);
        localStorage.setItem('role', this.role);
        this.router.navigate([`/${this.role}`]); // /chat or /agent
      },
      error: () => {
        this.errorMessage = 'Invalid credentials. Please try again.';
      }
    });
  }
}
