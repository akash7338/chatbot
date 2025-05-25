import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { HttpClient } from '@angular/common/http';
import { AgentService } from './agent.service';

@Component({
  standalone: true,
  selector: 'app-agent',
  imports: [CommonModule, FormsModule],
  templateUrl: './agent.component.html',
  styleUrls: ['./agent.component.css'],
  providers: [AgentService] // ✅ provide the service
})
export class AgentComponent implements OnInit ,OnDestroy{
  role: string = 'agent';
  status: string = 'live'; // "live" by default
  username: string = '';
  typingUsername: string = '';
  isUserTyping = false;
  typingTimeout: any;
  inputText = '';
  messages: { sender: string; text: string }[] = [];
  assignedSessionId: string | null = null;
  pendingSessionOffer: { sessionId: string; expiresIn: number } | null = null;
  showOfferPopup = false;
  countdown = 0;
  timerRef: any;
  offerSessionId: string = '';
  offerCountdown: number = 10; // in seconds
  countdownInterval: any;



  stompClient!: Client;
  constructor(private http: HttpClient, private agentService: AgentService) { }

  ngOnDestroy() {
    if (this.timerRef) clearInterval(this.timerRef);
  }
  

  ngOnInit() {
    this.username = localStorage.getItem('username') || '';

    this.agentService.getAgentStatus(this.username).subscribe({
      next: (res) => {
        console.log('[Status from backend]', res.status.toLowerCase());
        this.status = res.status.toLowerCase();
      },
      error: () => this.status = 'live'
    });

    this.setupWebSocketConnection();
  }

  //Old implemetation without confirm-decline offer

  // setupWebSocketConnection() {
  //   this.stompClient = new Client({
  //     webSocketFactory: () => new SockJS('http://localhost:8080/chat-websocket'),
  //     connectHeaders: {
  //       username: localStorage.getItem('username') || ''
  //     },
  //     reconnectDelay: 5000,
  //     debug: (msg) => console.log('[Agent WS]', msg),
  //     onConnect: () => {
  //       console.log('[Agent] Connected ✅');
  //       this.stompClient.subscribe('/topic/agent-status', (message) => {
  //         const data = JSON.parse(message.body);
  //         console.log("The status changed to ", data.status);
  //         if (data.username === this.username) {
  //           this.status = data.status.toLowerCase(); // updates UI
  //         }
  //       });
  //       // 💡 Wait for assigned session
  //       this.stompClient.subscribe('/topic/session-assignments-all', (message) => {
  //         const data = JSON.parse(message.body);
  //         if (data.agent === this.username) {
  //           const sessionId = data.sessionId;

  //           console.log('[Agent] Assigned to session:', sessionId);

  //           // Subscribe to session-specific messages
  //           this.stompClient.subscribe(`/topic/messages/${sessionId}`, (msg) => {
  //             const received = JSON.parse(msg.body);
  //             this.messages.push({ sender: received.sender, text: received.message });
  //           });

  //           // ✅ ✅ Subscribe to typing after assignment
  //           this.stompClient.subscribe(`/topic/typing/${sessionId}`, (message) => {
  //             const data = JSON.parse(message.body);
  //             if (data.senderType !== this.role) {
  //               this.isUserTyping = data.typing === 'true' || data.typing === true;
  //               this.typingUsername = data.sender;
  //             }
  //           });

  //           this.assignedSessionId = sessionId;
  //         }
  //       });

  //     },
  //     onStompError: (frame) => {
  //       console.error('[Agent WS] STOMP error:', frame.headers['message']);
  //     }
  //   });

  //   this.stompClient.activate();
  // }


  //New Implementation with confirm-decline
  setupWebSocketConnection() {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/chat-websocket'),
      connectHeaders: {
        username: localStorage.getItem('username') || ''
      },
      reconnectDelay: 5000,
      debug: (msg) => console.log('[Agent WS]', msg),
      onConnect: () => {
        console.log('[Agent] Connected ✅');

        // ✅ Agent status updates
        this.stompClient.subscribe('/topic/agent-status', (message) => {
          const data = JSON.parse(message.body);
          console.log("The status changed to ", data.status);
          if (data.username === this.username) {
            this.status = data.status.toLowerCase(); // updates UI
          }
        });

        // ✅ New session offer with confirm/decline
        this.stompClient.subscribe('/topic/session-assignments-all', (message) => {
          const data = JSON.parse(message.body);
          if (data.agent === this.username) {
            console.log('[Agent] Received session offer:', data);
            this.pendingSessionOffer = {
              sessionId: data.sessionId,
              expiresIn: data.expiresIn || 10
            };
            this.showOfferPopup = true;
            this.startCountdownTimer(data.expiresIn);
          }
        });
      },
      onStompError: (frame) => {
        console.error('[Agent WS] STOMP error:', frame.headers['message']);
      }
    });

    this.stompClient.activate();
  }



  sendMessage() {
    if (!this.inputText.trim() || !this.assignedSessionId) return;

    const payload = {
      sender: this.username,
      message: this.inputText.trim(),
      sessionId: this.assignedSessionId // ✅ include sessionId
    };

    this.stompClient.publish({
      destination: `/app/sendMessage`, // ✅ keep it generic because backend handles sending to correct session
      body: JSON.stringify(payload)
    });


    this.inputText = '';
  }


  handleTyping() {
    this.sendTyping(true);

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.sendTyping(false);
    }, 1000);
  }

  sendTyping(isTyping: boolean) {
    if (this.stompClient && this.stompClient.connected && this.assignedSessionId) {
      this.stompClient.publish({
        destination: '/app/typing',
        body: JSON.stringify({
          sender: this.username,
          senderType: this.role,
          typing: isTyping,
          sessionId: this.assignedSessionId // ✅ required
        })
      });
    }
  }


  updateAgentStatus(status: string) {
    const username = localStorage.getItem('username')!;
    this.agentService.updateStatus(username, status).subscribe({
      next: () => console.log('Status updated'),
      error: (err) => console.error('Failed to update status', err)
    });
  }

  onStatusChange() {
    this.updateAgentStatus(this.status);
  }



  logout() {
    const username = localStorage.getItem('username');
    if (username) {
      this.http.post('http://localhost:8080/api/auth/logout', { username }).subscribe(() => {
        console.log('✅ Agent unregistered from backend');
      });
    }
  
    localStorage.clear();
    window.location.href = '/login';
  }
  
  startCountdownTimer(seconds: number) {
    this.countdown = seconds;
    this.timerRef = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.clearOfferPopup();
      }
    }, 1000);
  }

  clearOfferPopup() {
    this.pendingSessionOffer = null;
    this.showOfferPopup = false;
    clearInterval(this.timerRef);
  }
  acceptOffer() {
    if (!this.pendingSessionOffer) return;
    const sessionId = this.pendingSessionOffer.sessionId;
  
    this.agentService.acceptOffer(sessionId, this.username).subscribe(() => {
      this.assignedSessionId = sessionId;
      this.subscribeToSession(sessionId);
      this.clearOfferPopup();
    });
  }
  
  declineOffer() {
    if (!this.pendingSessionOffer) return;
    const sessionId = this.pendingSessionOffer.sessionId;
  
    this.agentService.declineOffer(sessionId, this.username).subscribe(() => {
      this.clearOfferPopup();
    });
  }
  

  subscribeToSession(sessionId: string) {
      //this is the topic where the user will send the messages to the agent
    this.stompClient.subscribe(`/topic/messages/${sessionId}`, (msg) => {
      const received = JSON.parse(msg.body);
      this.messages.push({ sender: received.sender, text: received.message });
    });

    this.stompClient.subscribe(`/topic/typing/${sessionId}`, (message) => {
      const data = JSON.parse(message.body);
      if (data.senderType !== this.role) {
        this.isUserTyping = data.typing === 'true' || data.typing === true;
        this.typingUsername = data.sender;
      }
    });
  }


}
