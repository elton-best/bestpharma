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
      documents: {
        Row: {
          archived: boolean
          categorie: string
          contenu: string
          created_at: string
          created_by: string | null
          id: string
          modele: boolean
          officine_id: string
          statut: string
          titre: string
          updated_at: string
          valide_le: string | null
          valide_par: string | null
          version: number
        }
        Insert: {
          archived?: boolean
          categorie?: string
          contenu?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modele?: boolean
          officine_id: string
          statut?: string
          titre: string
          updated_at?: string
          valide_le?: string | null
          valide_par?: string | null
          version?: number
        }
        Update: {
          archived?: boolean
          categorie?: string
          contenu?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modele?: boolean
          officine_id?: string
          statut?: string
          titre?: string
          updated_at?: string
          valide_le?: string | null
          valide_par?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_officine_id_fkey"
            columns: ["officine_id"]
            isOneToOne: false
            referencedRelation: "officines"
            referencedColumns: ["id"]
          },
        ]
      }
      echeances: {
        Row: {
          archived: boolean
          categorie: string
          created_at: string
          created_by: string | null
          date_echeance: string
          fait: boolean
          id: string
          notes: string
          officine_id: string
          titre: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          categorie?: string
          created_at?: string
          created_by?: string | null
          date_echeance: string
          fait?: boolean
          id?: string
          notes?: string
          officine_id: string
          titre: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          categorie?: string
          created_at?: string
          created_by?: string | null
          date_echeance?: string
          fait?: boolean
          id?: string
          notes?: string
          officine_id?: string
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "echeances_officine_id_fkey"
            columns: ["officine_id"]
            isOneToOne: false
            referencedRelation: "officines"
            referencedColumns: ["id"]
          },
        ]
      }
      employes: {
        Row: {
          actif: boolean
          archived: boolean
          created_at: string
          created_by: string | null
          date_embauche: string | null
          id: string
          nom_complet: string
          officine_id: string
          poste: Database["public"]["Enums"]["role_officine"]
          telephone: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          archived?: boolean
          created_at?: string
          created_by?: string | null
          date_embauche?: string | null
          id?: string
          nom_complet: string
          officine_id: string
          poste?: Database["public"]["Enums"]["role_officine"]
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          archived?: boolean
          created_at?: string
          created_by?: string | null
          date_embauche?: string | null
          id?: string
          nom_complet?: string
          officine_id?: string
          poste?: Database["public"]["Enums"]["role_officine"]
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employes_officine_id_fkey"
            columns: ["officine_id"]
            isOneToOne: false
            referencedRelation: "officines"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_audit: {
        Row: {
          action: string
          ancienne_valeur: Json | null
          appareil: string | null
          created_at: string
          id: number
          ligne_id: string | null
          nouvelle_valeur: Json | null
          officine_id: string | null
          table_nom: string
          user_id: string | null
        }
        Insert: {
          action: string
          ancienne_valeur?: Json | null
          appareil?: string | null
          created_at?: string
          id?: never
          ligne_id?: string | null
          nouvelle_valeur?: Json | null
          officine_id?: string | null
          table_nom: string
          user_id?: string | null
        }
        Update: {
          action?: string
          ancienne_valeur?: Json | null
          appareil?: string | null
          created_at?: string
          id?: never
          ligne_id?: string | null
          nouvelle_valeur?: Json | null
          officine_id?: string | null
          table_nom?: string
          user_id?: string | null
        }
        Relationships: []
      }
      non_conformites: {
        Row: {
          action_corrective: string
          archived: boolean
          created_at: string
          created_by: string | null
          date_limite: string | null
          description: string
          gravite: string
          id: string
          officine_id: string
          statut: string
          titre: string
          updated_at: string
        }
        Insert: {
          action_corrective?: string
          archived?: boolean
          created_at?: string
          created_by?: string | null
          date_limite?: string | null
          description?: string
          gravite?: string
          id?: string
          officine_id: string
          statut?: string
          titre: string
          updated_at?: string
        }
        Update: {
          action_corrective?: string
          archived?: boolean
          created_at?: string
          created_by?: string | null
          date_limite?: string | null
          description?: string
          gravite?: string
          id?: string
          officine_id?: string
          statut?: string
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "non_conformites_officine_id_fkey"
            columns: ["officine_id"]
            isOneToOne: false
            referencedRelation: "officines"
            referencedColumns: ["id"]
          },
        ]
      }
      officines: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          id: string
          nom: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nom: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nom?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      parametres: {
        Row: {
          archived: boolean
          cle: string
          created_at: string
          created_by: string | null
          id: string
          libelle: string
          officine_id: string
          type: string
          unite: string | null
          updated_at: string
          valeur: Json
          version: number
        }
        Insert: {
          archived?: boolean
          cle: string
          created_at?: string
          created_by?: string | null
          id?: string
          libelle: string
          officine_id: string
          type: string
          unite?: string | null
          updated_at?: string
          valeur: Json
          version?: number
        }
        Update: {
          archived?: boolean
          cle?: string
          created_at?: string
          created_by?: string | null
          id?: string
          libelle?: string
          officine_id?: string
          type?: string
          unite?: string | null
          updated_at?: string
          valeur?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "parametres_officine_id_fkey"
            columns: ["officine_id"]
            isOneToOne: false
            referencedRelation: "officines"
            referencedColumns: ["id"]
          },
        ]
      }
      pointages: {
        Row: {
          created_at: string
          created_by: string | null
          employe_id: string
          horodatage: string
          id: string
          officine_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employe_id: string
          horodatage?: string
          id?: string
          officine_id: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employe_id?: string
          horodatage?: string
          id?: string
          officine_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pointages_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "employes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pointages_officine_id_fkey"
            columns: ["officine_id"]
            isOneToOne: false
            referencedRelation: "officines"
            referencedColumns: ["id"]
          },
        ]
      }
      profils: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          nom_complet: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id: string
          nom_complet?: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          nom_complet?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sessions_appareils: {
        Row: {
          archived: boolean
          created_at: string
          derniere_activite: string
          id: string
          libelle: string
          revoquee: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          derniere_activite?: string
          id?: string
          libelle: string
          revoquee?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          derniere_activite?: string
          id?: string
          libelle?: string
          revoquee?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      utilisateurs_officines: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          id: string
          officine_id: string
          role: Database["public"]["Enums"]["role_officine"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          officine_id: string
          role: Database["public"]["Enums"]["role_officine"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          officine_id?: string
          role?: Database["public"]["Enums"]["role_officine"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "utilisateurs_officines_officine_id_fkey"
            columns: ["officine_id"]
            isOneToOne: false
            referencedRelation: "officines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      a_role: {
        Args: {
          _officine: string
          _roles: Database["public"]["Enums"]["role_officine"][]
        }
        Returns: boolean
      }
      creer_officine: {
        Args: { _nom: string; _ville: string }
        Returns: string
      }
      mfa_requise: { Args: never; Returns: boolean }
      role_exige_mfa: {
        Args: { _r: Database["public"]["Enums"]["role_officine"] }
        Returns: boolean
      }
      user_officines: { Args: never; Returns: string[] }
    }
    Enums: {
      role_officine:
        | "promoteur"
        | "pharmacien_titulaire"
        | "pharmacien_adjoint"
        | "rmq"
        | "comptable"
        | "preparateur"
        | "caissier"
        | "magasinier"
        | "agent_entretien"
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
    Enums: {
      role_officine: [
        "promoteur",
        "pharmacien_titulaire",
        "pharmacien_adjoint",
        "rmq",
        "comptable",
        "preparateur",
        "caissier",
        "magasinier",
        "agent_entretien",
      ],
    },
  },
} as const
