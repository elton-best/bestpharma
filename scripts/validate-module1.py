#!/usr/bin/env python3
"""Local-only module 01 integration smoke. Fictitious seed records only, no secrets printed."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import json
import secrets
import urllib.request
import urllib.error
import urllib.parse
from datetime import date, timedelta
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base-url',default='http://127.0.0.1:8000/api/v1')
base=p.parse_args().base_url.rstrip('/')
if urllib.parse.urlsplit(base).hostname not in ('127.0.0.1','localhost','::1'):p.error('Local API only. Never use a real database.')
checks=[]
def call(label,path,method='GET',data=None,token=None,office=None,status=200):
 headers={'Accept':'application/json','Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 if office:headers['X-Officine-ID']=str(office)
 req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),method=method,headers=headers)
 try:r=urllib.request.urlopen(req,timeout=20)
 except urllib.error.HTTPError as e:r=e
 payload=json.loads(r.read())
 if r.code not in (status if isinstance(status,tuple) else (status,)):raise RuntimeError(f'{label}: expected {status}, received {r.code}')
 checks.append({'check':label,'status':r.code})
 return payload

def login(email):return call('login '+email.split('@')[0],'/auth/login','POST',{'email':email,'password':'password'})['token']
admin=login('admin@bestpharma.bj');coordinate=login('beg@bestpharma.bj');staff=login('accompagnateur@bestpharma.bj')
account=call('account and memberships','/me',token=admin)
assert len([o for o in account['officines'] if o['status']=='active'])>=2
office=min(o['id'] for o in account['officines'] if o['status']=='active')
other=next(o['id'] for o in account['officines'] if o['id']!=office and o['status']=='active')
profile=call('profile','/officine',token=admin,office=office)['data']
body={**profile,'department':profile['department'] or 'Littoral','contact_name':profile['contact_name'] or 'Fictif','phone':profile['phone'] or '+2290100000000','city':profile['city'] or 'Cotonou','address':profile['address'] or 'Adresse fictive','status':'suspended'}
updated=call('update profile whitelist','/officine','PUT',body,admin,office)['data']
assert updated['status']=='active'
call('profile stale version','/officine','PUT',body,admin,office,status=409)
call('switch office server context','/officine',token=admin,office=other)
contact={'name':'Contact fictif '+secrets.token_hex(3),'function':'Contact de test','type':'professionnel','phone':'000','email':'http-contact@example.test','is_active':True}
contact_id=call('contact create','/officine/contacts','POST',contact,admin,office,status=201)['id']
call('contact disable','/officine/contacts/'+str(contact_id),'PUT',{**contact,'is_active':False,'version':1},admin,office)
call('foreign contact hidden','/officine/contacts/'+str(contact_id),'PUT',{**contact,'version':2},admin,other,status=404)
directory=call('coordinator directory','/platform/support-directory',token=coordinate)
staff_id=next(u['id'] for u in directory['staff'] if u['name']=='Accompagnateur fictif')
call('directory denied to member','/platform/support-directory',token=admin,status=403)
call('coordinator no implicit business access','/officine',token=coordinate,office=office,status=403)
proposal={'user_id':staff_id,'scope':'Lecture fictive HTTP','permissions':['officine.read','qualite.read'],'starts_on':date.today().isoformat(),'ends_on':(date.today()+timedelta(days=5)).isoformat(),'request_key':secrets.token_hex(20)}
url=f'/platform/officines/{office}/support'
a=call('propose access',url,'POST',proposal,coordinate,status=201)['id']
assert call('idempotent proposal',url,'POST',proposal,coordinate,status=201)['id']==a
call('idempotency different payload',url,'POST',{**proposal,'scope':'Autre'},coordinate,status=409)
call('pending access denied','/officine',token=staff,office=office,status=403)
call('coordinator cannot approve',f'/officine/support/{a}/decision','POST',{'decision':'approved','version':1},coordinate,office,status=403)
barrier=Barrier(2)
def approve(label):
 barrier.wait(timeout=10)
 return call(label,f'/officine/support/{a}/decision','POST',{'decision':'approved','version':1},admin,office,status=(200,409))
before=len(checks)
with ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(approve,['parallel approve A','parallel approve B']))
assert sorted(c['status'] for c in checks[before:])==[200,409]
call('approved staff profile','/officine',token=staff,office=office)
call('approved staff quality read','/qualite/actions',token=staff,office=office)
call('staff cannot administer','/team',token=staff,office=office,status=403)
call('staff cannot write quality','/qualite/actions','POST',{},staff,office,status=403)
call('staff cannot read other office','/officine',token=staff,office=other,status=403)
call('revocation requires reason',f'/officine/support/{a}/decision','POST',{'decision':'revoked','version':2},admin,office,status=422)
call('revoke',f'/officine/support/{a}/decision','POST',{'decision':'revoked','version':2,'reason':'Fin du contrôle fictif'},admin,office)
call('same token denied immediately','/qualite/actions',token=staff,office=office,status=403)
call('history','/officine/history',token=admin,office=office)
for label,token in [('admin',admin),('coordinator',coordinate),('staff',staff)]:call('logout '+label,'/auth/logout','POST',{},token)
print(json.dumps({'result':'passed','checks':len(checks),'details':checks},indent=2))
