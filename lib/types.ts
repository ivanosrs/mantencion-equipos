export type UserRole = 'admin' | 'technician';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  location: string;
  status: 'operational' | 'in_maintenance' | 'out_of_service';
  last_maintenance_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PublicEquipment {
  id: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  location: string;
  status: 'operational' | 'in_maintenance' | 'out_of_service';
  last_maintenance_date?: string;
}

export type ServiceType = 'preventive' | 'install_uninstall' | 'corrective' | 'training' | 'followup';

export interface WorkOrder {
  id: string;
  equipment_id: string;
  ot_number: string;
  intervention_date: string;
  client_name: string;
  client_address?: string;
  client_phone?: string;
  problem_description?: string;
  service_type: ServiceType;
  actions_checklist: string[];
  technician_id: string;
  client_conformity_name?: string;
  client_conformity_rut?: string;
  client_signature_path?: string;
  client_received_ok?: boolean;
  attachment_path?: string;
  created_at: string;
}

export interface WorkOrderPart {
  id: string;
  work_order_id: string;
  code?: string;
  description: string;
  quantity: number;
  observations?: string;
}

export interface WorkOrderWithParts extends WorkOrder {
  parts: WorkOrderPart[];
}
