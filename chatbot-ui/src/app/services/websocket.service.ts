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

  constructor() {
    console.log('[WebSocket] Service initialized with URL:', this.WS_URL);
  }

  connect(username: string): Promise<void> {
    console.log('[WebSocket] Attempting to connect with username:', username);
    return new Promise((resolve, reject) => {
      this.stompClient = new Client({
        webSocketFactory: () => {
          console.log('[WebSocket] Creating SockJS connection to:', this.WS_URL);
          return new SockJS(this.WS_URL);
        },
        connectHeaders: { username },
        reconnectDelay: 5000,
        debug: (msg) => console.log('[WebSocket Debug]', msg),
        onConnect: () => {
          console.log('[WebSocket] Connected successfully ✅');
          console.log('[WebSocket] Connection headers:', this.stompClient?.connectHeaders);
          this.connected.next(true);
          resolve();
        },
        onStompError: (frame) => {
          console.error('[WebSocket] STOMP error:', frame.headers['message']);
          console.error('[WebSocket] Error details:', frame);
          reject(new Error(frame.headers['message']));
        },
        onWebSocketError: (event) => {
          console.error('[WebSocket] WebSocket error:', event);
          reject(new Error('WebSocket connection failed'));
        }
      });

      console.log('[WebSocket] Activating STOMP client...');
      this.stompClient.activate();
    });
  }

  disconnect(): void {
    console.log('[WebSocket] Disconnecting...');
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.connected.next(false);
      console.log('[WebSocket] Disconnected');
    }
  }

  isConnected(): Observable<boolean> {
    return this.connected.asObservable();
  }

  subscribe(topic: string, callback: (message: any) => void): void {
    if (!this.stompClient?.connected) {
      console.error('[WebSocket] Cannot subscribe - not connected');
      return;
    }

    console.log('[WebSocket] Subscribing to topic:', topic);
    console.log('[WebSocket] Current connection state:', this.stompClient.connected);
    
    this.stompClient.subscribe(topic, (message: Message) => {
      console.log('[WebSocket] Raw message received:', message);
      try {
        const data = JSON.parse(message.body);
        console.log('[WebSocket] Parsed message on', topic, ':', data);
        callback(data);
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
        console.log('[WebSocket] Raw message body:', message.body);
        callback(message.body);
      }
    });
  }

  publish(destination: string, body: any): void {
    if (!this.stompClient?.connected) {
      console.error('[WebSocket] Cannot publish - not connected');
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

  send(destination: string, body: any) {
    if (!this.stompClient) {
      console.error('[WebSocket] Cannot send - client not initialized');
      return;
    }

    console.log('[WebSocket] Sending to', destination, ':', body);
    this.stompClient.publish({
      destination,
      body: JSON.stringify(body)
    });
  }
} 