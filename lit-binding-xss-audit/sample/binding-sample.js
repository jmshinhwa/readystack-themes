import { LitElement, html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

export class TicketCard extends LitElement {
  static properties = {
    note: { type: String },
    badge: { type: String },
    docsUrl: { type: String },
    tag: { type: String },
    accent: { type: String },
    preview: { type: String }
  };

  render() {
    const tag = unsafeStatic(this.tag);
    return html`
      <style>
        .card { border-left: 4px solid ${this.accent}; }
      </style>
      <article class="card">
        <h2>${this.title}</h2>
        <div class="note">${unsafeHTML(this.note)}</div>
        <div class="badge">${unsafeSVG(this.badge)}</div>
        <a href="${this.docsUrl}">Open the ticket</a>
        <a href="javascript:void(0)">Print</a>
        <button onclick="${this.handler}">Assign</button>
        <div .innerHTML=${this.preview}></div>
        <iframe srcdoc="${this.preview}"></iframe>
        ${staticHtml`<${tag}>${this.note}</${tag}>`}
        <script>
          window.__ticket = "${this.title}";
        </script>
      </article>
    `;
  }

  firstUpdated() {
    this.renderRoot.querySelector('.note').innerHTML = this.note;
    this.renderRoot.querySelector('.card').insertAdjacentHTML('beforeend', this.badge);
    document.write('<!-- ticket ' + this.title + ' -->');
  }
}

customElements.define('ticket-card', TicketCard);
