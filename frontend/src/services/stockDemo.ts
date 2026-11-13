/** Local demonstration only. Not a stock ledger or authorization boundary for production. */
export interface StockProduct {id:string;name:string;code:string;unit:string;threshold:number}
export interface StockLocation {id:string;name:string}
export type LotStatus='available'|'quarantine'|'recalled'
export interface StockLot {id:string;productId:string;batch:string;expiry:string;locationId:string;quantity:number;unitCost:number;status:LotStatus}
export interface StockEvent {id:string;date:string;type:string;lotId:string;quantity:number;reason:string;from?:string;to?:string}
export interface StockState {revision:number;products:StockProduct[];locations:StockLocation[];lots:StockLot[];events:StockEvent[]}
export const stockTabs=[['overview','Vue d’ensemble'],['produits','Produits'],['lots','Lots'],['fefo','FEFO'],['emplacements','Emplacements'],['mouvements','Mouvements'],['reception','Réception'],['scan','Scan'],['inventaires','Inventaires'],['peremptions','Péremptions'],['quarantaine','Quarantaine & Rappels'],['dechets','Déchets'],['valorisation','Valorisation']] as const
export const statusLabels:Record<LotStatus,string>={available:'Disponible',quarantine:'Quarantaine',recalled:'Rappelé'}
export const eventLabels:Record<string,string>={opening:'Ouverture',receipt:'Réception',transfer:'Transfert',inventory:'Écart d’inventaire',quarantine:'Mise en quarantaine',recall:'Rappel',release:'Levée de quarantaine',waste:'Sortie vers déchets',product:'Création produit',location:'Création emplacement'}
export function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Porto-Novo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function daysFromNow(n:number){const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function initialStock():StockState{
 const lots:StockLot[]=[{id:'lot-1',productId:'p-1',batch:'DEMO-A01',expiry:daysFromNow(45),locationId:'reserve',quantity:120,unitCost:500,status:'available'},{id:'lot-2',productId:'p-1',batch:'DEMO-A02',expiry:daysFromNow(240),locationId:'rayon',quantity:60,unitCost:550,status:'available'},{id:'lot-3',productId:'p-2',batch:'DEMO-B01',expiry:daysFromNow(-10),locationId:'reserve',quantity:12,unitCost:1200,status:'quarantine'},{id:'lot-4',productId:'p-3',batch:'DEMO-C01',expiry:daysFromNow(100),locationId:'isole',quantity:24,unitCost:800,status:'recalled'},{id:'lot-5',productId:'p-2',batch:'DEMO-B02',expiry:daysFromNow(180),locationId:'rayon',quantity:8,unitCost:1250,status:'available'}]
 return {revision:1,products:[{id:'p-1',name:'Paracétamol 500 mg',code:'DEMO-001',unit:'Boîte',threshold:30},{id:'p-2',name:'Amoxicilline 250 mg',code:'DEMO-002',unit:'Flacon',threshold:15},{id:'p-3',name:'Sérum physiologique',code:'DEMO-003',unit:'Boîte',threshold:10}],locations:[{id:'reserve',name:'Réserve'},{id:'rayon',name:'Comptoir'},{id:'isole',name:'Quarantaine'}],lots,events:lots.map((l,i)=>({id:'initial-'+i,date:new Date().toISOString(),type:'opening',lotId:l.id,quantity:l.quantity,reason:'Ouverture du stock'}))}
}
export function eligible(l:StockLot){return l.quantity>0&&l.status==='available'&&l.expiry>today()}
export function fefo(s:StockState,productId:string){return s.lots.filter(l=>l.productId===productId&&eligible(l)).sort((a,b)=>a.expiry.localeCompare(b.expiry)||a.id.localeCompare(b.id))}
function required(v:unknown,label:string,max=180){const text=String(v??'').trim();if(!text||text.length>max)throw Error(label+' requis ou trop long.');return text}
function integer(v:unknown,label:string,min=0){const n=Number(v);if(v===''||v==null||!Number.isSafeInteger(n)||n<min||n>1000000000)throw Error(label+' invalide.');return n}
function date(v:unknown){const s=String(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw Error('Date de péremption invalide.');return s}
export type StockCommand='product'|'location'|'receipt'|'transfer'|'inventory'|'quarantine'|'recall'|'release'|'waste'
export function applyStock(state:StockState,command:StockCommand,input:Record<string,unknown>):StockState{
 const s=JSON.parse(JSON.stringify(state)) as StockState
 const uid=()=>crypto.randomUUID()
 const reason=required(input.reason,'Motif ou référence',2000)
 let lotId='',quantity=0,from='',to=''
 if(command==='product'){
  const code=required(input.code,'Code');if(s.products.some(p=>p.code.toLowerCase()===code.toLowerCase()))throw Error('Code produit déjà utilisé.');s.products.push({id:uid(),name:required(input.name,'Nom'),code,unit:required(input.unit,'Unité'),threshold:integer(input.threshold,'Seuil')})
 }else if(command==='location'){
  const name=required(input.name,'Emplacement');if(s.locations.some(l=>l.name.toLowerCase()===name.toLowerCase()))throw Error('Emplacement déjà utilisé.');s.locations.push({id:uid(),name})
 }else if(command==='receipt'){
  const productId=String(input.productId),locationId=String(input.locationId),batch=required(input.batch,'Numéro de lot'),expiry=date(input.expiry)
  if(!s.products.some(p=>p.id===productId)||!s.locations.some(l=>l.id===locationId))throw Error('Produit ou emplacement inconnu.')
  if(expiry<=today())throw Error('Réception refusée : lot périmé ou échéance du jour.')
  if(s.lots.some(l=>l.productId===productId&&l.batch.toLowerCase()===batch.toLowerCase()))throw Error('Ce lot existe déjà. La réception complémentaire est hors périmètre de cette démonstration.')
  quantity=integer(input.quantity,'Quantité',1);lotId=uid();s.lots.push({id:lotId,productId,locationId,batch,expiry,quantity,unitCost:integer(input.unitCost,'Coût unitaire FCFA'),status:'quarantine'})
 }else{
  const lot=s.lots.find(l=>l.id===input.lotId);if(!lot)throw Error('Lot inconnu.');lotId=lot.id;from=lot.locationId
  if(command==='transfer'){
   quantity=integer(input.quantity,'Quantité',1);to=String(input.locationId);if(!eligible(lot))throw Error('Lot bloqué : périmé, rappelé ou en quarantaine.');if(quantity>lot.quantity)throw Error('Stock insuffisant.');if(to===from||!s.locations.some(l=>l.id===to))throw Error('Destination invalide.')
   let target=s.lots.find(l=>l.productId===lot.productId&&l.batch===lot.batch&&l.locationId===to)
   if(target&&(target.status!==lot.status||target.unitCost!==lot.unitCost||target.expiry!==lot.expiry))throw Error('Lot destination incompatible.')
   lot.quantity-=quantity;if(target)target.quantity+=quantity;else{target={...lot,id:uid(),locationId:to,quantity};s.lots.push(target)}
  }else if(command==='inventory'){
   const observed=integer(input.quantity,'Quantité comptée');if(integer(input.expected,'Stock attendu')!==lot.quantity)throw Error('Stock modifié : recommencez le comptage.');quantity=observed-lot.quantity;lot.quantity=observed
  }else if(command==='waste'){
   quantity=integer(input.quantity,'Quantité',1);if(quantity>lot.quantity)throw Error('Stock insuffisant.');lot.quantity-=quantity;quantity=-quantity
  }else{
   if(command==='release'&&(lot.status!=='quarantine'||lot.expiry<=today()))throw Error('Seule une quarantaine non périmée peut être levée ; un rappel ne peut pas être levé ici.')
   if(command==='quarantine'&&lot.status==='recalled')throw Error('Un rappel ne peut pas être rétrogradé en quarantaine.')
   const status:LotStatus=command==='recall'?'recalled':command==='release'?'available':'quarantine'
   for(const l of s.lots.filter(l=>l.productId===lot.productId&&l.batch===lot.batch))l.status=status
  }
 }
 s.events.unshift({id:uid(),date:new Date().toISOString(),type:command,lotId,quantity,reason,...(from?{from}:{}),...(to?{to}:{})});s.revision++;return s
}
const key=(office:string)=>'bestpharma.demo.stock.v2.'+office
export function loadStock(office:string):StockState{
 const raw=localStorage.getItem(key(office));if(!raw)return initialStock()
 try{const s=JSON.parse(raw);if(!Number.isInteger(s.revision)||!Array.isArray(s.products)||!Array.isArray(s.locations)||!Array.isArray(s.lots)||!Array.isArray(s.events))throw Error();return s}catch{throw Error('Données locales illisibles. Restaurez les exemples après confirmation.')}
}
export function saveStock(office:string,state:StockState,command:StockCommand,input:Record<string,unknown>){
 const raw=localStorage.getItem(key(office));if(raw&&JSON.parse(raw).revision!==state.revision)throw Error('Une autre fenêtre a modifié le stock. Actualisez avant de recommencer.')
 const next=applyStock(state,command,input);localStorage.setItem(key(office),JSON.stringify(next));return next
}
export function resetStock(office:string){const s=initialStock();try{const previous=JSON.parse(localStorage.getItem(key(office))||'null');if(Number.isSafeInteger(previous?.revision))s.revision=previous.revision+1}catch{/* Explicit reset recovers corrupt demo data. */}localStorage.setItem(key(office),JSON.stringify(s));return s}
