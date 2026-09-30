# Integration Roadmap

## Current Status

### ✅ Working
- **CSV Import/Export** — Import cash transactions, revenue, expenses, loans, and obligations via CSV
- **Manual Data Entry** — Full CRUD for financing accounts, cash flows, and obligations

### 🚧 Mocked / Not Configured
- **Bank API** — Direct bank connection for automatic transaction sync
- **Accounting Software** — QuickBooks, Xero, or other accounting system integration

## Planned Integrations

### 1. Bank API Integration

**Status:** Not started

**Description:** Direct connection to bank accounts for automatic transaction sync.

**Provider Interface:**
```typescript
interface BankProvider {
  name: string;
  connect(credentials: BankCredentials): Promise<BankConnection>;
  fetchTransactions(accountId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getAccounts(): Promise<BankAccount[]>;
}
```

**Planned Providers:**
- Plaid (US/Canada)
- TrueLayer (EU/UK)
- Yodlee (Global)

### 2. Accounting Software Integration

**Status:** Not started

**Description:** Sync with accounting systems for automated data import.

**Provider Interface:**
```typescript
interface AccountingProvider {
  name: string;
  connect(credentials: AccountingCredentials): Promise<AccountingConnection>;
  syncInvoices(): Promise<Invoice[]>;
  syncBills(): Promise<Bill[]>;
  syncChartOfAccounts(): Promise<Account[]>;
}
```

**Planned Providers:**
- QuickBooks Online
- Xero
- Sage Business Cloud

### 3. Email Notifications

**Status:** Not started

**Description:** Send alert notifications via email.

**Provider Interface:**
```typescript
interface EmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendAlertEmail(alert: Alert, recipient: User): Promise<void>;
}
```

**Planned Providers:**
- SendGrid
- AWS SES
- Postmark

### 4. SMS Notifications

**Status:** Not started

**Description:** Send critical alerts via SMS.

**Provider Interface:**
```typescript
interface SMSProvider {
  sendSMS(phoneNumber: string, message: string): Promise<void>;
}
```

**Planned Providers:**
- Twilio
- AWS SNS

## Implementation Priority

1. **Bank API** — Highest priority for automatic data sync
2. **Accounting Software** — High priority for data accuracy
3. **Email Notifications** — Medium priority for alert delivery
4. **SMS Notifications** — Lower priority for critical alerts only

## Security Considerations

- All API credentials encrypted at rest
- OAuth 2.0 for bank and accounting integrations
- No credentials stored in plain text
- Regular security audits for all integrations
