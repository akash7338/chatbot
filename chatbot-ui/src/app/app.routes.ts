import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ChatComponent } from './chat/chat.component';
import { AgentComponent } from './agent/agent.component';
import { authGuard } from './auth.guard'; // 👈 import the guard

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'user', component: ChatComponent, canActivate: [authGuard] },
  { path: 'agent', component: AgentComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
