export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          territory: string;
          employee_id: string;
          department: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string;
          territory?: string;
          employee_id?: string;
          department?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          territory?: string;
          employee_id?: string;
          department?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          check_in_at: string | null;
          check_out_at: string | null;
          check_in_lat: number | null;
          check_in_lng: number | null;
          check_out_lat: number | null;
          check_out_lng: number | null;
          check_in_address: string;
          check_out_address: string;
          notes: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          check_in_lat?: number | null;
          check_in_lng?: number | null;
          check_out_lat?: number | null;
          check_out_lng?: number | null;
          check_in_address?: string;
          check_out_address?: string;
          notes?: string;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          check_in_lat?: number | null;
          check_in_lng?: number | null;
          check_out_lat?: number | null;
          check_out_lng?: number | null;
          check_in_address?: string;
          check_out_address?: string;
          notes?: string;
          date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone: string;
          status: Database['public']['Enums']['lead_status'];
          value: number;
          notes: string;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          company_name: string;
          contact_name: string;
          email?: string;
          phone?: string;
          status?: Database['public']['Enums']['lead_status'];
          value?: number;
          notes?: string;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          contact_name?: string;
          email?: string;
          phone?: string;
          status?: Database['public']['Enums']['lead_status'];
          value?: number;
          notes?: string;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      follow_ups: {
        Row: {
          id: string;
          user_id: string;
          lead_id: string | null;
          title: string;
          description: string;
          due_date: string;
          completed: boolean;
          priority: Database['public']['Enums']['follow_up_priority'];
          type: Database['public']['Enums']['follow_up_type'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          lead_id?: string | null;
          title: string;
          description?: string;
          due_date: string;
          completed?: boolean;
          priority?: Database['public']['Enums']['follow_up_priority'];
          type?: Database['public']['Enums']['follow_up_type'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lead_id?: string | null;
          title?: string;
          description?: string;
          due_date?: string;
          completed?: boolean;
          priority?: Database['public']['Enums']['follow_up_priority'];
          type?: Database['public']['Enums']['follow_up_type'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follow_ups_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_visits: {
        Row: {
          id: string;
          user_id: string;
          lead_id: string | null;
          customer_name: string;
          company_name: string;
          visit_date: string;
          latitude: number | null;
          longitude: number | null;
          address: string;
          purpose: Database['public']['Enums']['visit_purpose'];
          outcome: string;
          next_action: string;
          duration_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          lead_id?: string | null;
          customer_name: string;
          company_name?: string;
          visit_date: string;
          latitude?: number | null;
          longitude?: number | null;
          address?: string;
          purpose?: Database['public']['Enums']['visit_purpose'];
          outcome?: string;
          next_action?: string;
          duration_minutes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lead_id?: string | null;
          customer_name?: string;
          company_name?: string;
          visit_date?: string;
          latitude?: number | null;
          longitude?: number | null;
          address?: string;
          purpose?: Database['public']['Enums']['visit_purpose'];
          outcome?: string;
          next_action?: string;
          duration_minutes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_visits_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
      };
      sales_persons: {
        Row: {
          id: number;
          name: string;
          email: string;
          mobile: string;
          is_active: boolean | null;
          created_at: string;
          user_id: number | null;
          designation: string | null;
          department: string | null;
          date_of_joining: string | null;
          address: string | null;
          emergency_contact: string | null;
          pan_no: string | null;
          bank_name: string | null;
          bank_account_no: string | null;
          ifsc_code: string | null;
          manager_id: number | null;
        };
        Insert: {
          id?: number;
          name: string;
          email: string;
          mobile?: string;
          is_active?: boolean | null;
          created_at?: string;
          user_id?: number | null;
          designation?: string | null;
          department?: string | null;
          date_of_joining?: string | null;
          address?: string | null;
          emergency_contact?: string | null;
          pan_no?: string | null;
          bank_name?: string | null;
          bank_account_no?: string | null;
          ifsc_code?: string | null;
          manager_id?: number | null;
        };
        Update: {
          id?: number;
          name?: string;
          email?: string;
          mobile?: string;
          is_active?: boolean | null;
          created_at?: string;
          user_id?: number | null;
          designation?: string | null;
          department?: string | null;
          date_of_joining?: string | null;
          address?: string | null;
          emergency_contact?: string | null;
          pan_no?: string | null;
          bank_name?: string | null;
          bank_account_no?: string | null;
          ifsc_code?: string | null;
          manager_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_sales_persons_user';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_persons_manager_id_fkey';
            columns: ['manager_id'];
            isOneToOne: false;
            referencedRelation: 'sales_persons';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          id: number;
          username: string | null;
          password: string | null;
          role: string;
          is_active: boolean | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          last_login: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          username?: string | null;
          password?: string | null;
          role?: string;
          is_active?: boolean | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          last_login?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          username?: string | null;
          password?: string | null;
          role?: string;
          is_active?: boolean | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          last_login?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      sales_attendance: {
        Row: {
          id: number;
          sales_person_id: number;
          user_id: number | null;
          attendance_date: string;
          check_in_at: string;
          check_out_at: string | null;
          check_in_lat: number;
          check_in_lng: number;
          check_in_accuracy_meters: number | null;
          check_out_lat: number | null;
          check_out_lng: number | null;
          check_out_accuracy_meters: number | null;
          site_name: string | null;
          site_address: string | null;
          customer_id: number | null;
          job_id: number | null;
          visit_purpose: string | null;
          notes: string | null;
          photo_path: string | null;
          status: string;
          approval_status: string;
          device_info: string | null;
          ip_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          sales_person_id: number;
          user_id?: number | null;
          attendance_date?: string;
          check_in_at?: string;
          check_out_at?: string | null;
          check_in_lat: number;
          check_in_lng: number;
          check_in_accuracy_meters?: number | null;
          check_out_lat?: number | null;
          check_out_lng?: number | null;
          check_out_accuracy_meters?: number | null;
          site_name?: string | null;
          site_address?: string | null;
          customer_id?: number | null;
          job_id?: number | null;
          visit_purpose?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          status?: string;
          approval_status?: string;
          device_info?: string | null;
          ip_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          sales_person_id?: number;
          user_id?: number | null;
          attendance_date?: string;
          check_in_at?: string;
          check_out_at?: string | null;
          check_in_lat?: number;
          check_in_lng?: number;
          check_in_accuracy_meters?: number | null;
          check_out_lat?: number | null;
          check_out_lng?: number | null;
          check_out_accuracy_meters?: number | null;
          site_name?: string | null;
          site_address?: string | null;
          customer_id?: number | null;
          job_id?: number | null;
          visit_purpose?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          status?: string;
          approval_status?: string;
          device_info?: string | null;
          ip_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sales_attendance_sales_person_id_fkey';
            columns: ['sales_person_id'];
            isOneToOne: false;
            referencedRelation: 'sales_persons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_attendance_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      sales_followups: {
        Row: {
          id: number;
          sales_person_id: number;
          customer_id: number | null;
          job_id: number | null;
          title: string;
          followup_at: string;
          location_name: string | null;
          notes: string | null;
          status: string;
          created_by: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          sales_person_id: number;
          customer_id?: number | null;
          job_id?: number | null;
          title: string;
          followup_at: string;
          location_name?: string | null;
          notes?: string | null;
          status?: string;
          created_by?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          sales_person_id?: number;
          customer_id?: number | null;
          job_id?: number | null;
          title?: string;
          followup_at?: string;
          location_name?: string | null;
          notes?: string | null;
          status?: string;
          created_by?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sales_followups_sales_person_id_fkey';
            columns: ['sales_person_id'];
            isOneToOne: false;
            referencedRelation: 'sales_persons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_followups_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customer_master';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_followups_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_followups_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      sales_followup_reminders: {
        Row: {
          id: number;
          followup_id: number;
          reminder_type: string;
          remind_at: string;
          channel: string;
          status: string;
          sent_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          followup_id: number;
          reminder_type: string;
          remind_at: string;
          channel?: string;
          status?: string;
          sent_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          followup_id?: number;
          reminder_type?: string;
          remind_at?: string;
          channel?: string;
          status?: string;
          sent_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sales_followup_reminders_followup_id_fkey';
            columns: ['followup_id'];
            isOneToOne: false;
            referencedRelation: 'sales_followups';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_logs: {
        Row: {
          id: number;
          followup_id: number | null;
          reminder_id: number | null;
          sales_person_id: number | null;
          channel: string;
          recipient_phone: string;
          message: string;
          provider: string | null;
          provider_message_id: string | null;
          status: string;
          error_message: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          followup_id?: number | null;
          reminder_id?: number | null;
          sales_person_id?: number | null;
          channel: string;
          recipient_phone: string;
          message: string;
          provider?: string | null;
          provider_message_id?: string | null;
          status?: string;
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          followup_id?: number | null;
          reminder_id?: number | null;
          sales_person_id?: number | null;
          channel?: string;
          recipient_phone?: string;
          message?: string;
          provider?: string | null;
          provider_message_id?: string | null;
          status?: string;
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_logs_followup_id_fkey';
            columns: ['followup_id'];
            isOneToOne: false;
            referencedRelation: 'sales_followups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_logs_reminder_id_fkey';
            columns: ['reminder_id'];
            isOneToOne: false;
            referencedRelation: 'sales_followup_reminders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_logs_sales_person_id_fkey';
            columns: ['sales_person_id'];
            isOneToOne: false;
            referencedRelation: 'sales_persons';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          id: number;
          role_name: string;
        };
        Insert: {
          id?: number;
          role_name: string;
        };
        Update: {
          id?: number;
          role_name?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: number;
          user_id: number;
          role_id: number;
        };
        Insert: {
          id?: number;
          user_id: number;
          role_id: number;
        };
        Update: {
          id?: number;
          user_id?: number;
          role_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          }
        ];
      };
      quotations: {
        Row: {
          id: number;
          quotation_no: string;
          enquiry_id: number;
          company_id: number | null;
          customer_id: number | null;
          sales_person_id: number | null;
          assigned_to_user_id: number | null;
          prepared_by_user_id: number | null;
          quotation_date: string;
          validity_date: string | null;
          currency: string | null;
          subtotal: number | null;
          tax_amount: number | null;
          discount_amount: number | null;
          total_amount: number | null;
          status: string | null;
          customer_remark: string | null;
          internal_remark: string | null;
          approved_at: string | null;
          converted_to_job_id: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          quotation_no: string;
          enquiry_id: number;
          company_id?: number | null;
          customer_id?: number | null;
          sales_person_id?: number | null;
          assigned_to_user_id?: number | null;
          prepared_by_user_id?: number | null;
          quotation_date?: string;
          validity_date?: string | null;
          currency?: string | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          discount_amount?: number | null;
          total_amount?: number | null;
          status?: string | null;
          customer_remark?: string | null;
          internal_remark?: string | null;
          approved_at?: string | null;
          converted_to_job_id?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          quotation_no?: string;
          enquiry_id?: number;
          company_id?: number | null;
          customer_id?: number | null;
          sales_person_id?: number | null;
          assigned_to_user_id?: number | null;
          prepared_by_user_id?: number | null;
          quotation_date?: string;
          validity_date?: string | null;
          currency?: string | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          discount_amount?: number | null;
          total_amount?: number | null;
          status?: string | null;
          customer_remark?: string | null;
          internal_remark?: string | null;
          approved_at?: string | null;
          converted_to_job_id?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quotations_enquiry_id_fkey';
            columns: ['enquiry_id'];
            isOneToOne: false;
            referencedRelation: 'enquiries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotations_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotations_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customer_master';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotations_sales_person_id_fkey';
            columns: ['sales_person_id'];
            isOneToOne: false;
            referencedRelation: 'sales_persons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotations_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotations_prepared_by_user_id_fkey';
            columns: ['prepared_by_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotations_converted_to_job_id_fkey';
            columns: ['converted_to_job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          }
        ];
      };
      enquiries: {
        Row: {
          id: number;
          enquiry_no: string | null;
          company_id: number | null;
          enq_date: string | null;
          customer_id: number | null;
          customer_name: string | null;
          customer_address: string | null;
          customer_gst: string | null;
          shipper_id: number | null;
          shipper: string | null;
          cnee_id: number | null;
          cnee: string | null;
          sales_person_id: number | null;
          seals_person: string | null;
          mode_id: number | null;
          pol_country: string | null;
          pol: string | null;
          pod_country: string | null;
          pod: string | null;
          commodity: string | null;
          packages: string | null;
          packages_unit: string | null;
          gross_weight: string | null;
          gross_weight_unit: string | null;
          cbm: string | null;
          usd_exchange_rate: number | null;
          eur_exchange_rate: number | null;
          gbp_exchange_rate: number | null;
          status: string | null;
          cancel_remark: string | null;
          job_id: number | null;
          created_at: string;
          updated_at: string;
          assigned_to_user_id: number | null;
        };
        Insert: {
          id?: number;
          enquiry_no?: string | null;
          company_id?: number | null;
          enq_date?: string | null;
          customer_id?: number | null;
          customer_name?: string | null;
          customer_address?: string | null;
          customer_gst?: string | null;
          shipper_id?: number | null;
          shipper?: string | null;
          cnee_id?: number | null;
          cnee?: string | null;
          sales_person_id?: number | null;
          seals_person?: string | null;
          mode_id?: number | null;
          pol_country?: string | null;
          pol?: string | null;
          pod_country?: string | null;
          pod?: string | null;
          commodity?: string | null;
          packages?: string | null;
          packages_unit?: string | null;
          gross_weight?: string | null;
          gross_weight_unit?: string | null;
          cbm?: string | null;
          usd_exchange_rate?: number | null;
          eur_exchange_rate?: number | null;
          gbp_exchange_rate?: number | null;
          status?: string | null;
          cancel_remark?: string | null;
          job_id?: number | null;
          created_at?: string;
          updated_at?: string;
          assigned_to_user_id?: number | null;
        };
        Update: {
          id?: number;
          enquiry_no?: string | null;
          company_id?: number | null;
          enq_date?: string | null;
          customer_id?: number | null;
          customer_name?: string | null;
          customer_address?: string | null;
          customer_gst?: string | null;
          shipper_id?: number | null;
          shipper?: string | null;
          cnee_id?: number | null;
          cnee?: string | null;
          sales_person_id?: number | null;
          seals_person?: string | null;
          mode_id?: number | null;
          pol_country?: string | null;
          pol?: string | null;
          pod_country?: string | null;
          pod?: string | null;
          commodity?: string | null;
          packages?: string | null;
          packages_unit?: string | null;
          gross_weight?: string | null;
          gross_weight_unit?: string | null;
          cbm?: string | null;
          usd_exchange_rate?: number | null;
          eur_exchange_rate?: number | null;
          gbp_exchange_rate?: number | null;
          status?: string | null;
          cancel_remark?: string | null;
          job_id?: number | null;
          created_at?: string;
          updated_at?: string;
          assigned_to_user_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_enquiries_cnee';
            columns: ['cnee_id'];
            isOneToOne: false;
            referencedRelation: 'consignee_master';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_enquiries_company';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_enquiries_customer';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customer_master';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_enquiries_job';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_enquiries_mode';
            columns: ['mode_id'];
            isOneToOne: false;
            referencedRelation: 'mode_master';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_enquiries_sales_person';
            columns: ['sales_person_id'];
            isOneToOne: false;
            referencedRelation: 'sales_persons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enquiries_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_enquiries_shipper';
            columns: ['shipper_id'];
            isOneToOne: false;
            referencedRelation: 'shipper_master';
            referencedColumns: ['id'];
          }
        ];
      };
      quotation_items: {

        Row: {
          id: number;
          quotation_id: number;
          description: string;
          sac_code: string | null;
          quantity: number | null;
          rate: number | null;
          currency: string | null;
          exchange_rate: number | null;
          amount: number | null;
          gst_percent: number | null;
          gst_amount: number | null;
          total_amount: number | null;
          sort_order: number | null;
        };
        Insert: {
          id?: number;
          quotation_id: number;
          description: string;
          sac_code?: string | null;
          quantity?: number | null;
          rate?: number | null;
          currency?: string | null;
          exchange_rate?: number | null;
          amount?: number | null;
          gst_percent?: number | null;
          gst_amount?: number | null;
          total_amount?: number | null;
          sort_order?: number | null;
        };
        Update: {
          id?: number;
          quotation_id?: number;
          description?: string;
          sac_code?: string | null;
          quantity?: number | null;
          rate?: number | null;
          currency?: string | null;
          exchange_rate?: number | null;
          amount?: number | null;
          gst_percent?: number | null;
          gst_amount?: number | null;
          total_amount?: number | null;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quotation_items_quotation_id_fkey';
            columns: ['quotation_id'];
            isOneToOne: false;
            referencedRelation: 'quotations';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      lead_status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
      follow_up_priority: 'low' | 'medium' | 'high';
      follow_up_type: 'call' | 'email' | 'meeting' | 'demo';
      visit_purpose: 'intro' | 'follow_up' | 'demo' | 'negotiation';
    };
    CompositeTypes: {};
  };
};

export type PublicSchema = Database['public'];
export type Tables = PublicSchema['Tables'];
export type Enums = PublicSchema['Enums'];

export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T]['Row'];
export type Insert<T extends TableName> = Tables[T]['Insert'];
export type Update<T extends TableName> = Tables[T]['Update'];

export type ProfileRow = Row<'profiles'>;
export type ProfileInsert = Insert<'profiles'>;
export type ProfileUpdate = Update<'profiles'>;

export type AttendanceRow = Row<'attendance'>;
export type AttendanceInsert = Insert<'attendance'>;
export type AttendanceUpdate = Update<'attendance'>;

export type LeadRow = Row<'leads'>;
export type LeadInsert = Insert<'leads'>;
export type LeadUpdate = Update<'leads'>;

export type FollowUpRow = Row<'follow_ups'>;
export type FollowUpInsert = Insert<'follow_ups'>;
export type FollowUpUpdate = Update<'follow_ups'>;

export type CustomerVisitRow = Row<'customer_visits'>;
export type CustomerVisitInsert = Insert<'customer_visits'>;
export type CustomerVisitUpdate = Update<'customer_visits'>;

export type SalesPersonRow = Row<'sales_persons'>;
export type SalesPersonInsert = Insert<'sales_persons'>;
export type SalesPersonUpdate = Update<'sales_persons'>;

export type UserRow = Row<'users'>;
export type UserInsert = Insert<'users'>;
export type UserUpdate = Update<'users'>;

export type SalesAttendanceRow = Row<'sales_attendance'>;
export type SalesAttendanceInsert = Insert<'sales_attendance'>;
export type SalesAttendanceUpdate = Update<'sales_attendance'>;

export type SalesFollowupRow = Row<'sales_followups'>;
export type SalesFollowupInsert = Insert<'sales_followups'>;
export type SalesFollowupUpdate = Update<'sales_followups'>;

export type SalesFollowupReminderRow = Row<'sales_followup_reminders'>;
export type SalesFollowupReminderInsert = Insert<'sales_followup_reminders'>;
export type SalesFollowupReminderUpdate = Update<'sales_followup_reminders'>;

export type NotificationLogRow = Row<'notification_logs'>;
export type NotificationLogInsert = Insert<'notification_logs'>;
export type NotificationLogUpdate = Update<'notification_logs'>;

export type RoleRow = Row<'roles'>;
export type RoleInsert = Insert<'roles'>;
export type RoleUpdate = Update<'roles'>;

export type UserRoleRow = Row<'user_roles'>;
export type UserRoleInsert = Insert<'user_roles'>;
export type UserRoleUpdate = Update<'user_roles'>;

export type QuotationRow = Row<'quotations'>;
export type QuotationInsert = Insert<'quotations'>;
export type QuotationUpdate = Update<'quotations'>;

export type QuotationItemRow = Row<'quotation_items'>;
export type QuotationItemInsert = Insert<'quotation_items'>;
export type QuotationItemUpdate = Update<'quotation_items'>;

// Enquiries (used by /app/enquiry/* screens)
export type EnquiryRow = {
  id: number;
  enquiry_no: string | null;
  enq_date: string | null;
  customer_id: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_gst: string | null;
  shipper_id: number | null;
  shipper: string | null;
  cnee_id: number | null;
  cnee: string | null;
  sales_person_id: number | null;
  seals_person: string | null;
  mode_id: number | null;
  pol_country: string | null;
  pol: string | null;
  pod_country: string | null;
  pod: string | null;
  commodity: string | null;
  packages: string | null;
  packages_unit: string | null;
  gross_weight: string | null;
  gross_weight_unit: string | null;
  cbm: string | null;
  status: string | null;
  cancel_remark: string | null;
  job_id: number | null;
  created_at: string;
  updated_at: string;
};

export type EnquiryInsert = Partial<Omit<EnquiryRow, 'id' | 'created_at' | 'updated_at'>> & {
  id?: number;
  created_at?: string;
  updated_at?: string;
};

