import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ChatMessage {
  sender: string;
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: Client | null = null;
  private connected = new BehaviorSubject<boolean>(false);
  private readonly WS_URL = 'http://localhost:8080/chat-websocket';

  constructor() {}

  connect(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(this.WS_URL),
        connectHeaders: { username },
        reconnectDelay: 5000,
        debug: (msg) => console.log('[WebSocket]', msg),
        onConnect: () => {
          console.log('[WebSocket] Connected ✅');
          this.connected.next(true);
          resolve();
        },
        onStompError: (frame) => {
          console.error('[WebSocket] STOMP error:', frame.headers['message']);
          reject(new Error(frame.headers['message']));
        }
      });

      this.stompClient.activate();
    });
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.connected.next(false);
    }
  }

  isConnected(): Observable<boolean> {
    return this.connected.asObservable();
  }

  subscribe(topic: string, callback: (message: any) => void): void {
    if (!this.stompClient?.connected) {
      console.error('[WebSocket] Not connected');
      return;
    }

    console.log('[WebSocket] Subscribing to:', topic);
    this.stompClient.subscribe(topic, (message: Message) => {
      try {
        const data = JSON.parse(message.body);
        console.log('[WebSocket] Received message on', topic, ':', data);
        callback(data);
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
        // Try to pass the raw message if parsing fails
        callback(message.body);
      }
    });
  }

  publish(destination: string, body: any): void {
    if (!this.stompClient?.connected) {
      console.error('[WebSocket] Not connected');
      return;
    }

    console.log('[WebSocket] Publishing to', destination, ':', body);
    this.stompClient.publish({
      destination,
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  }

  // New methods for chat functionality
  sendMessage(destination: string, message: any): void {
    this.publish(destination, message);
  }

  sendTyping(destination: string, data: any): void {
    this.publish(destination, data);
  }

  get isConnectedNow(): boolean {
    return this.stompClient?.connected || false;
  }
} 