import { reactive } from 'vue'
import { request } from './quality'
export interface Account {locale?:string;id:number;name:string;email:string;phone:string|null;profile_version:number;email_verified:boolean;is_support_coordinator:boolean}
export interface OfficeChoice {id:number;name:string;status:string;is_admin:boolean;access_type:'member'|'support'}
export interface OfficeProfile {district?:string|null;neighborhood?:string|null;latitude?:number|null;longitude?:number|null;has_logo?:boolean;id:number;name:string;slug:string;status:string;email:string|null;phone:string|null;city:string|null;address:string|null;country:string;department:string|null;contact_name:string|null;profile_version:number}
export interface Contact {id:number;name:string;function:string;phone:string|null;email:string|null;type:string;is_active:boolean;version:number}
export interface SupportAssignment {id:number;user_id:number;name:string;scope:string;permissions:string[];starts_on:string;ends_on:string;status:'pending'|'approved'|'refused'|'revoked'|'changes_requested';expired?:boolean;response_expires_at?:string;decision_reason:string|null;decided_at:string|null;version:number}
export interface HistoryEvent {id:number;action:string;created_at:string}
export const accountState=reactive<{user:Account|null;officines:OfficeChoice[]}>({user:null,officines:[]})
export const officineService={
 async account(){const data=await request<{user:Account;officines:OfficeChoice[]}>('/me');Object.assign(accountState,data);return data},
 async saveAccount(data:Pick<Account,'name'|'phone'|'profile_version'|'locale'>){const result=await request<{user:Account;officines:OfficeChoice[]}>('/me','PUT',data);Object.assign(accountState,result);return result},
 profile:()=>request<{data:OfficeProfile;is_admin:boolean;access_type:string}>('/officine'),
 saveProfile:(data:OfficeProfile)=>request('/officine','PUT',data),
 async contacts(){return (await request<{data:Contact[]}>('/officine/contacts')).data},
 saveContact:(data:Omit<Contact,'id'>,id?:number)=>request(`/officine/contacts${id?'/'+id:''}`,id?'PUT':'POST',data),
 async history(){return (await request<{data:HistoryEvent[]}>('/officine/history')).data},
 async assignments(){return (await request<{data:SupportAssignment[]}>('/officine/support')).data},
 decision:(a:SupportAssignment,decision:string,reason:string)=>request(`/officine/support/${a.id}/decision`,'POST',{decision,reason,version:a.version}),
 endAssignment:(officeId:number,a:SupportAssignment,reason:string)=>request(`/platform/officines/${officeId}/support/${a.id}/end`,'POST',{version:a.version,reason}),
 directory:()=>request<{officines:{id:number;name:string}[];staff:{id:number;name:string}[]}>('/platform/support-directory'),
 async proposals(id:number){return (await request<{data:SupportAssignment[]}>(`/platform/officines/${id}/support`)).data},
 propose:(id:number,data:{user_id:number;scope:string;permissions:string[];starts_on:string;ends_on:string;request_key:string})=>request(`/platform/officines/${id}/support`,'POST',data),
}
export function chooseOffice(id:number){const o=accountState.officines.find(o=>o.id===id&&o.status==='active');if(!o)throw new Error('Cette officine n’est pas disponible dans votre session.');sessionStorage.setItem('bestpharma.officine',String(id));/* Full navigation clears tenant-local component state. */window.location.assign('/dashboard')}
export const supportPermissionLabels:Record<string,string>={'accompagnement.read':'Consulter les missions approuvées','accompagnement.write':'Contribuer aux missions approuvées','officine.read':'Consulter la fiche officine','qualite.read':'Consulter les actions qualité (lecture seule)'}
export const historyLabels:Record<string,string>={'officine.profile.updated':'Fiche officine modifiée','officine.contact.saved':'Contact enregistré','support.proposed':'Accès accompagnateur proposé','support.approved':'Accès accompagnateur approuvé','support.refused':'Accès accompagnateur refusé','support.revoked':'Accès accompagnateur retiré','team.role.saved':'Rôle enregistré','team.member.updated':'Accès membre modifié','team.invitation.created':'Invitation créée','team.invitation.revoked':'Invitation révoquée'}
