/**
 * PayPal Disputes API and Agent Triage Types
 */

export interface PayPalMoney {
  currency_code: string;
  value: string;
}

export interface PayPalHateoasLink {
  href: string;
  rel: string;
  method: string;
  encType?: string;
}

export interface DisputedTransaction {
  seller_transaction_id: string;
  buyer_transaction_id?: string;
  gross_amount: PayPalMoney;
  invoice_number?: string;
  custom?: string;
  buyer?: {
    name?: string;
    email?: string;
    phone?: {
      national_number?: string;
    };
  };
  seller?: {
    email?: string;
    merchant_id?: string;
    name?: string;
  };
  items?: Array<{
    item_name: string;
    item_id?: string;
    quantity: string;
    item_cost: PayPalMoney;
  }>;
}

export interface DisputeMessage {
  posted_by: 'BUYER' | 'SELLER' | 'PAYPAL';
  time_posted: string;
  content: string;
}

export interface PayPalDispute {
  dispute_id: string;
  create_time: string;
  update_time: string;
  dispute_amount: PayPalMoney;
  status: 'OPENED' | 'WAITING_FOR_BUYER_RESPONSE' | 'WAITING_FOR_SELLER_RESPONSE' | 'UNDER_REVIEW' | 'RESOLVED';
  reason: 
    | 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED'
    | 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED'
    | 'UNAUTHORISED'
    | 'CREDIT_NOT_PROCESSED'
    | 'DUPLICATE_TRANSACTION'
    | 'INCORRECT_TRANSACTION_AMOUNT'
    | 'PAYMENT_BY_OTHER_MEANS'
    | 'CANCELED_RECURRING_BILLING'
    | 'PROBLEM_WITH_REMITTANCE'
    | 'OTHER';
  dispute_state?: string;
  dispute_life_cycle_stage: 'INQUIRY' | 'CHARGEBACK' | 'PRE_ARBITRATION' | 'ARBITRATION';
  dispute_channel?: 'INTERNAL' | 'ACH' | 'EXTERNAL';
  seller_response_due_date?: string;
  disputed_transactions: DisputedTransaction[];
  messages?: DisputeMessage[];
  allowed_response_options?: string[];
  links?: PayPalHateoasLink[];
}

export interface ShipmentTrackingInfo {
  transaction_id: string;
  tracking_number: string;
  carrier: string;
  carrier_name_other?: string;
  status: 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'ON_HOLD' | 'CANCELLED';
  shipment_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
}

export interface DisputeContextBundle {
  dispute: PayPalDispute;
  order?: Record<string, any>;
  transaction?: Record<string, any>;
  shipmentTracking?: ShipmentTrackingInfo[];
  buyerMessages: DisputeMessage[];
  rawDisputeJson: string;
}

export interface RedactedContextBundle {
  disputeId: string;
  reason: string;
  amount: string;
  currency: string;
  dueDate?: string;
  lifeCycleStage: string;
  allowedResponseOptions: string[];
  sanitizedOrderInfo: Record<string, any>;
  sanitizedShipmentInfo: Array<{
    carrier: string;
    trackingNumber: string;
    status: string;
    deliveryDate?: string;
  }>;
  sanitizedMessages: Array<{
    from: string;
    date: string;
    content: string;
  }>;
  redactionAudit: {
    emailsRedactedCount: number;
    namesRedactedCount: number;
    phonesRedactedCount: number;
    addressesRedactedCount: number;
  };
}

export interface EvidenceChecklistItem {
  sourceField: string;
  claimedFact: string;
  verified: boolean;
  notes: string;
}

export interface TriageVerdict {
  disputeId: string;
  recommendation: 'FIGHT' | 'ACCEPT';
  confidenceScore: number;
  summaryReason: string;
  evidenceChecklist: EvidenceChecklistItem[];
  proposedDraftNotes: string;
  evidenceTypeRequired: 'PROOF_OF_FULFILLMENT' | 'PROOF_OF_REFUND' | 'OTHER';
  missingEvidenceWarnings: string[];
  riskAnalysis: string;
}

export type DisputeQueueStatus = 
  | 'NEEDS_TRIAGE'
  | 'AWAITING_APPROVAL'
  | 'EVIDENCE_SUBMITTED'
  | 'CLAIM_ACCEPTED'
  | 'RESOLVED';
