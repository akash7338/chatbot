import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

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
  errorMessage = '';

  constructor(private authService: AuthService) { }

  login() {
    try {
      this.authService.login(this.username, this.password).subscribe({
        error: () => {
          this.errorMessage = 'Invalid credentials. Please try again.';
        }
      });
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'An error occurred';
    }
  }
}
