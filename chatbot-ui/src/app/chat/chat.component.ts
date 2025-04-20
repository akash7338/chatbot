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
  role: string = 'user';
  isAgentTyping = false;
  typingTimeout: any;
  sessionId :string =' ';
  inputText = '';
  showOptions = true;
  selectedFlow = '';
  messages: { sender: string; text: string }[] = [];
  assignedAgentSessionId: string | null = null;
  username: string = '';
  typingUsername: string = '';


  stompClient!: Client;

  constructor(private chatService: ChatService, private router: Router) { }

  ngOnInit() {
    const storedSession = localStorage.getItem('sessionId');
    this.sessionId = storedSession || uuid();
    localStorage.setItem('sessionId', this.sessionId);
  
    this.username = localStorage.getItem('username') || '';
    this.setupWebSocketConnection();
  
    const selectedFlow = localStorage.getItem('selectedFlow');
    if (selectedFlow) {
      this.selectedFlow = selectedFlow;
      this.showOptions = false;
  
      if (selectedFlow !== 'Agent') {
        this.messages.push({ sender: 'bot', text: 'Welcome back! Continue your session.' });
      }
      // ✅ For Agent, reconnect will be called only when WS is connected
    } else {
      this.messages.push({ sender: 'bot', text: 'Hi! I\'m your assistant 🤖. What can I help you with today?' });
    }
  }
  
  
  setupWebSocketConnection() {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/chat-websocket'),
      connectHeaders: {
        username: localStorage.getItem('username') || ''
      },
      reconnectDelay: 5000, // 🔁 Reconnect every 5s
      debug: (msg) => console.log('[WebSocket Debug]', msg),
  
      onConnect: () => {
        console.log('[WebSocket] Connected ✅');
  
        // 🧠 Only reconnect if Agent flow is active
        //keep any subscribe inside onconnect because chances are u subscribe even without a stomp connection
        //or subscribe after you are sure that the STOMP conn is established
        const selectedFlow = localStorage.getItem('selectedFlow');
        if (selectedFlow === 'Agent') {
          this.reconnectToAgentSession();
        }
      },
  
      onStompError: (frame) => {
        console.error('[STOMP Protocol Error]', frame.headers['message']);
      },
  
      onWebSocketError: (event) => {
        console.error('[WebSocket Connection Error]', event);
      },
  
      onWebSocketClose: (event) => {
        console.warn('[WebSocket Closed]', event.reason || 'no reason');
      }
    });
  
    this.stompClient.activate();
  }
  


  selectOption(option: string) {
    this.selectedFlow = option;
    localStorage.setItem('selectedFlow', option);
    const displayText = option === 'Agent' ? 'Talk to an Agent' : option;
    this.messages.push({ sender: this.username, text: displayText });
    this.showOptions = false;

    if (option === 'Agent') {
      this.messages.push({ sender: 'bot', text: 'Connecting you to a live agent...' });

      // 🔁 Hit backend for assignment
      this.chatService.assignAgent(this.sessionId).subscribe({
        next: (res) => {
          this.assignedAgentSessionId = this.sessionId;

          // Subscribe to session-based topic
          this.stompClient.subscribe(`/topic/messages/${this.sessionId}`, (message) => {
            const received = JSON.parse(message.body);
            this.messages.push({ sender: received.sender, text: received.message });
          });

          // ✅ Subscribe to session-specific typing updates
          this.stompClient.subscribe(`/topic/typing/${this.sessionId}`, (message) => {
            const data = JSON.parse(message.body);
            if (data.senderType !== this.role) {
              this.isAgentTyping = data.typing === true || data.typing === 'true';
              this.typingUsername = data.sender;
            }
          });

          this.messages.push({ sender: 'bot', text: 'Agent connected! You can start chatting.' });
        },
        error: () => {
          this.messages.push({ sender: 'bot', text: 'All agents are currently busy. Please try again later.' });
        }
      });
    }
    else {
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
        sender: this.username,
        message: userText,
        sessionId:this.assignedAgentSessionId,
        timestamp: new Date()
      };

      this.stompClient.publish({
        destination: `/app/sendMessage`,
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
    if (this.stompClient && this.stompClient.connected && this.assignedAgentSessionId) {
      this.stompClient.publish({
        destination: '/app/typing',
        body: JSON.stringify({
          sender: this.username,
          senderType:this.role,
          typing: isTyping,
          sessionId: this.assignedAgentSessionId
        })
      });
    }
  }

  reconnectToAgentSession() {
    this.assignedAgentSessionId = localStorage.getItem('sessionId');
    if (!this.assignedAgentSessionId) return;
  
    this.stompClient.subscribe(`/topic/messages/${this.assignedAgentSessionId}`, (message) => {
      const received = JSON.parse(message.body);
      this.messages.push({ sender: received.sender, text: received.message });
    });
  
    this.stompClient.subscribe(`/topic/typing/${this.assignedAgentSessionId}`, (message) => {
      const data = JSON.parse(message.body);
      if (data.senderType !== this.role) {
        this.isAgentTyping = data.typing === true || data.typing === 'true';
        this.typingUsername = data.sender;
      }
    });
  
    this.messages.push({ sender: 'bot', text: 'Reconnected to agent session. ✅' });
  }
  
  

  logout() {
    localStorage.clear(); // or localStorage.removeItem('role') / 'username' if needed
    // window.location.href = '/login'; 
    this.router.navigate(['/login']);
  }

}
