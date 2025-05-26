import { Injectable } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { BehaviorSubject, Observable } from 'rxjs';
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
  private messages = new BehaviorSubject<ChatMessage[]>([]);
  private isTyping = new BehaviorSubject<TypingStatus>({ isTyping: false, username: '' });
  private baseUrl = 'http://localhost:8080/api/chatbot';

  constructor(
    private wsService: WebSocketService,
    private http: HttpClient
  ) {}

  getMessages(): Observable<ChatMessage[]> {
    return this.messages.asObservable();
  }

  getTypingStatus(): Observable<TypingStatus> {
    return this.isTyping.asObservable();
  }

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

  subscribeToSession(sessionId: string, currentUserType: string): void {
    // Subscribe to messages
    this.wsService.subscribe(`/topic/messages/${sessionId}`, (data) => {
      console.log('[Chat] Received message:', data);
      const currentMessages = this.messages.value;
      this.messages.next([...currentMessages, {
        sender: data.sender,
        text: data.message
      }]);
    });

    // Subscribe to typing
    this.wsService.subscribe(`/topic/typing/${sessionId}`, (data) => {
      console.log('[Chat] Received typing:', data);
      if (data.senderType !== currentUserType) {
        this.isTyping.next({
          isTyping: data.typing === true || data.typing === 'true',
          username: data.sender
        });
      }
    });
  }

  clearMessages(): void {
    this.messages.next([]);
  }

  offerSessionToAgents(sessionId: string): Observable<any> {
    return this.http.post<any>(`http://localhost:8080/api/assign-agent/${sessionId}`, {});
  }
} 