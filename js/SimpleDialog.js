// SimpleDialog.js
class SimpleDialog {
  constructor(content, options = {}) {
    this.content = content;
    this.dialogEl = null;
    this.overlayEl = null;
    this.onClose = typeof options.onClose === 'function' ? options.onClose : null;
    this.createDialog();
  }

  createDialog() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'simple-dialog-overlay';
    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) this.close();
    });

    this.dialogEl = document.createElement('div');
    this.dialogEl.className = 'simple-dialog-box';

    if (typeof this.content === 'string') {
      const msg = document.createElement('div');
      msg.className = 'simple-dialog-message';
      msg.textContent = this.content;
      this.dialogEl.appendChild(msg);
    } else if (this.content instanceof HTMLElement) {
      this.dialogEl.appendChild(this.content);
    }


    this.overlayEl.appendChild(this.dialogEl);
  }

  show() {
    document.body.appendChild(this.overlayEl);
  }

  close() {
    if (this.overlayEl && this.overlayEl.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl);
      if (this.onClose) {
        this.onClose();
      }
    }
  }
}