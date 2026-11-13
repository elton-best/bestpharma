/** Tableaux fictifs des modules 3 à 15, utilisés uniquement hors mode API. */
const now = new Date().toISOString()
let seq = 1000

const team = [
  { id: 1, name: 'Amina Dossou', email: 'amina.demo@bestpharma.local' },
  { id: 2, name: 'Yves Koffi', email: 'yves.demo@bestpharma.local' },
]

let db = {
  plans: [
    { id: 11, reference: 'PLAN-2026-01', title: 'Plan d’amélioration chaîne du froid', objective: 'Fiabiliser les relevés et les écarts de température sur 90 jours.', status: 'draft', starts_on: '2026-11-01', ends_on: '2027-01-31', owner_id: 1, version: 1 },
    { id: 12, reference: 'PLAN-2026-02', title: 'Plan de formation BPD', objective: 'Couvrir les habilitations qui arrivent à échéance.', status: 'submitted', starts_on: '2026-10-01', ends_on: '2026-12-15', owner_id: 2, version: 2 },
  ],
  actions: [
    { id: 21, title: 'Reprendre le relevé du matin', description: 'Le relevé de 8 h n’a pas été signé trois jours de suite.', status: 'open', priority: 'high', owner_id: 1, due_date: '2026-11-18', version: 1, overdue: false, sources: [{ source_type: 'finding', label: 'Constat froid — démo' }] },
    { id: 22, title: 'Double contrôle à la réception', description: 'Formaliser le contrôle du bordereau avant mise en quarantaine.', status: 'in_progress', priority: 'normal', owner_id: 2, due_date: '2026-11-05', version: 3, overdue: true, sources: [{ source_type: 'mission', label: 'Mission accompagnement — démo' }] },
    { id: 23, title: 'Accueil du nouvel adjoint', description: 'Parcours d’accueil et fiches de poste remis.', status: 'closed', priority: 'low', owner_id: 1, due_date: '2026-10-20', version: 4, overdue: false, sources: [{ source_type: 'document', label: 'Procédure accueil' }] },
  ],
  programs: [
    { id: 31, title: 'Programme d’auto-inspection 2026-2027', year_start: 2026, year_end: 2027, objective: 'Couvrir les cinq processus fondamentaux sur 24 mois.', status: 'active', inspections_count: 2 },
  ],
  inspections: [
    { id: 41, reference: 'AI-2026-014', title: 'Chaîne du froid et locaux', process_scope: 'Locaux & Chaîne du Froid', scope_description: 'Enceintes positive et négative, groupe électrogène.', objective: 'Vérifier la continuité des relevés.', planned_date: '2026-11-20', realized_date: null, status: 'planned', version: 1, program_id: 31, lead_inspector_id: 1, lead_inspector: team[0], program: { id: 31, title: 'Programme d’auto-inspection 2026-2027' }, items: [{ id: 411, bpd_reference: 'LOC-04', chapter: 'Locaux', requirement: 'Relevé biquotidien signé', sort_order: 1, response: { id: 1, status: 'non_evalue', observed_facts: '', evidence_notes: '', finding_type: 'none' } }], report: null, action_links: [] },
    { id: 42, reference: 'AI-2026-009', title: 'Dispensation au comptoir', process_scope: 'Dispensation & Stupéfiants', scope_description: 'Parcours ordonnance et conseil.', objective: 'Contrôler la revue pharmaceutique.', planned_date: '2026-10-02', realized_date: '2026-10-03', status: 'approved', version: 3, program_id: 31, lead_inspector_id: 2, lead_inspector: team[1], items: [{ id: 421, bpd_reference: 'DIS-02', chapter: 'Dispensation', requirement: 'Analyse de l’ordonnance avant délivrance', sort_order: 1, response: { id: 2, status: 'conforme', observed_facts: 'Revue faite sur trois délivrances observées.', evidence_notes: 'Grille G-09', finding_type: 'strength' } }], report: { id: 7, reference: 'RAP-AI-009', methodology: 'Observation et entretien', summary_findings: 'Pratique conforme sur l’échantillon observé.', strengths: 'Conseil systématique.', weaknesses: 'Traçabilité du refus encore inégale.', conclusions: 'Processus maîtrisé.', recommendations: 'Harmoniser la trace des refus.', status: 'approved', sha256_hash: 'démo-empreinte', approver: team[0] }, action_links: [{ id: 1, action_id: 21, action: { id: 21, title: 'Reprendre le relevé du matin', status: 'open' } }] },
  ],
  complaints: [
    { id: 51, reference: 'REC-2026-006', channel: 'comptoir', complainant_type: 'client', complainant_name: 'Client démo', complainant_contact: null, is_anonymous: false, category: 'conditionnement', title: 'Opercule décollé sur une boîte', description: 'Boîte remise au comptoir, opercule non scellé, lot non ouvert.', desired_solution: 'Échange du conditionnement', received_date: '2026-11-10', status: 'under_review', version: 1, assigned_to: 1, creator: team[1], assigned_user: team[0], responses: [], nonconformities: [] },
  ],
  ncs: [
    { id: 61, reference: 'NC-2026-018', source_type: 'interne', complaint_id: null, activity_domain: 'stock', title: 'Quarantaine non identifiée', description: 'Un carton réceptionné est resté dans l’allée sans étiquette de quarantaine.', detection_date: '2026-11-08', detected_by: 2, nature: 'non_conformite', severity: 'majeure', immediate_actions: 'Carton isolé et étiqueté.', status: 'analyzed', version: 2, detector: team[1], root_cause: { id: 3, method: '5_why', why_1: 'Étiquettes absentes au quai', why_2: 'Réassort non fait', why_3: null, why_4: null, why_5: null, main_cause: 'Absence de stock d’étiquettes au poste de réception', analyzed_at: now, analyst: team[0] }, action_links: [{ id: 1, action_id: 22 }], effectiveness_reviews: [] },
  ],
  risks: [
    { id: 71, reference: 'RSQ-014', type: 'risk', process_scope: 'Chaîne du froid', title: 'Panne du groupe en garde de nuit', description: 'Coupure prolongée sans bascule automatique vérifiée.', causes: 'Dernier essai du groupe daté de plus de 30 jours.', consequences: 'Excursion de température sur les vaccins.', owner_id: 1, status: 'evaluated', version: 2, owner: team[0], initial_assessment: { id: 1, assessment_type: 'initial', probability: 3, impact: 4, score: 12, criticality_level: 'eleve', grid_version: 'v1', rationale: 'Groupe peu testé, stock thermosensible présent.', evaluated_at: now, evaluator: team[0] }, residual_assessment: { id: 2, assessment_type: 'residual', probability: 2, impact: 3, score: 6, criticality_level: 'modere', grid_version: 'v1', rationale: 'Essai mensuel planifié.', evaluated_at: now, evaluator: team[1] }, action_links: [{ id: 1, action_id: 21, mitigation_strategy: 'Essai mensuel consigné' }] },
    { id: 72, reference: 'OPP-003', type: 'opportunity', process_scope: 'Dispensation', title: 'Conseil sur les retours de garde', description: 'Capitaliser les questions fréquentes de garde dans une fiche.', causes: null, consequences: null, owner_id: 2, status: 'identified', version: 1, owner: team[1], initial_assessment: { id: 3, assessment_type: 'initial', probability: 4, impact: 2, score: 8, criticality_level: 'modere', grid_version: 'v1', rationale: 'Fréquence élevée, impact organisationnel.', evaluated_at: now, evaluator: team[1] }, action_links: [] },
  ],
  scenarios: [
    { id: 81, reference: 'PCA-02', title: 'Coupure secteur supérieure à deux heures', threat_type: 'energie', trigger_events: 'Coupure confirmée et groupe non démarré sous 10 minutes.', immediate_actions: 'Prévenir le titulaire, transférer le thermosensible vers l’enceinte de secours.', alternative_operations: 'Dispensation limitée aux références hors froid, report des préparations.', rto_hours: 4, coordinator_id: 1, crisis_contacts: [{ role: 'Titulaire', name: 'Amina Dossou', phone: '+229 00 00 00 01' }], status: 'active', version: 1, coordinator: team[0], exercises: [{ id: 9, title: 'Simulation coupure', test_type: 'simulation', exercise_date: '2026-09-15', measured_recovery_minutes: 35, is_successful: true, findings: 'Bascule réalisée.', improvement_points: 'Afficher le numéro du dépanneur.', conductor: team[1] }] },
  ],
  employees: [
    { id: 91, matricule: 'PH-014', first_name: 'Amina', last_name: 'Dossou', email: 'amina.demo@bestpharma.local', phone: '+229 00 00 00 01', role_title: 'Pharmacienne titulaire', contract_type: 'CDI', hire_date: '2018-03-01', status: 'actif', ordre_b_number: 'OB-DEMO-14', ordre_b_expiry: '2026-12-01', qualifications: ['BPD'], emergency_contact: 'Contact démo', version: 1 },
    { id: 92, matricule: 'PH-022', first_name: 'Yves', last_name: 'Koffi', email: 'yves.demo@bestpharma.local', phone: '+229 00 00 00 02', role_title: 'Pharmacien adjoint', contract_type: 'CDI', hire_date: '2022-06-15', status: 'conge', ordre_b_number: 'OB-DEMO-22', ordre_b_expiry: '2027-06-01', qualifications: ['Dispensation'], emergency_contact: null, version: 1 },
  ],
  leaves: [
    { id: 101, employee_id: 92, leave_type: 'conge_annuel', start_date: '2026-11-10', end_date: '2026-11-16', days_count: 5, reason: 'Congé annuel', status: 'en_attente', decision_notes: null, employee: { id: 92, matricule: 'PH-022', first_name: 'Yves', last_name: 'Koffi', role_title: 'Pharmacien adjoint' } },
  ],
  shifts: [
    { id: 111, employee_id: 91, shift_type: 'jour', shift_date: '2026-11-12', start_time: '08:00', end_time: '16:00', status: 'planifie', notes: 'Ouverture', employee: { id: 91, matricule: 'PH-014', first_name: 'Amina', last_name: 'Dossou', role_title: 'Pharmacienne titulaire' } },
    { id: 112, employee_id: 91, shift_type: 'garde', shift_date: '2026-11-14', start_time: '20:00', end_time: '08:00', status: 'planifie', notes: 'Garde de week-end', employee: { id: 91, matricule: 'PH-014', first_name: 'Amina', last_name: 'Dossou', role_title: 'Pharmacienne titulaire' } },
  ],
  trainingPlans: [
    { id: 121, year: 2026, theme: 'Chaîne du froid', description: 'Relevé, excursion, décision du pharmacien.', trainer_organization: 'Interne', training_type: 'interne_bpd', duration_hours: 3, target_audience: 'Équipe officine', status: 'planifie', sessions: [{ id: 1, session_date: '2026-11-25', start_time: '09:00', end_time: '12:00', location: 'Réserve', trainer_name: 'Amina Dossou', status: 'planifiee', attendances: [] }] },
  ],
  reviews: [
    { id: 131, employee_id: 92, review_type: 'non_cadre', review_period: 'Année 2026', review_date: '2026-06-20', criteria_scores: [{ criterion: 'Rigueur de dispensation', score: 4 }], overall_score: 4, strengths: 'Conseil clair', improvements: 'Traçabilité des refus', status: 'valide', employee: { id: 92, matricule: 'PH-022', first_name: 'Yves', last_name: 'Koffi', role_title: 'Pharmacien adjoint' }, reviewer: team[0] },
  ],
  locations: [
    { id: 141, name: 'Comptoir', description: 'Zone de dispensation', is_active: true, equipments_count: 1 },
    { id: 142, name: 'Chambre froide positive', description: '2 °C à 8 °C', is_active: true, equipments_count: 2 },
  ],
  equipments: [
    { id: 151, code: 'EQ-FR-01', designation: 'Enceinte positive', category: 'froid', brand: 'Démo', model: 'P-200', serial_number: 'SN-DEMO-01', acquisition_year: 2021, installation_date: '2021-04-12', current_location_id: 142, status: 'en_service', criticality: 'critique_bpd', notes: null, version: 1, location: { id: 142, name: 'Chambre froide positive' } },
    { id: 152, code: 'EQ-GE-01', designation: 'Groupe électrogène', category: 'energie', brand: 'Démo', model: 'G-12', serial_number: 'SN-DEMO-02', acquisition_year: 2019, installation_date: '2019-08-01', current_location_id: 141, status: 'en_maintenance', criticality: 'critique_bpd', notes: 'Vidange prévue', version: 2, location: { id: 141, name: 'Local technique' } },
  ],
  maintenancePlans: [
    { id: 161, equipment_id: 152, maintenance_type: 'preventive', frequency_days: 90, last_performed_at: '2026-08-01', next_due_date: '2026-11-01', default_provider_name: 'Atelier Démo', is_active: true, equipment: { id: 152, code: 'EQ-GE-01', designation: 'Groupe électrogène', category: 'energie' } },
  ],
  maintenanceEvents: [
    { id: 171, equipment_id: 151, intervention_type: 'controle', intervention_date: '2026-10-02', provider_name: 'Froid Démo', technician_name: 'Technicien démo', description: 'Contrôle de l’étanchéité.', result: 'conforme', next_due_date: '2027-04-02', cost: 45000, is_verified: true, created_action_id: null, equipment: { id: 151, code: 'EQ-FR-01', designation: 'Enceinte positive' }, verified_by: team[0] },
  ],
  generatorTests: [
    { id: 181, equipment_id: 152, test_date: '2026-10-28', fuel_level_percent: 70, start_delay_seconds: 8, oil_level_ok: true, battery_voltage_ok: true, frequency_hz: 50, test_result: 'conforme', comment: 'Démarrage nominal.', created_action_id: null, equipment: { id: 152, code: 'EQ-GE-01', designation: 'Groupe électrogène' }, tested_by: team[1] },
  ],
  cleaningPlans: [
    { id: 191, zone_name: 'Comptoir', frequency: 'quotidien', cleaning_method: 'Essuyage humide', products_used: 'Détergent officine', assigned_role: 'Préparateur', is_active: true },
  ],
  cleaningOccurrences: [
    { id: 201, cleaning_plan_id: 191, planned_date: '2026-11-12', status: 'realise', is_verified: true, anomalies_detected: '', plan: { id: 191, zone_name: 'Comptoir', frequency: 'quotidien' }, performed_by: team[1] },
    { id: 202, cleaning_plan_id: 191, planned_date: '2026-11-11', status: 'en_retard', is_verified: false, anomalies_detected: 'Non consigné', plan: { id: 191, zone_name: 'Réserve', frequency: 'quotidien' }, performed_by: team[1] },
  ],
  withdrawals: [
    { id: 211, equipment_id: 152, request_date: '2026-11-01', withdrawal_reason: 'Remplacement prévu en 2027, pas un retrait immédiat.', destination: 'reforme', status: 'demande', decided_at: null, equipment: { id: 152, code: 'EQ-GE-01', designation: 'Groupe électrogène', status: 'en_maintenance' }, requested_by: team[0] },
  ],
  suppliers: [
    { id: 221, code: 'FRN-UBPHAR', name: 'Grossiste Démo Cotonou', type: 'grossiste', category: 'medicament', ifu: 'IFU-DEMO', rccm: null, email: 'contact@grossiste-demo.local', phone: '+229 00 00 10 10', address: 'Zone industrielle', city: 'Cotonou', country: 'Bénin', status: 'qualifie', average_rating: 4.2, notes: null, version: 1, contacts: [{ id: 1, name: 'Contact Démo', role_title: 'Commercial', email: 'contact@grossiste-demo.local', phone: null, is_primary: true }] },
    { id: 222, code: 'FRN-FROID', name: 'Maintenance Froid Démo', type: 'prestataire', category: 'maintenance', ifu: null, rccm: null, email: null, phone: '+229 00 00 20 20', address: null, city: 'Cotonou', country: 'Bénin', status: 'actif', average_rating: 3.5, notes: null, version: 1 },
  ],
  selections: [
    { id: 231, reference: 'SEL-2026-04', title: 'Fourniture de vaccins', need_description: 'Besoin trimestriel, chaîne du froid exigée.', status: 'en_analyse', selected_supplier_id: null, selection_justification: null, validated_at: null, quotes: [{ id: 1, supplier_id: 221, amount: 1250000, delivery_days: 3, technical_score: 4, financial_score: 3, total_score: 3.5, is_retained: false, supplier: { id: 221, code: 'FRN-UBPHAR', name: 'Grossiste Démo Cotonou' } }] },
  ],
  evaluations: [
    { id: 241, supplier_id: 221, period: '2026-T3', evaluation_date: '2026-10-05', overall_score_on_5: 4, percentage_score: 80, decision: 'maintenir', strengths: 'Délais tenus', weaknesses: 'Un écart de température signalé', action_required: null, created_action_id: null, supplier: { id: 221, code: 'FRN-UBPHAR', name: 'Grossiste Démo Cotonou', type: 'grossiste' }, evaluator: team[0] },
  ],
  supplierComplaints: [
    { id: 251, supplier_id: 221, reference: 'LIT-2026-002', claim_type: 'temperature', claim_date: '2026-10-18', order_reference: 'CMD-2026-088', delivery_note_ref: 'BL-4421', description: 'Sonde d’arrivée à 11 °C sur un colis vaccins.', status: 'ouverte', supplier_response: null, response_received_at: null, refund_or_credit_amount: 0, created_action_id: 21, supplier: { id: 221, code: 'FRN-UBPHAR', name: 'Grossiste Démo Cotonou' } },
  ],
  contracts: [
    { id: 261, supplier_id: 222, contract_ref: 'CTR-FROID-26', title: 'Maintenance enceintes', start_date: '2026-01-01', end_date: '2026-12-31', auto_renewal: true, notice_days: 60, status: 'actif', terms_summary: 'Deux visites préventives par an.', supplier: { id: 222, code: 'FRN-FROID', name: 'Maintenance Froid Démo' } },
  ],
  products: [
    { id: 271, code: 'AMOX-500', barcode: '0000000000017', name: 'Amoxicilline 500 mg', dci: 'Amoxicilline', dosage: '500 mg', pharmaceutical_form: 'gélule', base_unit: 'Boîte', category: 'antibiotique', default_supplier_id: 221, storage_condition: 'ambiante', is_thermosensitive: false, min_stock_threshold: 20, reorder_quantity: 40, purchase_price: 1800, selling_price: 2500, amm_number: 'AMM-DEMO-01', amm_source_verified: true, amm_source_label: 'Source à confirmer', sellable_stock: 12, supplier: { id: 221, code: 'FRN-UBPHAR', name: 'Grossiste Démo Cotonou' }, units: [{ id: 1, unit_name: 'Boîte', conversion_factor: 1, is_default_dispense: true }] },
    { id: 272, code: 'VAC-DEMO', barcode: null, name: 'Vaccin démo (froid)', dci: null, dosage: '0,5 ml', pharmaceutical_form: 'injectable', base_unit: 'Dose', category: 'vaccin', default_supplier_id: 221, storage_condition: '2-8', is_thermosensitive: true, min_stock_threshold: 10, reorder_quantity: 20, purchase_price: 4500, selling_price: 6000, amm_number: null, amm_source_verified: false, amm_source_label: null, sellable_stock: 30, supplier: { id: 221, code: 'FRN-UBPHAR', name: 'Grossiste Démo Cotonou' } },
  ],
  suggestions: [
    { product_id: 271, code: 'AMOX-500', name: 'Amoxicilline 500 mg', supplier_id: 221, supplier_name: 'Grossiste Démo Cotonou', current_sellable_stock: 12, min_stock_threshold: 20, suggested_qty: 40, unit_price: 1800, origin_formula: 'seuil − disponible' },
  ],
  orders: [
    { id: 281, reference: 'CMD-2026-090', supplier_id: 221, status: 'envoyee', order_date: '2026-11-09', total_estimated_amount: 72000, supplier: { id: 221, code: 'FRN-UBPHAR', name: 'Grossiste Démo Cotonou' }, lines: [{ id: 1, product_id: 271, ordered_qty: 40, received_qty: 0, unit_price: 1800, line_total: 72000, product: { id: 271, code: 'AMOX-500', name: 'Amoxicilline 500 mg', base_unit: 'Boîte' } }] },
  ],
  receipts: [
    { id: 291, reference: 'REC-2026-044', delivery_note_ref: 'BL-4500', parcel_count: 2, received_at: '2026-11-11T10:15:00', has_thermosensitive_items: true, arrival_temperature: 6.2, cold_chain_compliant: true, status: 'controlee', created_action_id: null, supplier: { id: 221, code: 'FRN-UBPHAR', name: 'Grossiste Démo Cotonou' } },
  ],
  lots: [
    { id: 301, product_id: 271, batch_number: 'LOT-A22', expiry_date: '2027-04-30', storage_zone: 'Rayon A', available_qty: 12, unit_cost: 1800, status: 'disponible', is_sellable: true, product: { id: 271, code: 'AMOX-500', name: 'Amoxicilline 500 mg', base_unit: 'Boîte', is_thermosensitive: false } },
    { id: 302, product_id: 272, batch_number: 'LOT-V09', expiry_date: '2026-12-15', storage_zone: 'Enceinte positive', available_qty: 30, unit_cost: 4500, status: 'quarantaine', is_sellable: false, product: { id: 272, code: 'VAC-DEMO', name: 'Vaccin démo (froid)', base_unit: 'Dose', is_thermosensitive: true } },
  ],
  movements: [
    { id: 311, movement_type: 'reception', quantity_delta: 40, balance_after: 40, reason: 'Réception BL-4500', performed_at: now, product: { id: 271, code: 'AMOX-500', name: 'Amoxicilline 500 mg' }, lot: { id: 301, batch_number: 'LOT-A22' }, performed_by: team[1] },
  ],
  inventories: [
    { id: 321, reference: 'INV-2026-11', inventory_date: '2026-11-06', scope_description: 'Rayon A et enceinte positive', status: 'clos', total_variance_qty: -2, lines: [{ id: 1, lot_id: 301, theoretical_qty: 14, counted_qty: 12, variance_qty: -2, lot: { batch_number: 'LOT-A22' } }] },
  ],
  temperatures: [
    { id: 331, zone_name: 'Enceinte positive', measured_temperature: 5.4, min_threshold: 2, max_threshold: 8, is_excursion: false, measured_at: now, effectiveness_status: 'conforme', pharmacist_decision: null, created_action_id: null, equipment: { id: 151, code: 'EQ-FR-01', designation: 'Enceinte positive' } },
    { id: 332, zone_name: 'Enceinte positive', measured_temperature: 9.1, min_threshold: 2, max_threshold: 8, is_excursion: true, measured_at: '2026-11-11T06:10:00', effectiveness_status: 'a_decider', pharmacist_decision: null, created_action_id: null, equipment: { id: 151, code: 'EQ-FR-01', designation: 'Enceinte positive' } },
  ],
  sales: [
    { id: 341, reference: 'VTE-1044', sale_type: 'ordonnance', status: 'a_valider', patient_minimized_ref: 'PAT-DEMO-19', total_amount: 5000, payment_status: 'en_attente', payment_method: null, lines: [{ id: 1, product_id: 271, lot_id: 301, quantity: 2, unit_price: 2500, line_total: 5000, dispensing_advice: 'À prendre selon l’ordonnance', product: { id: 271, code: 'AMOX-500', name: 'Amoxicilline 500 mg' }, lot: { batch_number: 'LOT-A22' } }], prescription: { prescription_ref: 'ORD-DEMO-88', prescriber_name: 'Dr Démo' } },
    { id: 342, reference: 'VTE-1040', sale_type: 'comptoir_libre', status: 'payee', patient_minimized_ref: null, total_amount: 2500, payment_status: 'confirme', payment_method: 'especes', lines: [{ id: 2, product_id: 271, lot_id: 301, quantity: 1, unit_price: 2500, line_total: 2500, dispensing_advice: null, product: { id: 271, code: 'AMOX-500', name: 'Amoxicilline 500 mg' }, lot: { batch_number: 'LOT-A22' } }] },
  ],
  returns: [
    { id: 351, reference: 'RET-2026-003', sale_id: 342, product_id: 271, quantity_returned: 1, reason: 'Boîte non ouverte, erreur de dosage demandée', pharmacist_decision: 'a_evaluer', status: 'en_attente', created_action_id: null, sale: { reference: 'VTE-1040', total_amount: 2500 }, product: { name: 'Amoxicilline 500 mg' } },
  ],
  credits: [
    { id: 361, credit_ref: 'AVR-2026-001', amount: 2500, status: 'emis', reason: 'Échange après retour évalué', issued_at: '2026-11-07', sale: { reference: 'VTE-1033' } },
  ],
  safety: [
    { id: 371, reference: 'SIG-2026-002', report_type: 'qualite', severity: 'moderee', description: 'Opercule décollé signalé au comptoir, lot isolé.', external_transmission_status: 'non_transmis', external_ack_ref: null, created_action_id: 21, product: { name: 'Amoxicilline 500 mg' }, lot: { batch_number: 'LOT-A22' } },
  ],
  registers: [
    { id: 381, code: 'CAISSE-01', name: 'Caisse comptoir', location_label: 'Comptoir principal', discrepancy_alert_threshold: 1000 },
  ],
  sessions: [
    { id: 391, session_ref: 'SES-2026-1112', cash_register_id: 381, opened_at: '2026-11-12T07:45:00', closed_at: null, opening_float: 50000, expected_closing_balance: 87500, actual_closing_balance: null, discrepancy_amount: 0, status: 'ouverte', register: { code: 'CAISSE-01', name: 'Caisse comptoir' }, cashier: { name: 'Amina Dossou' } },
  ],
  transactions: [
    { id: 401, transaction_ref: 'ENC-778', transaction_type: 'encaissement', payment_method: 'especes', amount: 2500, status: 'valide', reversal_reason: null, occurred_at: now, session: { session_ref: 'SES-2026-1112' } },
    { id: 402, transaction_ref: 'ENC-771', transaction_type: 'encaissement', payment_method: 'mobile', amount: 6000, status: 'annulee', reversal_reason: 'Doublon de saisie', occurred_at: '2026-11-12T09:10:00', session: { session_ref: 'SES-2026-1112' } },
  ],
  expenses: [
    { id: 411, reference: 'DEP-2026-19', category: 'fournitures', amount: 8000, reason: 'Sacs et étiquettes de quarantaine', status: 'en_attente', requested_by: { name: 'Yves Koffi' } },
  ],
  handovers: [
    { id: 421, theoretical_cash: 87500, counted_cash: 87000, variance_amount: -500, status: 'en_attente_signature', anomalies_notes: 'Écart sous le seuil d’alerte', outgoing_signed_at: now, session: { session_ref: 'SES-2026-1111' }, outgoing_user: { name: 'Yves Koffi' }, incoming_user: { name: 'Amina Dossou' } },
  ],
  reconciliations: [
    { id: 431, reference: 'RAP-2026-11-11', period_date: '2026-11-11', total_expected: 240000, total_declared: 239500, total_variance: -500, status: 'ecart', created_action_id: null },
  ],
  metrics: [
    { code: 'CAPA_CLOSURE_RATE', module_key: 'qualite', title: 'Taux de clôture des actions', definition: 'Actions clôturées / actions échues sur la période', unit: '%', numerator: 3, denominator: 5, value: 60, display_value: '60 %', previous_display: '40 %', computed_at: now },
    { code: 'STOCK_CONFORMITY_RATE', module_key: 'stock', title: 'Lots conformes', definition: 'Lots vendables hors rappel / lots avec stock', unit: '%', numerator: 1, denominator: 2, value: 50, display_value: '50 %', previous_display: '67 %', computed_at: now },
    { code: 'CASH_CLEAN_CLOSE_RATE', module_key: 'caisse', title: 'Clôtures sans écart', definition: 'Sessions écart nul / sessions closes', unit: '%', numerator: 0, denominator: 0, value: null, display_value: 'non disponible', previous_display: 'non disponible', computed_at: now },
  ],
  reportTemplates: [
    { id: 441, code: 'TPL-SMQ-01', title: 'Bilan mensuel SMQ', category: 'smq_bpd', metric_codes: ['CAPA_CLOSURE_RATE', 'STOCK_CONFORMITY_RATE'], default_format: 'csv', is_scheduled: true, cron_schedule: '0 8 1 * *', consent_confirmed: true },
  ],
  runs: [
    { id: 451, reference: 'RPT-1101', title: 'Bilan Officinal Consolidé', period_start: '2026-10-01', period_end: '2026-10-31', status: 'fige', generated_at: '2026-11-01T08:00:00', computed_metrics: [], exports: [] },
  ],
  jobs: [
    { id: 461, channel: 'email', status: 'echec', attempts: 2, last_error: 'Boîte destinataire fictive refusée', scheduled_for: now, template: { code: 'TPL-SMQ-01', title: 'Bilan mensuel SMQ' } },
  ],
  saasPlans: [
    { id: 471, code: 'PACK-BPD', name: 'Officine accompagnée', description: 'Qualité, stock et caisse', price_label: 'Sur devis', features: [{ id: 1, module_key: 'qualite', feature_label: 'Modules 4 à 7', is_included: true }] },
  ],
  subscriptions: [
    { id: 481, reference: 'SUB-2026-014', status: 'active', suspension_reason: null, data_retained: true, started_at: '2026-01-15', plan: { id: 471, code: 'PACK-BPD', name: 'Officine accompagnée' } },
    { id: 482, reference: 'SUB-2025-002', status: 'suspendue', suspension_reason: 'Facture en attente — démo', data_retained: true, started_at: '2025-04-01', plan: { id: 471, code: 'PACK-BPD', name: 'Officine accompagnée' } },
  ],
  tickets: [
    { id: 491, reference: 'TKT-2201', subject: 'Relevé de température illisible', description: 'Le tableau du matin affiche un tiret à la place de la valeur.', priority: 'haute', status: 'ouvert', opened_by: { name: 'Amina Dossou' } },
  ],
  accessRequests: [
    { id: 501, reason: 'Reproduire l’affichage du relevé', requested_scope: ['temperatures', 'equipements'], duration_hours: 4, status: 'en_attente', expires_at: null, requester: { name: 'Support Démo', email: 'support.demo@bestpharma.local' } },
  ],
  settings: [
    { id: 511, setting_key: 'mfa_policy', setting_value: { enforce_titulaire: true, grace_days: 7 } },
  ],
  audit: [
    { id: 521, event_type: 'subscription.viewed', target_type: 'subscription', occurred_at: now, actor: { name: 'Amina Dossou' } },
  ],
  documents: [
    { id: 531, title: 'Procédure de réception', kind: 'procedure', process: 'Approvisionnement', status: 'approved', version: 2, content: 'Contrôle du bordereau, quarantaine, levée motivée.', sha256: 'demo-doc-531' },
    { id: 532, title: 'Mode opératoire nettoyage comptoir', kind: 'mop', process: 'Locaux', status: 'draft', version: 1, content: 'Brouillon fictif à relire.', sha256: 'demo-doc-532' },
  ],
  sources: [
    { id: 541, source_kind: 'bpd', original_name: 'referentiel-bpd-extrait.txt', sha256: 'a1c4e8b2d091', provenance: 'Copie de travail interne, 10 novembre 2026', status: 'qualified', document_code: 'BPD-LOC', document_kind: 'procedure' },
  ],
  docTemplates: [
    { id: 551, name: 'Canevas relevé de température', version: 1, status: 'draft', fields: 'objectif', sha256: 'demo-tpl-551' },
  ],
}

/** Translate the fixture calendar as a whole, preserving deadlines and event order. */
function demoDate(value: string): string {
  const offset = Date.parse(`${officeToday()}T00:00:00Z`) - Date.UTC(2026, 10, 12)
  return new Date(Date.parse(`${value.slice(0, 10)}T12:00:00Z`) + offset).toISOString().slice(0, 10) + value.slice(10)
}

function officeToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function enrichSeed() {
  // Local fixture builders deliberately keep the existing public row shapes.
  const tables = db as Record<string, any[]>
  const copy = (table: string, id: number, changes: Record<string, unknown>) => {
    const row = { ...clone(tables[table][0]), ...changes, id }
    tables[table].push(row)
    return row
  }
  copy('plans', 13, { reference: 'PLAN-DEMO-03', title: 'Plan réception à reprendre — démonstration', status: 'rejected', objective: 'Motif fictif : critères d’efficacité manquants.' })
  copy('plans', 14, { reference: 'PLAN-DEMO-04', title: 'Plan accueil validé — démonstration', status: 'approved', owner_id: 2 })
  copy('actions', 24, { title: 'Isoler le lot après excursion — démonstration', description: 'Décision pédagogique en attente, aucune libération réelle.', priority: 'high', due_date: '2026-11-13', sources: [{ source_type: 'temperature', source_id: 332, label: 'Excursion fictive' }] })
  copy('actions', 25, { title: 'Tracer les refus de dispensation — démonstration', owner_id: 2, due_date: '2026-11-22', sources: [{ source_type: 'inspection', source_id: 42, label: 'Inspection dispensation fictive' }] })
  tables.actions[0].sources = [{ source_type: 'supplier_complaint', source_id: 251, label: 'Litige froid fictif' }]
  tables.actions[1].sources = [{ source_type: 'nonconformity', source_id: 61, label: 'Quarantaine fictive' }]
  tables.actions[2].sources = [{ source_type: 'document', source_id: 531, label: 'Procédure fictive' }]
  tables.inspections[1].action_links = [{ id: 1, action_id: 25, action: { id: 25, title: tables.actions[4].title, status: 'open' } }]
  copy('inspections', 43, { reference: 'AI-DEMO-015', title: 'Réception en cours — démonstration', status: 'in_progress', planned_date: '2026-11-10', process_scope: 'Approvisionnement & Stockage', items: [], report: null, action_links: [] })
  copy('complaints', 52, { reference: 'REC-DEMO-007', title: 'Conseil expliqué — démonstration', status: 'closed', received_date: '2026-10-20', responses: [{ id: 2, response_text: 'Réponse pédagogique acceptée.', responded_at: '2026-10-21T09:00:00', responder: team[0] }] })
  copy('complaints', 53, { reference: 'REC-DEMO-008', title: 'Réclamation anonyme — démonstration', status: 'received', is_anonymous: true, complainant_name: null, received_date: '2026-11-12' })
  copy('ncs', 62, { reference: 'NC-DEMO-019', source_type: 'reclamation', complaint_id: 51, title: 'Opercule à investiguer — démonstration', status: 'declared', severity: 'mineure', root_cause: null, action_links: [], detection_date: '2026-11-10' })
  tables.complaints[0].nonconformities = [{ id: 62, reference: 'NC-DEMO-019', title: tables.ncs[1].title, status: 'declared' }]
  copy('ncs', 63, { reference: 'NC-DEMO-020', title: 'Accueil tracé — démonstration', status: 'closed', severity: 'mineure', action_links: [{ id: 3, action_id: 23 }], effectiveness_reviews: [{ id: 1, is_effective: true, comments: 'Vérification pédagogique uniquement.' }] })
  copy('scenarios', 82, { reference: 'PCA-DEMO-03', title: 'Indisponibilité informatique — démonstration', threat_type: 'informatique', status: 'draft', exercises: [], crisis_contacts: [], trigger_events: 'Postes de démonstration inaccessibles.', immediate_actions: 'Utiliser le registre pédagogique papier.', alternative_operations: 'Aucune opération réelle.' })
  copy('leaves', 102, { status: 'approuve', start_date: '2026-10-10', end_date: '2026-10-14', decision_notes: 'Accord pédagogique.' })
  copy('leaves', 103, { status: 'refuse', start_date: '2026-12-01', end_date: '2026-12-05', decision_notes: 'Chevauchement avec une garde fictive.' })
  tables.employees[1].status = 'actif'
  copy('trainingPlans', 122, { theme: 'Réception et quarantaine — démonstration', status: 'realise', sessions: [{ id: 2, session_date: '2026-10-15', start_time: '09:00', end_time: '12:00', location: 'Salle démo', trainer_name: 'Titulaire Démo', status: 'realisee', attendances: [{ id: 1, employee_id: 91, is_present: true }, { id: 2, employee_id: 92, is_present: true }] }] })
  copy('reviews', 132, { status: 'brouillon', review_date: '2026-11-20', criteria_scores: [], overall_score: null, strengths: '', improvements: '' })
  tables.locations[0].equipments_count = 0
  tables.locations[1].equipments_count = 1
  tables.locations.push({ id: 143, name: 'Local technique — démonstration', description: 'Zone du groupe fictif', is_active: true, equipments_count: 1 })
  tables.equipments[1].current_location_id = 143
  tables.equipments[1].location = { id: 143, name: 'Local technique — démonstration' }
  copy('maintenancePlans', 162, { equipment_id: 151, last_performed_at: '2026-10-02', next_due_date: '2027-01-02', equipment: tables.maintenanceEvents[0].equipment })
  tables.cleaningOccurrences[1].plan.zone_name = 'Comptoir'
  copy('cleaningOccurrences', 203, { planned_date: '2026-11-13', status: 'planifie', is_verified: false, performed_by: null })
  copy('withdrawals', 212, { status: 'refuse', decided_at: '2026-11-05T10:00:00', withdrawal_reason: 'Remplacement prématuré — décision fictive.' })
  copy('selections', 232, { reference: 'SEL-DEMO-05', title: 'Consultation sans devis — démonstration', status: 'brouillon', quotes: [] })
  copy('selections', 233, { reference: 'SEL-DEMO-06', title: 'Vaccins : choix validé — démonstration', status: 'validee', selected_supplier_id: 221, validated_at: '2026-11-01T10:00:00', selection_justification: 'Exercice pédagogique, aucun achat réel.', quotes: [{ ...tables.selections[0].quotes[0], id: 3, is_retained: true }] })
  tables.products[0].amm_source_verified = false
  tables.products[0].amm_source_label = 'Démonstration : aucune AMM vérifiée'
  tables.products[1].sellable_stock = 0
  tables.suggestions[0].origin_formula = 'max(quantité de réapprovisionnement, seuil − disponible)'
  tables.suggestions.push({ product_id: 272, code: 'VAC-DEMO', name: 'Vaccin démo (froid)', supplier_id: 221, supplier_name: tables.suppliers[0].name, current_sellable_stock: 0, min_stock_threshold: 10, suggested_qty: 20, unit_price: 4500, origin_formula: tables.suggestions[0].origin_formula })
  copy('orders', 282, { reference: 'CMD-DEMO-091', status: 'brouillon', total_estimated_amount: 0, lines: [] })
  copy('orders', 283, { reference: 'CMD-DEMO-089', status: 'recue', order_date: '2026-11-10', total_estimated_amount: 135000, lines: [{ id: 2, product_id: 272, ordered_qty: 30, received_qty: 30, unit_price: 4500, line_total: 135000, product: tables.products[1] }] })
  Object.assign(tables.receipts[0], { order_id: 283, supplier_id: 221, lines: [{ id: 1, product_id: 272, lot_id: 302, received_qty: 30 }] })
  tables.movements[0].reason = 'Historique pédagogique : réception initiale de 40 boîtes'
  tables.movements[0].performed_at = '2026-10-01T10:00:00'
  copy('movements', 312, { movement_type: 'sortie', quantity_delta: -26, balance_after: 14, reason: 'Sorties pédagogiques agrégées', performed_at: '2026-11-05T10:00:00' })
  copy('movements', 313, { movement_type: 'ajustement', quantity_delta: -2, balance_after: 12, reason: 'Inventaire fictif INV-2026-11', performed_at: '2026-11-06T10:00:00' })
  copy('movements', 314, { product: { id: 272, code: 'VAC-DEMO', name: tables.products[1].name }, lot: { id: 302, batch_number: 'LOT-V09' }, quantity_delta: 30, balance_after: 30, performed_at: '2026-11-11T10:15:00', reason: 'Réception fictive en quarantaine' })
  tables.temperatures[1].created_action_id = 24
  copy('sales', 343, { reference: 'VTE-DEMO-1045', status: 'refusee', payment_status: 'en_attente', total_amount: 0, lines: [], prescription: null, patient_minimized_ref: 'PAT-DEMO-20' })
  copy('sales', 344, { reference: 'VTE-DEMO-1033', status: 'payee', payment_status: 'confirme', payment_method: 'especes', total_amount: 2500, lines: clone(tables.sales[1].lines) })
  tables.sales[0].sold_at = '2026-11-12T08:00:00'
  tables.sales[1].sold_at = '2026-11-12T08:15:00'
  tables.sales[2].sold_at = '2026-11-12T08:20:00'
  tables.sales[3].sold_at = '2026-11-07T11:00:00'
  for (let day = 1; day <= 4; day++) copy('sales', 344 + day, {
    reference: `VTE-DEMO-HIST-${day}`, status: 'payee', payment_status: 'confirme', payment_method: 'especes', prescription: null,
    sold_at: `2026-11-${String(12 - day).padStart(2, '0')}T11:00:00`, total_amount: day * 2500,
    lines: [{ ...clone(tables.sales[1].lines[0]), id: 10 + day, quantity: day, line_total: day * 2500 }],
  })
  copy('returns', 352, { reference: 'RET-DEMO-002', sale_id: 344, status: 'valide', pharmacist_decision: 'accepte', sale: { id: 344, reference: 'VTE-DEMO-1033', total_amount: 2500 } })
  Object.assign(tables.credits[0], { sale_id: 344, return_id: 352, sale: { id: 344, reference: 'VTE-DEMO-1033' } })
  Object.assign(tables.safety[0], { complaint_id: 51, product_id: 271, lot_id: 301, created_action_id: null, description: 'Signalement pédagogique : boîte retournée isolée, pas de rappel réel du lot disponible.' })
  tables.sessions[0].expected_closing_balance = 52500
  copy('sessions', 392, { session_ref: 'SES-DEMO-PREV', opened_at: '2026-11-11T07:45:00', closed_at: '2026-11-11T20:00:00', expected_closing_balance: 87500, actual_closing_balance: 87000, discrepancy_amount: -500, status: 'cloturee' })
  tables.handovers[0].session = { session_ref: 'SES-DEMO-PREV' }
  for (const transaction of tables.transactions) transaction.session_id = 391
  tables.transactions[0].sale_id = 342
  copy('expenses', 412, { reference: 'DEP-DEMO-20', status: 'refusee', reason: 'Demande pédagogique sans justificatif.' })
  tables.reconciliations[0].total_expected = 87500
  tables.reconciliations[0].total_declared = 87000
  copy('jobs', 462, { status: 'en_attente', attempts: 0, last_error: null })
  copy('tickets', 492, { reference: 'TKT-DEMO-2202', subject: 'Aide au filtre — démonstration', status: 'resolu' })
  copy('accessRequests', 502, { status: 'refuse', reason: 'Accès non nécessaire — démonstration', requested_scope: [], duration_hours: 0 })
  tables.sources[0].original_name = 'extrait-pedagogique-DEMO.txt'
  tables.sources[0].provenance = 'Démonstration : contenu pédagogique inventé, sans valeur réglementaire'
  tables.sources[0].sha256 = 'demo-non-cryptographique-541'
  tables.inspections[1].report.sha256_hash = 'demo-non-cryptographique-7'
  const assortments = [
    { id: 273, code: 'PARA-DEMO', name: 'Paracétamol 500 mg — démo', dci: 'Paracétamol', qty: 86, min: 25, purchase: 650, price: 1000, expiry: '2027-08-15', status: 'disponible' },
    { id: 274, code: 'SRO-DEMO', name: 'Sels de réhydratation — démo', dci: 'Sels de réhydratation', qty: 8, min: 15, purchase: 250, price: 500, expiry: '2026-12-02', status: 'disponible' },
    { id: 275, code: 'SERUM-DEMO', name: 'Sérum physiologique — démo', dci: 'Chlorure de sodium', qty: 42, min: 20, purchase: 900, price: 1500, expiry: '2027-05-01', status: 'disponible' },
    { id: 276, code: 'PANS-DEMO', name: 'Pansements stériles — démo', dci: null, qty: 0, min: 10, purchase: 500, price: 850, expiry: '2027-09-01', status: 'disponible' },
    { id: 277, code: 'VIT-DEMO', name: 'Vitamine C — démo', dci: 'Acide ascorbique', qty: 16, min: 12, purchase: 1100, price: 1800, expiry: '2026-11-02', status: 'perime' },
    { id: 278, code: 'GEL-DEMO', name: 'Gel hydroalcoolique — démo', dci: null, qty: 21, min: 10, purchase: 1200, price: 2000, expiry: '2027-06-30', status: 'rappele' },
  ]
  for (const item of assortments) {
    const product = copy('products', item.id, { code: item.code, barcode: null, name: item.name, dci: item.dci, category: 'produit_demo', dosage: null, pharmaceutical_form: 'Présentation de démonstration',
      purchase_price: item.purchase, selling_price: item.price, min_stock_threshold: item.min, reorder_quantity: item.min * 2,
      sellable_stock: item.status === 'disponible' ? item.qty : 0, amm_number: null, amm_source_verified: false, amm_source_label: null, units: [] })
    const lot = copy('lots', item.id + 30, { product_id: item.id, batch_number: `LOT-DEMO-${item.id}`, expiry_date: item.expiry, storage_zone: 'Réserve pédagogique', available_qty: item.qty,
      unit_cost: item.purchase, status: item.status, is_sellable: item.status === 'disponible', product: { id: product.id, code: product.code, name: product.name, base_unit: 'Boîte', is_thermosensitive: false } })
    copy('movements', item.id + 60, { product: { id: product.id, code: product.code, name: product.name }, lot: { id: lot.id, batch_number: lot.batch_number },
      quantity_delta: item.qty, balance_after: item.qty, reason: 'Stock initial pédagogique — aucune réception réelle', performed_at: '2026-11-01T09:00:00' })
  }
  for (const [id, first, last, role] of [[93, 'Préparatrice', 'Démo', 'Préparatrice'], [94, 'Gestionnaire', 'Exemple', 'Gestionnaire de stock'], [95, 'Caissière', 'Démo', 'Caissière'], [96, 'Apprenant', 'Exemple', 'Stagiaire']] as const) {
    copy('employees', id, { first_name: first, last_name: last, role_title: role, matricule: `RH-DEMO-${id}`, email: `collaborateur-${id}@example.test`, status: id === 96 ? 'suspendu' : 'actif',
      ordre_b_number: null, ordre_b_expiry: null, qualifications: [], emergency_contact: null })
  }
  // Recursively normalize both primary rows and embedded relation snapshots.
  const normalize = (value: any, key = ''): any => {
    if (Array.isArray(value)) return value.map(item => normalize(item, key))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v, k)]))
    if (typeof value === 'number' && ['year', 'year_start', 'year_end'].includes(key)) return value + Number(officeToday().slice(0, 4)) - 2026
    if (typeof value !== 'string') return value
    if (value === now) return value
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) return demoDate(value)
    if (key === 'email') return value.endsWith('@example.test') ? value : value.includes('support') ? 'support@example.test' : value.includes('contact') ? 'fournisseur@example.test' : value.includes('amina') ? 'titulaire@example.test' : 'adjoint@example.test'
    if (key === 'phone') return 'Non joignable — démonstration'
    let text = value.replace(/Amina Dossou/g, 'Titulaire Démo').replace(/Yves Koffi/g, 'Adjoint Démo').replace(/Amina/g, 'Titulaire').replace(/Dossou/g, 'Démo').replace(/Yves/g, 'Adjoint').replace(/Koffi/g, 'Démo')
    if (['reference', 'code', 'matricule', 'batch_number', 'sale_ref', 'session_ref', 'transaction_ref', 'credit_ref', 'contract_ref', 'order_reference', 'delivery_note_ref', 'export_ref', 'document_code'].includes(key) && !text.includes('DEMO')) text = `DEMO-${text}`
    return text
  }
  db = normalize(db)
  db.metrics.forEach(metric => { metric.code = metric.code.replace(/^DEMO-/, '') })
  ;(db.runs as any[])[0].computed_metrics = reportMetrics(db.runs[0].period_start, db.runs[0].period_end)
  const normalizedTeam = normalize(team)
  team.splice(0, team.length, ...normalizedTeam)
}

enrichSeed()
const initialDb = clone(db)
const storagePrefix = 'bestpharma.demo.boards.v1.'
// Read only the persisted selector: importing supportDemo would couple this data
// adapter to Vue and the live quality service. Callers may pass an explicit ID.
function officeContext(officeId?: string) {
  let support: { selectedOffice?: string; offices?: Array<{ id: string; name: string }> } = {}
  try { support = JSON.parse(localStorage.getItem('bestpharma.demo.modules12.v1') || '{}') || {} } catch { /* Other simulator owns its validation. */ }
  const id = officeId ?? support.selectedOffice ?? sessionStorage.getItem('bestpharma.officine') ?? 'off-1'
  return { id, name: support.offices?.find(office => office.id === id)?.name || `Officine démonstration ${id}` }
}
const storageKey = (officeId?: string) => storagePrefix + encodeURIComponent(officeContext(officeId).id)

/** Reset only the selected officine; never touch live data or other demo modules. */
export function resetBoardsDemo(officeId?: string) {
  localStorage.removeItem(storageKey(officeId))
}

/** The second active demo office gets its own deterministic situation. */
function officeSeed(officeId?: string) {
  const seed = clone(initialDb)
  if (officeContext(officeId).id === 'off-2') {
    const action = (seed.actions as any[]).find(row => row.status === 'open')
    if (action) action.status = 'closed'
    const lot = (seed.lots as any[]).find(row => row.status === 'disponible' && row.is_sellable && row.available_qty > 0)
    if (lot) { lot.status = 'quarantaine'; lot.is_sellable = false }
    const session = (seed.sessions as any[]).find(row => row.status === 'cloturee')
    if (session) session.discrepancy_amount = -500
  }
  return seed
}

function loadDemo(officeId?: string) {
  const raw = localStorage.getItem(storageKey(officeId))
  if (!raw) { db = officeSeed(officeId); seq = 1000; return }
  try {
    const saved = JSON.parse(raw)
    if (saved.schema !== 1 || !Number.isSafeInteger(saved.seq) || saved.seq < 1000 || !saved.db || Object.keys(initialDb).some(key => !Array.isArray(saved.db[key]))) throw new Error()
    db = saved.db
    seq = saved.seq
  } catch {
    throw new Error('Données de démonstration illisibles. Réinitialisez les tableaux de cette officine.')
  }
}

export interface DemoDashboard {
  officeId: string | number
  officeName: string
  generatedAt: string
  sales: { todayAmount: number; todayCount: number; series: Array<{ date: string; amount: number; count: number }> }
  stock: { products: number; availableLots: number; quarantineLots: number; lowStock: number; expiringLots: number }
  quality: { openNc: number; overdueActions: number; plannedInspections: number }
  team: { activeEmployees: number; plannedTrainings: number }
  alerts: Array<{ id: string; title: string; detail: string; severity: 'critical' | 'warning' | 'info'; to: string }>
  activity: Array<{ id: string; title: string; detail: string; at: string; to: string }>
}

const dateToday = officeToday
const overdue = (row: any) => !['closed', 'cancelled'].includes(row.status) && Boolean(row.due_date) && row.due_date < dateToday()
const expiring = (row: any) => row.available_qty > 0 && row.expiry_date >= dateToday() && Date.parse(row.expiry_date) <= Date.now() + 90 * 86400000
function getCurrentStockSummary() {
  return { products: db.products.length,
    availableLots: db.lots.filter(lot => lot.is_sellable && lot.status === 'disponible' && lot.available_qty > 0 && lot.expiry_date >= dateToday()).length,
    quarantineLots: db.lots.filter(lot => lot.status === 'quarantaine').length,
    lowStock: db.products.filter(product => product.sellable_stock < product.min_stock_threshold).length,
    expiringLots: db.lots.filter(expiring).length }
}

/** Purely local demo summary. No stockDemo data and no network requests. */
export function getDemoDashboard(officeId?: string): DemoDashboard {
  loadDemo(officeId)
  refreshDerived()
  const tables = db as Record<string, any[]>
  const context = officeContext(officeId)
  const series = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.parse(`${dateToday()}T12:00:00Z`) - (6 - index) * 86400000).toISOString().slice(0, 10)
    const paid = tables.sales.filter(sale => sale.status === 'payee' && sale.payment_status === 'confirme' && sale.sold_at?.slice(0, 10) === date)
    return { date, amount: paid.reduce((sum, sale) => sum + Number(sale.total_amount), 0), count: paid.length }
  })
  const low = tables.products.filter(product => product.sellable_stock < product.min_stock_threshold)
  const quarantine = tables.lots.filter(lot => lot.status === 'quarantaine')
  const late = tables.actions.filter(overdue)
  const openNc = tables.ncs.filter(nc => !['closed', 'cancelled'].includes(nc.status))
  const alerts: DemoDashboard['alerts'] = [
    ...quarantine.map(lot => ({ id: `lot-${lot.id}`, title: 'Lot en quarantaine', detail: `${lot.batch_number} : ${lot.available_qty} unités non vendables (démonstration).`, severity: 'critical' as const, to: '/stock/approvisionnements' })),
    ...low.map(product => ({ id: `stock-${product.id}`, title: 'Stock sous seuil', detail: `${product.name} : ${product.sellable_stock} / seuil ${product.min_stock_threshold}.`, severity: 'warning' as const, to: '/stock/approvisionnements' })),
    ...late.map(action => ({ id: `action-${action.id}`, title: 'Action en retard', detail: action.title, severity: 'warning' as const, to: '/qualite/non-conformites' })),
    ...openNc.map(nc => ({ id: `nc-${nc.id}`, title: 'Non-conformité ouverte', detail: nc.title, severity: 'info' as const, to: '/qualite/non-conformites' })),
  ]
  const activity = [
    ...tables.sales.filter(sale => sale.sold_at).map(sale => ({ id: `sale-${sale.id}`, title: `${sale.reference} · ${sale.status}`, detail: `${sale.total_amount} FCFA — démonstration`, at: sale.sold_at, to: '/dispensation/ventes' })),
    ...tables.movements.map(movement => ({ id: `movement-${movement.id}`, title: movement.reason, detail: `${movement.quantity_delta} unités — démonstration`, at: movement.performed_at, to: '/stock/approvisionnements' })),
    ...tables.ncs.map(nc => ({ id: `nc-${nc.id}`, title: nc.title, detail: nc.status, at: `${nc.detection_date}T08:00:00`, to: '/qualite/non-conformites' })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10)
  return clone({
    officeId: context.id, officeName: context.name, generatedAt: new Date().toISOString(),
    sales: { todayAmount: series[6].amount, todayCount: series[6].count, series },
    stock: getCurrentStockSummary(),
    quality: { openNc: openNc.length, overdueActions: late.length, plannedInspections: tables.inspections.filter(inspection => inspection.status === 'planned').length },
    team: { activeEmployees: tables.employees.filter(employee => employee.status === 'actif').length, plannedTrainings: tables.trainingPlans.filter(plan => plan.status === 'planifie').length },
    alerts, activity,
  })
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
function page(rows: unknown[]) {
  return { data: { data: rows, current_page: 1, last_page: 1 } }
}
function list(rows: unknown[]) {
  return { data: rows }
}
function filtered(rows: any[], q: URLSearchParams) {
  const search = (q.get('search') || '').toLowerCase()
  const status = q.get('status') || ''
  const category = q.get('category') || ''
  const type = q.get('type') || ''
  return rows.filter((row) => {
    if (status && row.status !== status) return false
    if (category && row.category !== category) return false
    if (type && row.type !== type) return false
    if (search && !JSON.stringify(row).toLowerCase().includes(search)) return false
    return true
  })
}
function findId(path: string, prefix: string) {
  const match = path.slice(prefix.length).match(/^\/(\d+)$/)
  return match ? Number(match[1]) : null
}
function byId(rows: any[], id: number) {
  return rows.find((row) => row.id === id) || null
}

function resources(): Array<[string, any[]]> {
  return [
    ['/qualite/actions-v2/actions', db.actions], ['/qualite/actions-v2/plans', db.plans],
    ['/qualite/inspections', db.inspections], ['/qualite/nonconformites/nc', db.ncs],
    ['/qualite/nonconformites/complaints', db.complaints], ['/qualite/risques/pca/scenarios', db.scenarios], ['/qualite/risques', db.risks],
    ['/personnel/employees', db.employees], ['/locauxequipements/equipments', db.equipments],
    ['/stock/products', db.products], ['/stock/orders', db.orders], ['/stock/lots', db.lots],
    ['/dispensation/sales', db.sales], ['/dispensation/returns', db.returns],
    ['/documents', db.documents], ['/documents/library/sources', db.sources], ['/documents/library/templates', db.docTemplates],
  ]
}

function resource(path: string): { row: any; prefix: string; action: string } | null {
  for (const [prefix, rows] of resources()) {
    if (!path.startsWith(prefix + '/')) continue
    const match = path.slice(prefix.length).match(/^\/(\d+)(?:\/([a-z-]+))?$/)
    if (!match) continue
    const row = byId(rows, Number(match[1]))
    if (!row) throw new Error('Élément de démonstration introuvable.')
    return { row, prefix, action: match[2] || '' }
  }
  return null
}

function assertVersion(row: any, body: Record<string, unknown>) {
  if (body.version !== undefined && Number(body.version) !== row.version) throw new Error('Version périmée. Rechargez la démonstration.')
}

function update(path: string, body: Record<string, unknown>) {
  const target = resource(path)
  if (!target || target.action) throw new Error('Cette modification n’est pas disponible dans la démonstration.')
  const { row, prefix } = target
  if (prefix === '/documents' && row.status !== 'draft') throw new Error('Une version approuvée nécessite une nouvelle révision.')
  assertVersion(row, body)
  const forbidden = new Set(['id', 'version', 'status', 'sha256', 'sha256_hash', 'approved_by', 'approved_at', 'officine_id', 'sellable_stock', 'available_qty'])
  Object.assign(row, Object.fromEntries(Object.entries(body).filter(([key]) => !forbidden.has(key))))
  row.version = (row.version || 1) + 1
  return { data: row }
}

function transition(path: string, body: Record<string, unknown>) {
  const target = resource(path)
  if (!target) throw new Error('Cette action n’est pas disponible dans la démonstration.')
  const { row, prefix, action } = target
  assertVersion(row, body)
  if (prefix === '/qualite/actions-v2/actions') {
    const next = action === 'start' && row.status === 'open' ? 'in_progress'
      : action === 'complete' && ['open', 'in_progress'].includes(row.status) ? 'completed' : null
    if (!next) throw new Error('Transition non disponible ou preuves de vérification manquantes dans la démonstration.')
    row.status = next
  } else if (prefix === '/qualite/actions-v2/plans') {
    if (action === 'submit' && ['draft', 'rejected'].includes(row.status)) row.status = 'submitted'
    else if (action === 'decision' && row.status === 'submitted' && body.decision === 'approve') row.status = 'approved'
    else if (action === 'decision' && row.status === 'submitted' && body.decision === 'request_changes' && String(body.reason || '').trim()) row.status = 'rejected'
    else throw new Error('Décision de plan invalide ; un motif est requis pour les modifications.')
  } else if (prefix === '/stock/lots' && action === 'quarantine') {
    if (!String(body.reason || '').trim()) throw new Error('Un motif de décision est requis.')
    const status = body.event_type
    const release = status === 'levee_quarantaine' || status === 'levee'
    if (!['quarantaine', 'rappel', 'levee', 'levee_quarantaine'].includes(String(status))) throw new Error('Décision de quarantaine inconnue.')
    if (release && (!String(body.proof_reference || '').trim() || row.expiry_date < dateToday() || ['rappel', 'rappele'].includes(row.status))) throw new Error('Levée refusée : preuve requise, lot non périmé et non rappelé.')
    row.status = release ? 'disponible' : status === 'rappel' ? 'rappele' : status
    row.is_sellable = row.status === 'disponible'
    row.last_demo_decision = { reason: body.reason, proof_reference: body.proof_reference || null, at: new Date().toISOString() }
  } else if (prefix === '/documents' && action === 'submit' && row.status === 'draft') {
    row.status = 'pending'
  } else {
    throw new Error('Cette action n’est pas encore simulée. Aucune modification n’a été enregistrée.')
  }
  row.version = (row.version || 1) + 1
  return { data: row }
}

function counts(rows: any[], key: string): Record<string, number> {
  return rows.reduce((result, row) => { const value = String(row[key]); result[value] = (result[value] || 0) + 1; return result }, {} as Record<string, number>)
}
function ratio(part: number, total: number) { return total ? `${Math.round(part / total * 100)} %` : 'non disponible' }

function refreshDerived() {
  const tables = db as Record<string, any[]>
  for (const product of tables.products) product.sellable_stock = tables.lots.filter(lot => lot.product_id === product.id && lot.status === 'disponible' && lot.is_sellable && lot.expiry_date >= dateToday()).reduce((sum, lot) => sum + Number(lot.available_qty), 0)
  for (const action of tables.actions) action.overdue = overdue(action)
  tables.suggestions = tables.products.filter(product => product.sellable_stock < product.min_stock_threshold).map(product => ({
    product_id: product.id, code: product.code, name: product.name, supplier_id: product.default_supplier_id,
    supplier_name: tables.suppliers.find(supplier => supplier.id === product.default_supplier_id)?.name || 'À désigner',
    current_sellable_stock: product.sellable_stock, min_stock_threshold: product.min_stock_threshold,
    suggested_qty: Math.max(product.reorder_quantity, product.min_stock_threshold - product.sellable_stock), unit_price: product.purchase_price,
    origin_formula: 'max(quantité de réapprovisionnement, seuil − disponible)',
  }))
  const closedActions = tables.actions.filter(action => action.status === 'closed').length
  const stocked = tables.lots.filter(lot => lot.available_qty > 0)
  const sellable = stocked.filter(lot => lot.status === 'disponible' && lot.is_sellable && lot.expiry_date >= dateToday()).length
  const closedSessions = tables.sessions.filter(session => session.status === 'cloturee')
  const parts = [[closedActions, tables.actions.length], [sellable, stocked.length], [closedSessions.filter(session => session.discrepancy_amount === 0).length, closedSessions.length]]
  tables.metrics.forEach((metric, index) => {
    const pair = parts[index]; if (!pair) return
    Object.assign(metric, { numerator: pair[0], denominator: pair[1], value: pair[1] ? Math.round(pair[0] / pair[1] * 1000) / 10 : null, display_value: ratio(pair[0], pair[1]), previous_display: 'non disponible', computed_at: new Date().toISOString() })
  })
}

/** Reporting only: dated source events; stock remains a current-state metric as in API. */
function reportMetrics(start: string, end: string) {
  const tables = db as Record<string, any[]>
  const within = (date: unknown) => typeof date === 'string' && date.slice(0, 10) >= start && date.slice(0, 10) <= end
  const actions = tables.actions.filter(a => within(a.created_at || a.due_date))
  const sessions = tables.sessions.filter(s => s.status === 'cloturee' && within(s.closed_at))
  const lots = tables.lots.filter(l => l.available_qty > 0)
  const parts = [[actions.filter(a => a.status === 'closed').length, actions.length], [lots.filter(l => l.status === 'disponible' && l.is_sellable && l.expiry_date >= officeToday()).length, lots.length], [sessions.filter(s => Math.abs(Number(s.discrepancy_amount)) <= .01).length, sessions.length]]
  return tables.metrics.map((m, i) => {
    const [numerator, denominator] = parts[i] || [0, 0]
    return { ...m, definition: i === 0 ? 'Démo : actions clôturées / actions dont la date source (création ou échéance) appartient à la période' : m.definition, numerator, denominator, value: denominator ? Math.round(numerator / denominator * 1000) / 10 : null, display_value: ratio(numerator, denominator), previous_display: undefined, computed_at: new Date().toISOString() }
  })
}
function reportingPeriod(start: unknown, end: unknown) {
  const valid = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v
  if (!valid(start) || !valid(end) || start > end) throw new Error('Période de rapport invalide.')
}
function reportCodes(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.some(code => !db.metrics.some(m => m.code === code)) || new Set(value).size !== value.length) throw new Error('Sélection d’indicateurs inconnue ou vide.')
  return value as string[]
}

function get(path: string, q: URLSearchParams): unknown {
  if (path === '/team') return { members: team }
  if (path === '/qualite/actions-v2') {
    return { ...page(db.actions), indicators: { overdue: db.actions.filter(overdue).length, by_status: counts(db.actions, 'status'), definition: 'Échéance dépassée et état non clôturé — démonstration.', updated_at: new Date().toISOString() } }
  }
  if (path === '/qualite/actions-v2/plans') return { data: { data: db.plans }, can_write: true, can_approve: true }
  if (path === '/qualite/inspections/overview') {
    const core = ['Organisation Qualité', 'Personnel & Habilitations', 'Locaux & Chaîne du Froid', 'Approvisionnement & Stockage', 'Dispensation & Stupéfiants']
    const covered = [...new Set(db.inspections.filter(row => ['approved', 'closed'].includes(row.status)).map(row => row.process_scope))].filter(name => core.includes(name))
    return { indicators: { total: db.inspections.length, overdue: db.inspections.filter(row => row.planned_date < dateToday() && ['draft', 'planned'].includes(row.status)).length, coverage_rate: covered.length / core.length * 100, coverage_label: `${covered.length} processus couverts sur ${core.length}`, by_status: counts(db.inspections, 'status'), definition: 'Couverture pédagogique, aucune conformité réglementaire attestée.', updated_at: new Date().toISOString() }, core_processes: core, covered_processes: covered }
  }
  if (path === '/qualite/inspections/programs') return list(db.programs)
  if (path === '/qualite/inspections') return page(db.inspections)
  if (path === '/qualite/nonconformites/overview') {
    const closed = db.ncs.filter(row => row.status === 'closed').length
    return { indicators: { complaints_total: db.complaints.length, complaints_pending: db.complaints.filter(row => row.status !== 'closed').length, complaints_overdue_72h: db.complaints.filter(row => row.status !== 'closed' && Date.parse(row.received_date) < Date.now() - 72 * 3600000).length, nc_total: db.ncs.length, nc_open: db.ncs.length - closed, nc_closed: closed, nc_overdue_30d: db.ncs.filter(row => row.status !== 'closed' && Date.parse(row.detection_date) < Date.now() - 30 * 86400000).length, by_severity: counts(db.ncs, 'severity'), by_status: counts(db.ncs, 'status'), resolution_rate: ratio(closed, db.ncs.length), definition: 'NC clôturées / NC du jeu de démonstration.', updated_at: new Date().toISOString() } }
  }
  if (path === '/qualite/nonconformites/nc') return page(db.ncs)
  if (path === '/qualite/nonconformites/complaints') return page(db.complaints)
  if (path === '/qualite/risques/overview') {
    const scenarios = db.scenarios as any[]
    return { indicators: { total_risks: db.risks.filter(row => row.type === 'risk').length, total_opportunities: db.risks.filter(row => row.type === 'opportunity').length, by_criticality: counts(db.risks.map(row => ({ criticality: row.residual_assessment?.criticality_level || row.initial_assessment?.criticality_level || 'non_evalue' })), 'criticality'), pca_active_scenarios: scenarios.filter(row => row.status === 'active').length, pca_exercises_conducted: scenarios.reduce((sum, row) => sum + (row.exercises?.length || 0), 0), pca_average_rto_hours: scenarios.length ? scenarios.reduce((sum, row) => sum + Number(row.rto_hours || 0), 0) / scenarios.length : null, definition: 'Grille pédagogique locale ; aucune qualification réglementaire.', updated_at: new Date().toISOString() } }
  }
  if (path === '/qualite/risques') return page(db.risks)
  if (path === '/qualite/risques/pca/scenarios') return list(db.scenarios)
  if (path === '/personnel/overview') {
    const expiringCredentials = db.employees.filter(row => row.ordre_b_expiry && row.ordre_b_expiry >= dateToday() && Date.parse(row.ordre_b_expiry) <= Date.now() + 90 * 86400000)
    return { kpis: { total_employees: db.employees.length, active_employees: db.employees.filter(row => row.status === 'actif').length, on_leave_employees: db.employees.filter(row => row.status === 'conge').length, total_job_descriptions: 0, pending_leaves: db.leaves.filter(row => row.status === 'en_attente').length, shifts_this_month: db.shifts.filter(row => row.shift_date.startsWith(dateToday().slice(0, 7))).length, plans_this_year: db.trainingPlans.filter(row => row.year === Number(dateToday().slice(0, 4))).length, training_completion_rate: ratio(db.trainingPlans.filter(row => row.status === 'realise').length, db.trainingPlans.length), expiring_credentials_count: expiringCredentials.length }, expiring_credentials: expiringCredentials }
  }
  if (path === '/personnel/employees') return list(filtered(db.employees, q))
  if (path === '/personnel/leave-requests') return list(db.leaves)
  if (path === '/personnel/shifts') return list(db.shifts)
  if (path === '/personnel/training-plans') return list(db.trainingPlans)
  if (path === '/personnel/performance-reviews') return list(db.reviews)
  if (path === '/locauxequipements/overview') {
    const latest = [...db.generatorTests].sort((a, b) => b.test_date.localeCompare(a.test_date))[0]
    return { kpis: { total_equipments: db.equipments.length, in_service: db.equipments.filter(row => row.status === 'en_service').length, in_maintenance: db.equipments.filter(row => row.status === 'en_maintenance').length, out_of_order: db.equipments.filter(row => row.status === 'en_panne').length, withdrawn: db.equipments.filter(row => row.status === 'hors_service').length, critical_bpd_count: db.equipments.filter(row => row.criticality === 'critique_bpd').length, overdue_maintenances: db.maintenancePlans.filter(row => row.is_active && row.next_due_date < dateToday()).length, generator_last_test: latest ? { date: latest.test_date, result: latest.test_result, fuel_level: `${latest.fuel_level_percent} %` } : null, cleaning_completion_rate: ratio(db.cleaningOccurrences.filter(row => row.status === 'realise').length, db.cleaningOccurrences.filter(row => row.planned_date <= dateToday()).length), pending_withdrawals: db.withdrawals.filter(row => row.status === 'demande').length } }
  }
  if (path === '/locauxequipements/equipments') return list(filtered(db.equipments, q))
  if (path === '/locauxequipements/locations') return list(db.locations)
  if (path === '/locauxequipements/maintenance-plans') return list(db.maintenancePlans)
  if (path === '/locauxequipements/maintenance-events') return list(db.maintenanceEvents)
  if (path === '/locauxequipements/generator-tests') return list(db.generatorTests)
  if (path === '/locauxequipements/cleaning-plans') return list(db.cleaningPlans)
  if (path === '/locauxequipements/cleaning-occurrences') return list(db.cleaningOccurrences)
  if (path === '/locauxequipements/withdrawals') return list(db.withdrawals)
  if (path === '/achats/overview') {
    return { kpis: { total_suppliers: db.suppliers.length, active_suppliers: db.suppliers.filter(row => ['actif', 'qualifie'].includes(row.status)).length, qualified_suppliers: db.suppliers.filter(row => row.status === 'qualifie').length, pending_selections: db.selections.filter(row => !['validee', 'refusee'].includes(row.status)).length, pending_evaluations: db.evaluations.filter(row => row.decision === 'a_instruire').length, open_complaints: db.supplierComplaints.filter(row => row.status !== 'cloturee').length, expiring_contracts: db.contracts.filter(row => row.end_date >= dateToday() && Date.parse(row.end_date) < Date.now() + 90 * 86400000).length, average_score: db.evaluations.length ? db.evaluations.reduce((sum, row) => sum + Number(row.overall_score_on_5), 0) / db.evaluations.length : null } }
  }
  if (path === '/achats/suppliers') return list(filtered(db.suppliers, q))
  if (path === '/achats/selections') return list(db.selections)
  if (path === '/achats/evaluations') return list(db.evaluations)
  if (path === '/achats/complaints') return list(db.supplierComplaints)
  if (path === '/achats/contracts') return list(db.contracts)
  if (path === '/stock/overview') {
    const stock = getCurrentStockSummary()
    return { kpis: { total_products: stock.products, below_threshold_products: stock.lowStock, pending_orders: db.orders.filter(row => !['recue', 'annulee'].includes(row.status)).length, total_lots_available: stock.availableLots, expiring_soon_lots: stock.expiringLots, quarantine_lots: db.lots.filter(row => row.available_qty > 0 && ['quarantaine', 'rappele'].includes(row.status)).length, cold_chain_excursions: db.temperatures.filter(row => row.is_excursion).length, stock_conformity_rate: db.metrics[1].value } }
  }
  if (path === '/stock/products') return list(filtered(db.products, q))
  if (path === '/stock/order-suggestions') return list(db.suggestions)
  if (path === '/stock/orders') return list(db.orders)
  if (path === '/stock/receipts') return list(db.receipts)
  if (path === '/stock/lots') return list([...db.lots].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)))
  if (path === '/stock/movements') return list(db.movements)
  if (path === '/stock/inventories') return list(db.inventories)
  if (path === '/stock/temperatures') return list(db.temperatures)
  if (path === '/dispensation/overview') {
    return { kpis: { total_sales: db.sales.length, paid_sales: db.sales.filter(row => row.status === 'payee').length, pending_sales: db.sales.filter(row => row.status === 'a_valider').length, cancelled_sales: db.sales.filter(row => ['annulee', 'refusee'].includes(row.status)).length, total_returns: db.returns.length, pending_returns: db.returns.filter(row => row.status === 'en_attente').length, safety_reports_count: db.safety.length, review_approval_rate: 'non disponible' } }
  }
  if (path === '/dispensation/sales') return list(db.sales)
  if (path === '/dispensation/returns') return list(db.returns)
  if (path === '/dispensation/credits') return list(db.credits)
  if (path === '/dispensation/safety-reports') return list(db.safety)
  if (path === '/tresorerie/overview') {
    const closed = db.sessions.filter(row => row.status === 'cloturee')
    return { kpis: { open_sessions: db.sessions.filter(row => row.status === 'ouverte').length, today_receipts_total: db.transactions.filter(row => row.status === 'valide' && row.transaction_type === 'encaissement' && row.occurred_at.slice(0, 10) === dateToday()).reduce((sum, row) => sum + Number(row.amount), 0), pending_expenses: db.expenses.filter(row => row.status === 'en_attente').length, open_handovers: db.handovers.filter(row => row.status === 'en_attente_signature').length, reconciliations_with_variance: db.reconciliations.filter(row => row.total_variance !== 0).length, session_conformity_rate: ratio(closed.filter(row => row.discrepancy_amount === 0).length, closed.length) } }
  }
  if (path === '/tresorerie/registers') return list(db.registers)
  if (path === '/tresorerie/sessions') return list(db.sessions)
  if (path === '/tresorerie/transactions') return list(db.transactions)
  if (path === '/tresorerie/expenses') return list(db.expenses)
  if (path === '/tresorerie/handovers') return list(db.handovers)
  if (path === '/tresorerie/reconciliations') return list(db.reconciliations)
  if (path === '/reporting/overview') {
    const start = q.get('period_start') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), end = q.get('period_end') || dateToday()
    reportingPeriod(start, end)
    return { meta: { period_start: start, period_end: end, as_of: new Date().toISOString() }, kpis: { templates_count: db.reportTemplates.length, runs_count: db.runs.length, exports_count: db.runs.reduce((sum, row) => sum + row.exports.length, 0), failed_notifications: db.jobs.filter(row => row.status === 'echec').length }, metrics: reportMetrics(start, end) }
  }
  if (path === '/reporting/runs') return list(db.runs)
  if (path === '/reporting/templates') return list(db.reportTemplates)
  if (path === '/reporting/notification-jobs') return list(db.jobs)
  if (path === '/platformadmin/overview') {
    const active = db.subscriptions.filter(row => row.status === 'active').length
    return { kpis: { active_plans: db.saasPlans.length, total_subscriptions: db.subscriptions.length, active_subscriptions: active, suspended_subscriptions: db.subscriptions.filter(row => row.status === 'suspendue').length, open_tickets: db.tickets.filter(row => row.status !== 'resolu').length, pending_access_requests: db.accessRequests.filter(row => row.status === 'en_attente').length, audit_events_count: db.audit.length, subscription_active_rate: ratio(active, db.subscriptions.length) } }
  }
  if (path === '/platformadmin/plans') return list(db.saasPlans)
  if (path === '/platformadmin/subscriptions') return list(db.subscriptions)
  if (path === '/platformadmin/tickets') return list(db.tickets)
  if (path === '/platformadmin/support-access-requests') return list(db.accessRequests)
  if (path === '/platformadmin/settings') return list(db.settings)
  if (path === '/platformadmin/audit-events') return list(db.audit)
  if (path === '/documents') return page(db.documents)
  if (path === '/documents/library/sources') return page(db.sources)
  if (path === '/documents/library/templates') return page(db.docTemplates)
  if (path === '/documents/library/status') return { available: false, message: 'Démonstration : ces sources pédagogiques ne sont pas un référentiel BPD approuvé.' }

  for (const [prefix, rows] of resources()) {
    const id = findId(path, prefix)
    if (id) { const row = byId(rows, id); if (!row) throw new Error('Élément de démonstration introuvable.'); return { data: row } }
  }
  throw new Error('Cette consultation n’est pas disponible dans la démonstration.')
}

function add(rows: any[], body: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const id = ++seq
  const row = { version: 1, status: 'draft', reference: `DEMO-${id}`, ...extra, ...body, id }
  rows.unshift(row)
  return { data: row }
}

function post(path: string, body: Record<string, unknown>): unknown {
  if (path === '/qualite/actions-v2/actions') return add(db.actions, body, { status: 'open', overdue: false, sources: body.sources || [], priority: body.priority || 'normal' })
  if (path === '/qualite/actions-v2/plans') return add(db.plans, body, { status: 'draft', reference: `PLAN-DEMO-${seq + 1}` })
  if (path === '/qualite/inspections/programs') return add(db.programs, body, { status: 'active', inspections_count: 0 })
  if (path === '/qualite/inspections') return add(db.inspections, body, { status: 'planned', reference: `AI-DEMO-${seq + 1}`, lead_inspector: team[0], items: [], version: 1 })
  if (path === '/qualite/nonconformites/nc') return add(db.ncs, body, { status: 'declared', reference: `NC-DEMO-${seq + 1}`, severity: body.severity || 'mineure' })
  if (path === '/qualite/nonconformites/complaints') return add(db.complaints, body, { status: 'received', reference: `REC-DEMO-${seq + 1}` })
  if (path === '/qualite/risques/pca/scenarios') return add(db.scenarios, body, { status: 'draft', reference: `PCA-DEMO-${seq + 1}`, crisis_contacts: [], exercises: [] })
  if (path === '/qualite/risques') return add(db.risks, body, { status: 'identified', reference: `RSQ-DEMO-${seq + 1}`, owner: team[0] })
  if (path === '/personnel/employees') return add(db.employees, body, { status: 'actif', version: 1 })
  if (path === '/personnel/leave-requests') return add(db.leaves, body, { status: 'en_attente' })
  if (path === '/personnel/shifts') return add(db.shifts, body, { status: 'planifie' })
  if (path === '/personnel/training-plans') return add(db.trainingPlans, body, { status: 'planifie', sessions: [] })
  if (path === '/personnel/performance-reviews') return add(db.reviews, body, { status: 'brouillon' })
  if (path === '/locauxequipements/equipments') return add(db.equipments, body, { status: 'en_service', criticality: 'standard', version: 1 })
  if (path === '/locauxequipements/locations') return add(db.locations, body, { is_active: true })
  if (path === '/achats/suppliers') return add(db.suppliers, body, { status: 'actif', average_rating: 'non disponible', country: 'Bénin', version: 1 })
  if (path === '/achats/selections') return add(db.selections, body, { status: 'brouillon' })
  if (path === '/achats/evaluations') return add(db.evaluations, body, { decision: 'a_instruire' })
  if (path === '/achats/complaints') return add(db.supplierComplaints, body, { status: 'ouverte' })
  if (path === '/achats/contracts') return add(db.contracts, body, { status: 'actif' })
  if (path === '/stock/products') return add(db.products, body, { sellable_stock: 0, is_thermosensitive: false })
  if (path === '/stock/orders') return add(db.orders, body, { status: 'brouillon', total_estimated_amount: 0, lines: [] })
  if (path === '/stock/receipts') return add(db.receipts, body, { status: 'recue' })
  if (path === '/stock/inventories') return add(db.inventories, body, { status: 'ouvert', total_variance_qty: 0 })
  if (path === '/stock/temperatures') return add(db.temperatures, body, { is_excursion: false, effectiveness_status: 'conforme' })
  if (path === '/dispensation/sales') return add(db.sales, body, { status: 'a_valider', total_amount: 0, payment_status: 'en_attente', lines: [] })
  if (path === '/dispensation/returns') return add(db.returns, body, { status: 'en_attente', pharmacist_decision: 'a_evaluer' })
  if (path === '/dispensation/safety-reports') return add(db.safety, body, { external_transmission_status: 'non_transmis' })
  if (path === '/tresorerie/registers') return add(db.registers, body)
  if (path === '/tresorerie/sessions/open') return add(db.sessions, body, { status: 'ouverte', opened_at: now, discrepancy_amount: 0, expected_closing_balance: Number(body.opening_float) || 0 })
  if (path === '/tresorerie/transactions') return add(db.transactions, body, { status: 'valide', occurred_at: now, reversal_reason: null })
  if (path === '/tresorerie/expenses') return add(db.expenses, body, { status: 'en_attente' })
  if (path === '/tresorerie/handovers') return add(db.handovers, body, { status: 'en_attente_signature', outgoing_signed_at: now, variance_amount: 0, theoretical_cash: 0 })
  if (path === '/tresorerie/reconciliations') return add(db.reconciliations, body, { status: 'brouillon', total_expected: 0, total_declared: 0, total_variance: 0 })
  if (path === '/reporting/runs') {
    reportingPeriod(body.period_start, body.period_end)
    if (typeof body.reference !== 'string' || !body.reference.trim() || typeof body.title !== 'string' || !body.title.trim()) throw new Error('Référence et titre requis.')
    if (db.runs.some(r => r.reference === body.reference)) throw new Error('Cette référence de rapport existe déjà.')
    const template = body.template_id == null ? null : byId(db.reportTemplates, Number(body.template_id))
    if (body.template_id != null && (!Number.isSafeInteger(body.template_id) || !template)) throw new Error('Modèle introuvable dans cette officine.')
    const codes = reportCodes(body.metric_codes ?? template?.metric_codes ?? db.metrics.map(m => m.code))
    return add(db.runs, body, { status: 'fige', generated_at: new Date().toISOString(), template: clone(template), metric_codes: codes, computed_metrics: clone(reportMetrics(String(body.period_start), String(body.period_end)).filter(m => codes.includes(m.code))), exports: [] })
  }
  if (path === '/reporting/templates') {
    reportCodes(body.metric_codes)
    if (typeof body.code !== 'string' || !body.code.trim() || typeof body.title !== 'string' || !body.title.trim()) throw new Error('Code et titre requis.')
    if (db.reportTemplates.some(t => t.code === body.code)) throw new Error('Ce code de modèle existe déjà.')
    if (body.default_format && body.default_format !== 'csv') throw new Error('Seul le format CSV est disponible.')
    if (body.is_scheduled && (!body.consent_confirmed || !Array.isArray(body.recipients) || !body.recipients.length || body.recipients.some(id => !team.some(m => m.id === id)) || !['0 8 * * 1', '0 8 1 * *'].includes(String(body.cron_schedule)))) throw new Error('Fréquence, consentement et destinataires valides requis.')
    return add(db.reportTemplates, body, { consent_confirmed: Boolean(body.consent_confirmed) })
  }
  if (path === '/platformadmin/plans') return add(db.saasPlans, body, { features: [] })
  if (path === '/platformadmin/subscriptions') return add(db.subscriptions, body, { status: 'active', data_retained: true, plan: db.saasPlans[0] })
  if (path === '/platformadmin/tickets') return add(db.tickets, body, { status: 'ouvert' })
  if (path === '/platformadmin/settings') return add(db.settings, body, { setting_value: { note: 'démo' } })
  if (path === '/documents') return add(db.documents, body, { status: 'draft', version: 1, sha256: `demo-${seq}` })
  if (path === '/documents/library/templates') return add(db.docTemplates, body, { status: 'draft', version: 1, sha256: `demo-tpl-${seq}`, fields: 'objectif' })
  const reportExport = path.match(/^\/reporting\/runs\/(\d+)\/export$/)
  if (reportExport) {
    const row = byId(db.runs, Number(reportExport[1]))
    if (!row) throw new Error('Rapport de démonstration introuvable.')
    if (body.format && body.format !== 'csv') throw new Error('Seul le format CSV est disponible.')
    const cell = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    const content = ['Code;Indicateur;Module;Numérateur;Dénominateur;Valeur;Unité', ...row.computed_metrics.map((m: any) => [m.code, m.title, m.module_key, m.numerator, m.denominator, m.display_value, m.unit].map(cell).join(';'))].join('\n')
    const exported = { id: ++seq, export_ref: `EXP-DEMO-${seq}`, format: 'csv', exported_at: new Date().toISOString(), content }
    row.exports.push(exported)
    return { data: exported, content }
  }
  const retry = path.match(/^\/reporting\/notification-jobs\/(\d+)\/retry$/)
  if (retry) {
    const row = byId(db.jobs, Number(retry[1])); if (!row) throw new Error('Notification introuvable.')
    if (row.status !== 'echec') throw new Error('Seules les notifications en échec peuvent être reprises.')
    Object.assign(row, { status: 'en_attente', attempts: row.attempts + 1, last_error: null })
    return { data: row }
  }
  return transition(path, body)
}

export async function boardRequest<T>(path: string, method = 'GET', body?: unknown, officeId?: string): Promise<T> {
  loadDemo(officeId)
  refreshDerived()
  const [clean, query = ''] = path.split('?')
  const verb = method.toUpperCase()
  if (verb === 'GET') return clone(get(clean, new URLSearchParams(query))) as T
  if (!['POST', 'PUT', 'PATCH'].includes(verb)) throw new Error('Cette opération n’est pas disponible dans la démonstration.')
  const before = clone(db), previousSequence = seq
  try {
    const payload = verb === 'POST' ? post(clean, (body ?? {}) as Record<string, unknown>) : update(clean, (body ?? {}) as Record<string, unknown>)
    refreshDerived()
    localStorage.setItem(storageKey(officeId), JSON.stringify({ schema: 1, seq, db }))
    return clone(payload) as T
  } catch (error) {
    db = before; seq = previousSequence
    throw error
  }
}
