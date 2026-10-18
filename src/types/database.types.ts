
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_logs": {
                  Row: {
                    "actor_id": string | null,"aksi": string,"created_at": string,"detail": NonNullable<Json>,"id": number,"target_id": string | null,"target_tipe": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"aksi": string,"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_tipe"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"aksi"?: string,"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: never,"target_id"?: string | null,"target_tipe"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"class_schedules": {
                  Row: {
                    "class_id": string,"hari": number,"id": string,"jam_mulai": string,"jam_selesai": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"hari": number,"id"?: string,"jam_mulai": string,"jam_selesai": string
                  }
                  Update: {
                    "class_id"?: string,"hari"?: number,"id"?: string,"jam_mulai"?: string,"jam_selesai"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_schedules_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    }
                  ]
                },"classes": {
                  Row: {
                    "course_id": string,"created_at": string,"dosen_id": string,"id": string,"nama_kelas": string,"semester_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"dosen_id": string,"id"?: string,"nama_kelas": string,"semester_id": string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"dosen_id"?: string,"id"?: string,"nama_kelas"?: string,"semester_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "classes_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "classes_dosen_id_fkey"
      columns: ["dosen_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "classes_semester_id_fkey"
      columns: ["semester_id"]
isOneToOne: false
      referencedRelation: "semesters"
      referencedColumns: ["id"]
    }
                  ]
                },"courses": {
                  Row: {
                    "created_at": string,"id": string,"kode": string,"nama": string,"sks": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kode": string,"nama": string,"sks": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kode"?: string,"nama"?: string,"sks"?: number
                  }
                  Relationships: [
                    
                  ]
                },"enrollments": {
                  Row: {
                    "class_id": string,"created_at": string,"id": string,"mahasiswa_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"id"?: string,"mahasiswa_id": string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"id"?: string,"mahasiswa_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollments_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_mahasiswa_id_fkey"
      columns: ["mahasiswa_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"holidays": {
                  Row: {
                    "created_at": string,"id": string,"keterangan": string,"tanggal": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"keterangan": string,"tanggal": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"keterangan"?: string,"tanggal"?: string
                  }
                  Relationships: [
                    
                  ]
                },"login_attempts": {
                  Row: {
                    "created_at": string,"id": number,"kode_or_ip": string,"success": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"kode_or_ip": string,"success": boolean
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"kode_or_ip"?: string,"success"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"members": {
                  Row: {
                    "activated_at": string | null,"aktif": boolean,"created_at": string,"id": string,"kode": string,"nama": string,"nim_nidn": string | null,"peran": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"aktif"?: boolean,"created_at"?: string,"id"?: string,"kode": string,"nama": string,"nim_nidn"?: string | null,"peran": string
                  }
                  Update: {
                    "activated_at"?: string | null,"aktif"?: boolean,"created_at"?: string,"id"?: string,"kode"?: string,"nama"?: string,"nim_nidn"?: string | null,"peran"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "aksi_url": string | null,"created_at": string,"id": string,"isi": string,"judul": string,"push_sent_at": string | null,"read_at": string | null,"session_id": string | null,"tipe": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aksi_url"?: string | null,"created_at"?: string,"id"?: string,"isi": string,"judul": string,"push_sent_at"?: string | null,"read_at"?: string | null,"session_id"?: string | null,"tipe": string,"user_id": string
                  }
                  Update: {
                    "aksi_url"?: string | null,"created_at"?: string,"id"?: string,"isi"?: string,"judul"?: string,"push_sent_at"?: string | null,"read_at"?: string | null,"session_id"?: string | null,"tipe"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "auth_user_id": string | null,"created_at": string,"id": string,"member_id": string | null,"nama": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id"?: string | null,"created_at"?: string,"id"?: string,"member_id"?: string | null,"nama": string,"role": string
                  }
                  Update: {
                    "auth_user_id"?: string | null,"created_at"?: string,"id"?: string,"member_id"?: string | null,"nama"?: string,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_member_id_fkey"
      columns: ["member_id"]
isOneToOne: true
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_seen_at": string,"p256dh": string,"profile_id": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_seen_at"?: string,"p256dh": string,"profile_id": string,"user_agent"?: string | null
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_seen_at"?: string,"p256dh"?: string,"profile_id"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"semesters": {
                  Row: {
                    "aktif": boolean,"created_at": string,"id": string,"nama": string,"tanggal_mulai": string,"tanggal_selesai": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aktif"?: boolean,"created_at"?: string,"id"?: string,"nama": string,"tanggal_mulai": string,"tanggal_selesai": string
                  }
                  Update: {
                    "aktif"?: boolean,"created_at"?: string,"id"?: string,"nama"?: string,"tanggal_mulai"?: string,"tanggal_selesai"?: string
                  }
                  Relationships: [
                    
                  ]
                },"session_confirmations": {
                  Row: {
                    "actor_id": string | null,"actor_role": string,"created_at": string,"id": number,"mode_baru": string,"mode_lama": string | null,"session_id": string,"sumber": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_role": string,"created_at"?: string,"id"?: never,"mode_baru": string,"mode_lama"?: string | null,"session_id": string,"sumber": string
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_role"?: string,"created_at"?: string,"id"?: never,"mode_baru"?: string,"mode_lama"?: string | null,"session_id"?: string,"sumber"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_confirmations_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_confirmations_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "class_id": string,"created_at": string,"cutoff_at": string,"escalated_at": string | null,"id": string,"mode": string | null,"mode_source": string | null,"mulai_at": string,"next_reminder_at": string | null,"reminder_count": number,"schedule_id": string,"selesai_at": string,"status": string,"tanggal": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"cutoff_at": string,"escalated_at"?: string | null,"id"?: string,"mode"?: string | null,"mode_source"?: string | null,"mulai_at": string,"next_reminder_at"?: string | null,"reminder_count"?: number,"schedule_id": string,"selesai_at": string,"status"?: string,"tanggal": string,"updated_at"?: string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"cutoff_at"?: string,"escalated_at"?: string | null,"id"?: string,"mode"?: string | null,"mode_source"?: string | null,"mulai_at"?: string,"next_reminder_at"?: string | null,"reminder_count"?: number,"schedule_id"?: string,"selesai_at"?: string,"status"?: string,"tanggal"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_schedule_id_fkey"
      columns: ["schedule_id"]
isOneToOne: false
      referencedRelation: "class_schedules"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "app_profile_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"app_role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"apply_default_mode":
{ Args: { "p_session_id": string }; Returns: boolean
                           },
"generate_sessions":
{ Args: { "p_semester_id": string }; Returns: number
                           },
"set_session_mode":
{ Args: { "p_mode": string,"p_session_id": string }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
