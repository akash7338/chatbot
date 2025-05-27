import { Injectable } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface ChatMessage {
  sender: string;
  text: string;
}

export interface TypingStatus {
  username: string;
  isTyping: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl = 'http://localhost:8080/api/chatbot';

  constructor(
    private wsService: WebSocketService,
    private http: HttpClient
  ) {}

  sendMessage(sender: string, message: string, sessionId: string): void {
    if (!message.trim() || !sessionId) return;

    const payload = {
      sender,
      message: message.trim(),
      sessionId
    };

    console.log('[Chat] Sending message:', payload);
    this.wsService.sendMessage('/app/sendMessage', payload);
  }

  // HTTP-based message sending (fallback)
  sendMessageHttp(sessionId: string, message: string): Observable<string> {
    return this.http.post(`${this.baseUrl}/message/${sessionId}`, message, {
      responseType: 'text'
    });
  }

  sendTyping(sender: string, senderType: string, isTyping: boolean, sessionId: string): void {
    if (!sessionId) return;

    const payload = {
      sender,
      senderType,
      typing: isTyping,
      sessionId
    };

    this.wsService.sendTyping('/app/typing', payload);
  }

  subscribeToSession(sessionId: string, currentUserType: string, 
    onMessage: (message: ChatMessage) => void,
    onTyping: (status: TypingStatus) => void): void {
    
    // Subscribe to messages
    this.wsService.subscribe(`/topic/messages/${sessionId}`, (data) => {
      console.log('[Chat] Received message:', data);
      onMessage({
        sender: data.sender,
        text: data.message
      });
    });

    // Subscribe to typing
    this.wsService.subscribe(`/topic/typing/${sessionId}`, (data) => {
      console.log('[Chat] Received typing:', data);
      if (data.senderType !== currentUserType) {
        onTyping({
          username: data.sender,
          isTyping: data.typing === true || data.typing === 'true'
        });
      }
    });
  }

  offerSessionToAgents(sessionId: string): Observable<any> {
    return this.http.post<any>(`http://localhost:8080/api/assign-agent/${sessionId}`, {});
  }
} 