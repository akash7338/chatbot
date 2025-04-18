import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { v4 as uuid } from 'uuid';
import { ChatService } from './chat.service';

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  role: string = 'Akash';
  isAgentTyping = false;
  typingTimeout: any;
  sessionId = uuid();
  inputText = '';
  showOptions = true;
  selectedFlow = '';
  messages: { sender: string; text: string }[] = [];

  stompClient!: Client;

  constructor(private chatService: ChatService,private router: Router) {}

  ngOnInit() {
    this.setupWebSocketConnection();
    this.messages.push({ sender: 'bot', text: 'Hi! I\'m your assistant 🤖. What can I help you with today?' });
    
  }

  setupWebSocketConnection() {
    try {
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8080/chat-websocket'),
        reconnectDelay: 5000,
        debug: (msg) => console.log('[WebSocket Debug]', msg),
        onConnect: () => {
          console.log('[WebSocket] Connected ✅');
          this.stompClient.subscribe('/topic/messages', (message) => {
            const received = JSON.parse(message.body);
            this.messages.push({ sender: received.sender, text: received.message });
          });

          this.stompClient.subscribe('/topic/typing', (message) => {
            const data = JSON.parse(message.body);
          
            // Only care if user (Akash) is typing
            if (data.sender !== this.role) {
              this.isAgentTyping = data.typing === true || data.typing==='true';
            }
          });
        },
        onStompError: (frame) => {
          console.error('[WebSocket] STOMP error:', frame.headers['message']);
        }
      });

      this.stompClient.activate();
    } catch (e) {
      console.error('[WebSocket] Setup failed:', e);
    }
  }

  selectOption(option: string) {
    this.selectedFlow = option;
    const displayText = option === 'Agent' ? 'Talk to an Agent' : option;
    this.messages.push({ sender: this.role, text: displayText });
    this.showOptions = false;

    if (option === 'Agent') {
      this.messages.push({ sender: 'bot', text: 'Connecting you to a live agent...' });
    } else {
      this.chatService.sendMessage(this.sessionId, option).subscribe(response => {
        this.messages.push({ sender: 'bot', text: response });
      });
    }
  }

  sendMessage() {
    if (!this.inputText.trim()) return;

    const userText = this.inputText.trim();
    //this.messages.push({ sender: 'user', text: userText });

    if (this.selectedFlow === 'Agent') {
      const payload = {
        sender: this.role,
        message: userText,
        timestamp: new Date()
      };

      this.stompClient.publish({
        destination: '/app/sendMessage',
        body: JSON.stringify(payload)
      });

    } else {
      const fullMessage = `${this.selectedFlow}: ${userText}`;
      this.chatService.sendMessage(this.sessionId, fullMessage).subscribe(response => {
        this.messages.push({ sender: 'bot', text: response });
      });
    }

    this.inputText = '';
  }

  handleTyping() {
    if (!this.inputText || this.inputText.trim() === '') return; // ⛔ no typing on empty input

    console.log('[Typing] handleTyping() called');
    this.sendTyping(true);
    
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.sendTyping(false);
    }, 1000);
  }
  
  sendTyping(isTyping: boolean) {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/typing',
        body: JSON.stringify({
          sender: this.role,
          typing: isTyping
        })
      });
    }
  }

  logout() {
    localStorage.clear(); // or localStorage.removeItem('role') / 'username' if needed
    // window.location.href = '/login'; 
    this.router.navigate(['/login']);
  }
  
}
