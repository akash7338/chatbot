// src/app/agent.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private baseUrl = 'http://localhost:8080/api/agent';

  constructor(private http: HttpClient) {}

  updateStatus(username: string, status: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/status`, { username, status });
  }

  getAgentStatus(username: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/status/${username}`);
  }

  // Add more methods as needed later (e.g., message history, assignment notifications, etc.)
}
