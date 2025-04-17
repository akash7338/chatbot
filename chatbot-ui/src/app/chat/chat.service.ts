import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl = 'http://localhost:8080/api/chatbot';

  constructor(private http: HttpClient) {}

  sendMessage(sessionId: string, message: string): Observable<string> {
    return this.http.post(`${this.baseUrl}/message/${sessionId}`, message, {
      responseType: 'text'
    });
  }
}
