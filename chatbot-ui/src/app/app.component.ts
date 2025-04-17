import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true, // ✅ Make sure it's marked standalone
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'] // ✅ FIXED: should be styleUrls
})
export class AppComponent {
  title = 'chatbot-ui';
}
