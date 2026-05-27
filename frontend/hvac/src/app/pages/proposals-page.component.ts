import { Component } from '@angular/core';

@Component({
  selector: 'app-proposals-page',
  template: `
    <section class="panel">
      <h1>Proposals</h1>
      <p>This is a placeholder for proposal workflows.</p>
    </section>
  `,
  styles: `
    .panel {
      background: #ffffff;
      border: 1px solid #d8e2ef;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 10px 20px rgba(34, 56, 84, 0.08);
    }

    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.45rem;
      color: #1f3b58;
    }

    p {
      margin: 0;
      color: #35516e;
    }
  `
})
export class ProposalsPageComponent {}
