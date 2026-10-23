export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          created_at: string
          day_of_week: string
          end_time: string
          id: string
          professional_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          end_time: string
          id?: string
          professional_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          end_time?: string
          id?: string
          professional_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_overrides: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_unavailable: boolean
          professional_id: string
          specific_date: string
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_unavailable?: boolean
          professional_id: string
          specific_date: string
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_unavailable?: boolean
          professional_id?: string
          specific_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          access_notes: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          day: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          floor_number: string | null
          id: string
          intercom_name: string | null
          lives_in_condominio: boolean | null
          medical_notes: string | null
          patient_id: string
          price: number
          professional_id: string
          recipient_address: string | null
          recipient_first_name: string | null
          recipient_last_name: string | null
          recipient_type: string | null
          service_name: string
          status: string
          stripe_session_id: string | null
          time_slot: string
        }
        Insert: {
          access_notes?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          day: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          floor_number?: string | null
          id?: string
          intercom_name?: string | null
          lives_in_condominio?: boolean | null
          medical_notes?: string | null
          patient_id: string
          price: number
          professional_id: string
          recipient_address?: string | null
          recipient_first_name?: string | null
          recipient_last_name?: string | null
          recipient_type?: string | null
          service_name: string
          status?: string
          stripe_session_id?: string | null
          time_slot: string
        }
        Update: {
          access_notes?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          day?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          floor_number?: string | null
          id?: string
          intercom_name?: string | null
          lives_in_condominio?: boolean | null
          medical_notes?: string | null
          patient_id?: string
          price?: number
          professional_id?: string
          recipient_address?: string | null
          recipient_first_name?: string | null
          recipient_last_name?: string | null
          recipient_type?: string | null
          service_name?: string
          status?: string
          stripe_session_id?: string | null
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "public_professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          messaggio: string
          nome: string
          request_fingerprint: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          messaggio: string
          nome: string
          request_fingerprint: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          messaggio?: string
          nome?: string
          request_fingerprint?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_notes: string | null
          additional_info: string | null
          address: string | null
          age: number | null
          bio: string | null
          caregiver_access_notes: string | null
          caregiver_address: string | null
          caregiver_emergency_name: string | null
          caregiver_emergency_phone: string | null
          caregiver_first_name: string | null
          caregiver_floor_number: string | null
          caregiver_intercom_name: string | null
          caregiver_last_name: string | null
          caregiver_lives_in_condominio: boolean | null
          caregiver_medical_notes: string | null
          created_at: string
          email: string
          first_name: string
          floor_number: string | null
          id: string
          intercom_name: string | null
          is_caregiver: boolean | null
          last_name: string
          lat: number | null
          lives_in_condominio: boolean | null
          lng: number | null
          long_distance_ok: boolean
          medical_notes: string | null
          numero_fnofi: string | null
          numero_opi: string | null
          partita_iva: string | null
          phone: string | null
          photo_url: string | null
          professional_type: string | null
          recent_professional_searches: string[]
          recent_service_searches: string[]
          role: string
          service_area: Json | null
          user_id: string
          verified: boolean
          zona: string | null
        }
        Insert: {
          access_notes?: string | null
          additional_info?: string | null
          address?: string | null
          age?: number | null
          bio?: string | null
          caregiver_access_notes?: string | null
          caregiver_address?: string | null
          caregiver_emergency_name?: string | null
          caregiver_emergency_phone?: string | null
          caregiver_first_name?: string | null
          caregiver_floor_number?: string | null
          caregiver_intercom_name?: string | null
          caregiver_last_name?: string | null
          caregiver_lives_in_condominio?: boolean | null
          caregiver_medical_notes?: string | null
          created_at?: string
          email: string
          first_name: string
          floor_number?: string | null
          id?: string
          intercom_name?: string | null
          is_caregiver?: boolean | null
          last_name: string
          lat?: number | null
          lives_in_condominio?: boolean | null
          lng?: number | null
          long_distance_ok?: boolean
          medical_notes?: string | null
          numero_fnofi?: string | null
          numero_opi?: string | null
          partita_iva?: string | null
          phone?: string | null
          photo_url?: string | null
          professional_type?: string | null
          recent_professional_searches?: string[]
          recent_service_searches?: string[]
          role: string
          service_area?: Json | null
          user_id: string
          verified?: boolean
          zona?: string | null
        }
        Update: {
          access_notes?: string | null
          additional_info?: string | null
          address?: string | null
          age?: number | null
          bio?: string | null
          caregiver_access_notes?: string | null
          caregiver_address?: string | null
          caregiver_emergency_name?: string | null
          caregiver_emergency_phone?: string | null
          caregiver_first_name?: string | null
          caregiver_floor_number?: string | null
          caregiver_intercom_name?: string | null
          caregiver_last_name?: string | null
          caregiver_lives_in_condominio?: boolean | null
          caregiver_medical_notes?: string | null
          created_at?: string
          email?: string
          first_name?: string
          floor_number?: string | null
          id?: string
          intercom_name?: string | null
          is_caregiver?: boolean | null
          last_name?: string
          lat?: number | null
          lives_in_condominio?: boolean | null
          lng?: number | null
          long_distance_ok?: boolean
          medical_notes?: string | null
          numero_fnofi?: string | null
          numero_opi?: string | null
          partita_iva?: string | null
          phone?: string | null
          photo_url?: string | null
          professional_type?: string | null
          recent_professional_searches?: string[]
          recent_service_searches?: string[]
          role?: string
          service_area?: Json | null
          user_id?: string
          verified?: boolean
          zona?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          patient_id: string
          professional_id: string
          rating: number
          text: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          patient_id: string
          professional_id: string
          rating: number
          text?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          professional_id?: string
          rating?: number
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "public_professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          professional_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price: number
          professional_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_professionals: {
        Row: {
          bio: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          lat: number | null
          lng: number | null
          long_distance_ok: boolean | null
          photo_url: string | null
          professional_type: string | null
          role: string | null
          service_area: Json | null
          verified: boolean | null
          zona: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          lat?: number | null
          lng?: number | null
          long_distance_ok?: boolean | null
          photo_url?: string | null
          professional_type?: string | null
          role?: string | null
          service_area?: Json | null
          verified?: boolean | null
          zona?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          lat?: number | null
          lng?: number | null
          long_distance_ok?: boolean | null
          photo_url?: string | null
          professional_type?: string | null
          role?: string | null
          service_area?: Json | null
          verified?: boolean | null
          zona?: string | null
        }
        Relationships: []
      }
      public_reviews: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string | null
          professional_id: string | null
          rating: number | null
          text: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string | null
          professional_id?: string | null
          rating?: number | null
          text?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string | null
          professional_id?: string | null
          rating?: number | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_professionals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_booking: { Args: { _booking_id: string }; Returns: string }
      create_profile_from_auth_user: {
        Args: { _user_id: string }
        Returns: undefined
      }
      ensure_my_profile: { Args: never; Returns: undefined }
      get_booked_slots: {
        Args: { _professional_id: string }
        Returns: {
          day: string
          time_slot: string
        }[]
      }
      get_professional_bookings: {
        Args: never
        Returns: {
          access_notes: string
          created_at: string
          day: string
          emergency_contact_name: string
          emergency_contact_phone: string
          floor_number: string
          id: string
          intercom_name: string
          lives_in_condominio: boolean
          medical_notes: string
          patient_first_name: string
          patient_last_name: string
          patient_phone: string
          price: number
          recipient_address: string
          recipient_first_name: string
          recipient_last_name: string
          recipient_type: string
          service_name: string
          status: string
          time_slot: string
        }[]
      }
      nurse_service_catalog: {
        Args: never
        Returns: {
          max_price: number
          min_price: number
          name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
