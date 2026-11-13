<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // 1. Déclencheur inaltérabilité Compta Écritures validées (RG-31, RG-38)
        DB::unprepared(<<<SQL
        CREATE OR REPLACE FUNCTION trg_prevent_validated_ecriture_mutation()
        RETURNS TRIGGER AS \$\$
        BEGIN
            IF OLD.status = 'validee' THEN
                RAISE EXCEPTION 'RG-31 / RG-38: Modification interdite sur une écriture comptable validée (ID: %)', OLD.id;
            END IF;
            RETURN NEW;
        END;
        \$\$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION trg_prevent_validated_ecriture_deletion()
        RETURNS TRIGGER AS \$\$
        BEGIN
            IF OLD.status = 'validee' THEN
                RAISE EXCEPTION 'RG-31 / RG-38: Suppression interdite sur une écriture comptable validée (ID: %)', OLD.id;
            END IF;
            RETURN OLD;
        END;
        \$\$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS check_ecriture_mutation ON compta_ecritures;
        CREATE TRIGGER check_ecriture_mutation
            BEFORE UPDATE ON compta_ecritures
            FOR EACH ROW
            EXECUTE FUNCTION trg_prevent_validated_ecriture_mutation();

        DROP TRIGGER IF EXISTS check_ecriture_deletion ON compta_ecritures;
        CREATE TRIGGER check_ecriture_deletion
            BEFORE DELETE ON compta_ecritures
            FOR EACH ROW
            EXECUTE FUNCTION trg_prevent_validated_ecriture_deletion();

        -- 2. Déclencheur inaltérabilité Registre des Stupéfiants Tableau B (Append-Only strict)
        CREATE OR REPLACE FUNCTION trg_prevent_stupefiants_mutation()
        RETURNS TRIGGER AS \$\$
        BEGIN
            RAISE EXCEPTION 'RG-31 / RG-38: Le registre des stupéfiants est strictement inaltérable (append-only, ID: %)', OLD.id;
        END;
        \$\$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS check_stupefiants_mutation ON cdc_stupefiants_entries;
        CREATE TRIGGER check_stupefiants_mutation
            BEFORE UPDATE ON cdc_stupefiants_entries
            FOR EACH ROW
            EXECUTE FUNCTION trg_prevent_stupefiants_mutation();

        DROP TRIGGER IF EXISTS check_stupefiants_deletion ON cdc_stupefiants_entries;
        CREATE TRIGGER check_stupefiants_deletion
            BEFORE DELETE ON cdc_stupefiants_entries
            FOR EACH ROW
            EXECUTE FUNCTION trg_prevent_stupefiants_mutation();

        -- 3. Déclencheur inaltérabilité Préparations magistrales délivrées / libérées
        CREATE OR REPLACE FUNCTION trg_prevent_released_preparation_mutation()
        RETURNS TRIGGER AS \$\$
        BEGIN
            IF OLD.status = 'delivree' OR OLD.control_hash IS NOT NULL THEN
                RAISE EXCEPTION 'RG-31 / RG-38: Modification interdite sur une préparation magistrale libérée ou délivrée (ID: %)', OLD.id;
            END IF;
            RETURN NEW;
        END;
        \$\$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION trg_prevent_released_preparation_deletion()
        RETURNS TRIGGER AS \$\$
        BEGIN
            IF OLD.status = 'delivree' OR OLD.control_hash IS NOT NULL THEN
                RAISE EXCEPTION 'RG-31 / RG-38: Suppression interdite sur une préparation magistrale libérée ou délivrée (ID: %)', OLD.id;
            END IF;
            RETURN OLD;
        END;
        \$\$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS check_preparation_mutation ON cdc_preparations;
        CREATE TRIGGER check_preparation_mutation
            BEFORE UPDATE ON cdc_preparations
            FOR EACH ROW
            EXECUTE FUNCTION trg_prevent_released_preparation_mutation();

        DROP TRIGGER IF EXISTS check_preparation_deletion ON cdc_preparations;
        CREATE TRIGGER check_preparation_deletion
            BEFORE DELETE ON cdc_preparations
            FOR EACH ROW
            EXECUTE FUNCTION trg_prevent_released_preparation_deletion();
        SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<SQL
        DROP TRIGGER IF EXISTS check_ecriture_mutation ON compta_ecritures;
        DROP TRIGGER IF EXISTS check_ecriture_deletion ON compta_ecritures;
        DROP FUNCTION IF EXISTS trg_prevent_validated_ecriture_mutation();
        DROP FUNCTION IF EXISTS trg_prevent_validated_ecriture_deletion();

        DROP TRIGGER IF EXISTS check_stupefiants_mutation ON cdc_stupefiants_entries;
        DROP TRIGGER IF EXISTS check_stupefiants_deletion ON cdc_stupefiants_entries;
        DROP FUNCTION IF EXISTS trg_prevent_stupefiants_mutation();

        DROP TRIGGER IF EXISTS check_preparation_mutation ON cdc_preparations;
        DROP TRIGGER IF EXISTS check_preparation_deletion ON cdc_preparations;
        DROP FUNCTION IF EXISTS trg_prevent_released_preparation_mutation();
        DROP FUNCTION IF EXISTS trg_prevent_released_preparation_deletion();
        SQL);
    }
};
