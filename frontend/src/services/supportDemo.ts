/** Demonstration only: no authorization boundary, no API fallback, no official ABMed status. */
import { reactive, computed } from 'vue'
import { demoMode } from './quality'
export type AssignmentStatus = 'pending'|'approved'|'refused'|'revoked'
export interface Assignment {id:string;name:string;function:string;scope:string;start:string;end:string;status:AssignmentStatus;reason:string}
export interface Office {id:string;name:string;code:string;city:string;department:string;address:string;phone:string;email:string;contact:string;status:'active'|'pending';assignments:Assignment[]}
export type RequestStatus = 'draft'|'submitted'|'triage'|'clarifications'|'converted'|'refused'|'withdrawn'
export interface ServiceRequest {id:string;officeId:string;title:string;theme:string;description:string;contact:string;availability:string;urgency:string;status:RequestStatus;message:string;created:string;version:number}
export type MissionStatus = 'draft'|'proposed'|'accepted'|'active'|'suspended'|'review'|'closed'|'refused'
export interface Visit {id:string;title:string;start:string;end:string;mode:string;status:'proposed'|'confirmed'|'completed'|'rescheduled'|'cancelled';report:string;history:string[]}
export interface Diagnosis {question:string;answer:'not_evaluated'|'conform'|'gap'|'not_applicable';reason:string}
export interface Deliverable {id:string;title:string;version:number;status:'shared'|'accepted'|'refused';content:string;decision:string}
export interface Mission {id:string;officeId:string;requestId?:string;title:string;objectives:string;scope:string;leadId:string;start:string;end:string;status:MissionStatus;version:number;visits:Visit[];diagnosis:Diagnosis[];diagnosisShared:boolean;deliverables:Deliverable[];comments:{id:string;text:string;author:string;date:string}[];summary:string;openActionsDecision:string}
export interface Event {id:string;officeId:string;target:string;title:string;date:string;actor:string}
interface State {offices:Office[];requests:ServiceRequest[];missions:Mission[];events:Event[];selectedOffice:string;persona:'office'|'company'}
export const storageKey='bestpharma.demo.modules12.v1'
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Porto-Novo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const future=(days:number)=>{const d=new Date();d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export const requestLabels:Record<RequestStatus,string>={draft:'Brouillon',submitted:'Soumise',triage:'En qualification',clarifications:'Précisions demandées',converted:'Convertie en mission',refused:'Refusée',withdrawn:'Retirée'}
export const missionLabels:Record<MissionStatus,string>={draft:'Brouillon',proposed:'Proposée',accepted:'Acceptée',active:'En cours',suspended:'Suspendue',review:'En bilan',closed:'Clôturée',refused:'Refusée'}
export const assignmentLabels:Record<AssignmentStatus,string>={pending:'À approuver',approved:'Approuvé',refused:'Refusé',revoked:'Retiré'}
export function initialState():State {
 const a:Assignment={id:'acc-1',name:'Camille Démo',function:'Accompagnatrice qualité',scope:'Accompagnement qualité',start:future(-20),end:future(180),status:'approved',reason:''}
 const questions:Diagnosis[]=[{question:'Le circuit de réception est-il décrit ?',answer:'conform',reason:''},{question:'Les relevés de température sont-ils tracés ?',answer:'gap',reason:'Exemple fictif : quelques relevés à compléter.'},{question:'Le parcours d’accueil est-il formalisé ?',answer:'not_evaluated',reason:''}]
 return {selectedOffice:'off-1',persona:'office',offices:[
 {id:'off-1',name:'Pharmacie des Palmiers · Démo',code:'DEMO-001',city:'Porto-Novo',department:'Ouémé',address:'Quartier fictif des Palmiers',phone:'+229 01 00 00 00 01',email:'palmiers@example.test',contact:'Alex Démo',status:'active',assignments:[a,{id:'acc-2',name:'Morgan Exemple',function:'Accompagnateur organisation',scope:'Organisation et procédures',start:future(1),end:future(90),status:'pending',reason:''}]},
 {id:'off-2',name:'Pharmacie de la Lagune · Démo',code:'DEMO-002',city:'Cotonou',department:'Littoral',address:'Avenue fictive de la Lagune',phone:'+229 01 00 00 00 02',email:'lagune@example.test',contact:'Sam Exemple',status:'active',assignments:[{...a,id:'acc-3',name:'Charlie Démo'}]},
 {id:'off-3',name:'Pharmacie du Plateau · Démo',code:'DEMO-003',city:'Abomey-Calavi',department:'Atlantique',address:'Rue fictive du Plateau',phone:'+229 01 00 00 00 03',email:'plateau@example.test',contact:'Lou Exemple',status:'pending',assignments:[]}],
 requests:[{id:'DEM-001',officeId:'off-1',title:'Structurer notre organisation qualité',theme:'Qualité & procédures',description:'Besoin fictif : revoir le circuit de réception et le suivi documentaire avec notre équipe.',contact:'palmiers@example.test',availability:'Les mardis matin',urgency:'Normale',status:'converted',message:'Une mission a été proposée puis acceptée.',created:future(-20),version:3},
 {id:'DEM-002',officeId:'off-1',title:'Préparer l’accueil des nouveaux membres',theme:'Organisation',description:'Exemple : accompagnement souhaité pour construire un parcours d’accueil.',contact:'palmiers@example.test',availability:'À convenir',urgency:'Normale',status:'clarifications',message:'Combien de personnes participeraient à cet atelier ?',created:future(-2),version:2},
 {id:'DEM-003',officeId:'off-2',title:'Revoir les procédures de réception',theme:'Qualité & procédures',description:'Exemple de demande soumise à qualifier.',contact:'lagune@example.test',availability:'Les jeudis',urgency:'Élevée (déclarée)',status:'submitted',message:'',created:future(-1),version:1}],
 missions:[{id:'MIS-001',officeId:'off-1',requestId:'DEM-001',title:'Structuration du système qualité',objectives:'Clarifier les responsabilités et formaliser le circuit de réception.',scope:'Accompagnement qualité',leadId:'acc-1',start:future(-15),end:future(45),status:'active',version:1,visits:[{id:'VIS-001',title:'Atelier de revue des procédures',start:future(3)+'T09:00',end:future(3)+'T11:00',mode:'Présentiel',status:'confirmed',report:'',history:[]}],diagnosis:questions,diagnosisShared:true,deliverables:[{id:'LIV-001',title:'Synthèse du diagnostic initial (fictive)',version:1,status:'shared',content:'Exemple de livrable : le circuit de réception est décrit. Le suivi des relevés et le parcours d’accueil restent à approfondir. Ce contenu ne constitue pas un canevas réglementaire.',decision:''}],comments:[{id:'COM-1',text:'Nous préparerons nos procédures pour le prochain atelier. Message fictif.',author:'Alex Démo',date:future(-1)}],summary:'',openActionsDecision:''},
 {id:'MIS-002',officeId:'off-1',title:'Accueil et intégration de l’équipe',objectives:'Définir un parcours d’accueil interne.',scope:'Accompagnement qualité',leadId:'acc-1',start:future(7),end:future(60),status:'proposed',version:1,visits:[],diagnosis:questions.map(q=>({...q,answer:'not_evaluated',reason:''})),diagnosisShared:false,deliverables:[],comments:[],summary:'',openActionsDecision:''},
 {id:'MIS-003',officeId:'off-2',title:'Organisation des procédures de réception',objectives:'Accompagner la revue des procédures.',scope:'Accompagnement qualité',leadId:'acc-3',start:future(5),end:future(40),status:'accepted',version:1,visits:[],diagnosis:questions.map(q=>({...q,answer:'not_evaluated',reason:''})),diagnosisShared:false,deliverables:[],comments:[],summary:'',openActionsDecision:''}],
 events:[{id:'evt-1',officeId:'off-1',target:'MIS-001',title:'Mission acceptée puis démarrée — exemple fictif',date:future(-15),actor:'Simulation'},{id:'evt-2',officeId:'off-1',target:'acc-2',title:'Nouvelle demande d’accès accompagnateur',date:future(-1),actor:'Simulation'}]}
}
let loaded:State|undefined
if(demoMode) {try {const raw=localStorage.getItem(storageKey);if(raw){const data=JSON.parse(raw);if(Array.isArray(data.offices)&&Array.isArray(data.missions)&&Array.isArray(data.requests)&&Array.isArray(data.events)&&data.offices.some((o:Office)=>o.id===data.selectedOffice)) loaded=data}} catch {/* corrupted local state: seed again */}}
export const supportState=reactive<State>(loaded||initialState())
export const currentOffice=computed(()=>supportState.offices.find(o=>o.id===supportState.selectedOffice)!)
export const companyMode=computed(()=>supportState.persona==='company')
export function persist(){if(!demoMode)throw new Error('Ce module est disponible en démonstration uniquement ; API non connectée.');localStorage.setItem(storageKey,JSON.stringify(supportState))}
export function selectOffice(id:string){if(!supportState.offices.some(o=>o.id===id))throw new Error('Officine inconnue.');supportState.selectedOffice=id;persist()}
export function switchPersona(persona:'office'|'company'){supportState.persona=persona;persist()}
export function resetSupportDemo(){Object.assign(supportState,initialState());persist()}
export const uid=(prefix:string)=>`${prefix}-${crypto.randomUUID().slice(0,8)}`
export function event(officeId:string,target:string,title:string){supportState.events.unshift({id:uid('EVT'),officeId,target,title,date:new Date().toISOString(),actor:companyMode.value?'Coordination · simulation':'Administrateur officine · simulation'})}
export function approvedLead(m:Mission){return supportState.offices.find(o=>o.id===m.officeId)?.assignments.some(a=>a.id===m.leadId&&a.status==='approved'&&a.start<=today()&&a.end>=today()&&a.scope===m.scope)}
export function decideAssignment(id:string,status:AssignmentStatus,reason:string){
 if(!demoMode)throw new Error('Démonstration uniquement.');
 if(companyMode.value&&status!=='pending')throw new Error('Seule l’officine approuve ou retire cet accès.')
 const a=currentOffice.value.assignments.find(a=>a.id===id);if(!a)throw new Error('Affectation introuvable.')
 if(a.status!=='pending' && !(a.status==='approved'&&status==='revoked'))throw new Error('Cette affectation ne peut plus être modifiée.')
 if(!['approved','refused','revoked'].includes(status))throw new Error('Décision invalide.')
 if(status!=='approved'&&!reason.trim())throw new Error('Un motif est obligatoire.')
 a.status=status;a.reason=reason.trim();event(currentOffice.value.id,id,`Accès accompagnateur : ${assignmentLabels[status]}`);persist()
}
export function missionTransition(m:Mission,next:MissionStatus,reason='',version=m.version){
 if(!demoMode)throw new Error('Démonstration uniquement.');
 if(!companyMode.value&&m.officeId!==currentOffice.value.id)throw new Error('Mission hors officine sélectionnée.');
 if(version!==m.version)throw new Error('Version périmée. Rouvrez la mission.')
 const allowed:Partial<Record<MissionStatus,MissionStatus[]>>=companyMode.value?{draft:['proposed'],accepted:['active'],active:['suspended','review'],suspended:['active'],review:['closed']}:{proposed:['accepted','refused','draft']}
 if(!allowed[m.status]?.includes(next))throw new Error('Transition non autorisée pour cette vue de simulation.')
 if(['refused','draft','suspended'].includes(next)&&!reason.trim())throw new Error('Un motif est obligatoire.')
 if(next==='proposed'&&(!m.title.trim()||!m.objectives.trim()||!m.leadId||!m.start||m.end<m.start))throw new Error('Complétez les objectifs, le responsable et les dates.')
 if(next==='active'&&!approvedLead(m))throw new Error('Le responsable doit disposer d’un accès approuvé, actif et de même périmètre.')
 if(next==='closed'&&(!m.summary.trim()||!m.openActionsDecision.trim()))throw new Error('Un bilan partagé et une décision sur les actions ouvertes sont requis.')
 m.status=next;m.version++;event(m.officeId,m.id,`${missionLabels[next]}${reason?' — '+reason:''}`);persist()
}
export function requestTransition(r:ServiceRequest,next:RequestStatus,message='',version=r.version){
 if(!demoMode)throw new Error('Démonstration uniquement.');
 if(!companyMode.value&&r.officeId!==currentOffice.value.id)throw new Error('Demande hors officine sélectionnée.');
 if(r.version!==version)throw new Error('Version périmée. Rouvrez la demande.')
 const allowed:Partial<Record<RequestStatus,RequestStatus[]>>=companyMode.value?{submitted:['triage'],triage:['clarifications','refused']}:{draft:['submitted','withdrawn'],submitted:['withdrawn'],clarifications:['submitted','withdrawn']}
 if(!allowed[r.status]?.includes(next))throw new Error('Transition non autorisée.')
 if(['clarifications','refused','withdrawn'].includes(next)&&!message.trim())throw new Error('Un motif ou un message est obligatoire.')
 if(r.status==='clarifications'&&next==='submitted'&&!message.trim())throw new Error('Saisissez votre réponse.')
 if(next==='submitted'&&(!r.description.trim()||!r.contact.trim()||!r.title.trim()))throw new Error('Intitulé, besoin et contact sont obligatoires.')
 if(next==='submitted'&&supportState.offices.find(o=>o.id===r.officeId)?.status!=='active')throw new Error('L’officine doit être active.')
 r.status=next;r.version++;if(message)r.message=message;event(r.officeId,r.id,requestLabels[next]+(message?' — '+message:''));persist()
}
