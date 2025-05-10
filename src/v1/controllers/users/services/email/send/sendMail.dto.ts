export interface SendMail {
    email: string;
    subject: string;
    mailBodyHtml: string;
    mailBodyText?: string;
    secure?: boolean;
    port?: number;
    connectionTimeout?: number;
  }