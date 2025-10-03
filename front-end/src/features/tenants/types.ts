export interface Tenant {
  id: number;
  tenant_id: string;
  full_name: string;
  sex: string;
  phone: string;
  city: string;
  subcity: string;
  woreda?: string;
  house_no?: string;
  organization?: string;
  has_agent: boolean;
  agent_full_name?: string;
  agent_sex?: string;
  agent_phone?: string;
  agent_city?: string;
  agent_subcity?: string;
  agent_woreda?: string;
  agent_house_no?: string;
  authentication_no?: string;
  authentication_date?: string;
  property_name?: string;
  unit_number?: string;
  monthly_rent?: number;
  contract_status?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  days_until_expiry?: number | null;
  days_until_next_payment?: number | null;
  termination_date?: string;
  termination_reason?: string;
  termination_notes?: string;
  status?: string;
  is_active?: number;
  termination_details?: {
    reason: string;
    deposit_action: string;
    deposit_returned: number;
    deductions: Array<{ description: string; amount: number }>;
    notes: string;
  };
}
export interface ContractHistory {
 id: number;
 property_name: string;
 unit_number: string;
 contract_start_date: string;
 contract_end_date: string;
 monthly_rent: number;
 deposit: number;
 status: string;
 status_display: string;
 actual_end_date?: string;
 termination_reason?: string;
 created_at: string;
}