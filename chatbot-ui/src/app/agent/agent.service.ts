// src/app/agent.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) { }

  updateStatus(username: string, status: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/agent/status`, { username, status });
  }

  getAgentStatus(username: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/agent/status/${username}`);
  }

  acceptOffer(sessionId: string, agent: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/assign-agent/accept`, { sessionId, agent });
  }

  declineOffer(sessionId: string, agent: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/assign-agent/decline`, { sessionId, agent });
  }

  // Add more methods as needed later (e.g., message history, assignment notifications, etc.)
}
