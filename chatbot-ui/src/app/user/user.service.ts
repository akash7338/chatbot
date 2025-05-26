import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  assignAgent(sessionId: string): Observable<any> {
    return this.http.post(`${this.API_URL}/assign-agent/${sessionId}`, {});
  }
} 