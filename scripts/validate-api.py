#!/usr/bin/env python3
"""Local HTTP smoke test. Creates fictitious records, never prints credentials/tokens.
Requires migrations + local demo seed. Deliberately rejects remote endpoints.
"""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import argparse
import json
import os
import secrets
import re
import urllib.error
import urllib.parse
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', default='http://127.0.0.1:8000/api/v1')
args = parser.parse_args()
base = args.base_url.rstrip('/')
if urllib.parse.urlsplit(base).hostname not in {'localhost', '127.0.0.1', '::1'}:
    parser.error('Only a local development API is permitted. Never run against production.')
checks = []

def call(label, path, method='GET', data=None, token=None, office=None, expected=200):
    headers = {'Accept': 'application/json', 'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if office:
        headers['X-Officine-ID'] = str(office)
    req = urllib.request.Request(base + path, data=json.dumps(data).encode() if data is not None else None, headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError as exc:
        response = exc
    status = response.code
    payload = json.loads(response.read())
    if status not in (expected if isinstance(expected, tuple) else (expected,)):
        # Do not dump requests, headers or credentials on failure.
        raise RuntimeError(f'{label}: expected HTTP {expected}, received HTTP {status}')
    checks.append({'check': label, 'status': status})
    return payload

# Verification links are read only through the explicitly enabled LOCAL test inbox.
# This validates the link flow, not ownership of a real mailbox.
reviewer = call('reviewer login', '/auth/login', 'POST', {'email': os.getenv('BESTPHARMA_REVIEW_EMAIL', 'beg@bestpharma.bj'), 'password': os.getenv('BESTPHARMA_REVIEW_PASSWORD', 'password')})['token']
if not call('local inbox enabled', '/notifications', token=reviewer)['local_inbox']:
    raise RuntimeError('Enable SOCLE_LOCAL_INBOX=true in a LOCAL test environment to exercise email verification. Never enable in production.')
suffix = secrets.token_hex(6)
password = secrets.token_urlsafe(24) + 'Aa1'
email = f'validation-{suffix}@example.test'
registration = {'name': 'Demandeur fictif HTTP', 'email': email, 'password': password, 'password_confirmation': password,
                'officine_name': f'Officine fictive HTTP {suffix}', 'phone': '+2290100000000', 'city': 'Ville fictive',
                'address': 'Adresse fictive de validation', 'applicant_function': 'Pharmacien titulaire', 'consent': True}
call('health', '/health')
created = call('register', '/auth/register', 'POST', registration, expected=201)
applicant, office = created['token'], created['application_id']
call('pending business denied', '/qualite/actions', token=applicant, office=office, expected=403)
call('applicant cannot review', '/platform/applications', token=applicant, expected=403)
notifications = call('verification queued', '/notifications', token=applicant)['data']
message = call('local verification preview', f"/notifications/{notifications[0]['id']}/preview", token=applicant)['message']
verification = re.search(r'token=([A-Za-z0-9]{64})', message).group(1)
call('verify email', '/auth/email/verify', 'POST', {'token': verification, 'purpose': 'verify'}, token=applicant)
call('verification replay denied', '/auth/email/verify', 'POST', {'token': verification, 'purpose': 'verify'}, token=applicant, expected=422)
call('complete draft', f'/registration-applications/{office}', 'PATCH', {'version':1,'country':'Bénin','department':'Littoral'}, token=applicant)
call('submit draft', f'/registration-applications/{office}/submit', 'POST', {'version':2,'consent':True}, token=applicant)
path = f'/platform/applications/{office}/decision'
call('premature activation denied', path, 'POST', {'decision': 'active','version':3}, token=reviewer, expected=409)
call('begin review', path, 'POST', {'decision': 'under_review','version':3}, token=reviewer)
call('request corrections', path, 'POST', {'decision': 'corrections_requested','version':4, 'note': 'Adresse fictive à compléter'}, token=reviewer)
call('resubmit', f'/applications/{office}', 'PUT', {**registration,'version':5, 'address': 'Adresse fictive complétée'}, token=applicant)
call('review again', path, 'POST', {'decision': 'under_review','version':6}, token=reviewer)
activation_barrier = Barrier(2)
def activate(label):
    activation_barrier.wait(timeout=10)
    return call(label, path, 'POST', {'decision':'active','version':7}, token=reviewer, expected=(200,409))
activation_before = len(checks)
with ThreadPoolExecutor(max_workers=2) as pool:
    list(pool.map(activate, ['parallel activation A','parallel activation B']))
assert sorted(c['status'] for c in checks[activation_before:]) == [200,409], 'Activation must be single-winner'

action = {'title': 'Action fictive HTTP', 'chapter': 'Personnel', 'severity': 'medium', 'owner': 'Fonction fictive', 'due_date': '2026-12-01', 'status': 'open', 'description': 'Constat fictif de validation', 'resolution': None}
created_action = call('create action', '/qualite/actions', 'POST', action, token=applicant, office=office, expected=201)['data']
listed = call('persisted action', '/qualite/actions', token=applicant, office=office)['data']
assert any(a['id'] == created_action['id'] for a in listed)
call('close without resolution denied', f"/qualite/actions/{created_action['id']}", 'PUT', {**action, 'status': 'closed'}, token=applicant, office=office, expected=422)
call('close action', f"/qualite/actions/{created_action['id']}", 'PUT', {**action, 'status': 'closed', 'resolution': 'Résultat fictif vérifié'}, token=applicant, office=office)
roles = []
for name, permission in [('Lecture', 'qualite.read'), ('Écriture', 'qualite.write')]:
    roles.append(call('create role '+name, '/team/roles', 'POST', {'name': name, 'permissions': [permission]}, token=applicant, office=office, expected=201)['id'])
invite_email = f'invite-{suffix}@example.test'
invite = call('create invitation', '/team/invitations', 'POST', {'email': invite_email, 'is_admin': False, 'role_ids': roles}, token=applicant, office=office, expected=201)
accepted = call('guest accepts', '/invitations/accept', 'POST', {'token': invite['invite_token'], 'email': invite_email, 'name': 'Membre fictif HTTP', 'password': password, 'password_confirmation': password}, expected=201)
member_token = accepted['token']
call('member quality access', '/qualite/actions', token=member_token, office=office)
call('member team denied', '/team', token=member_token, office=office, expected=403)
call('invitation cannot be replayed', '/invitations/accept', 'POST', {'token': invite['invite_token'], 'email': invite_email}, expected=422)
team = call('team list', '/team', token=applicant, office=office)
member = next(m for m in team['members'] if m['email'] == invite_email)
assert set(member['role_ids']) == set(roles)
call('suspend member', f"/team/members/{member['id']}", 'PUT', {'is_active': False, 'is_admin': False, 'role_ids': roles,'reason':'Test fictif de suspension'}, token=applicant, office=office)
call('suspended token denied', '/qualite/actions', token=member_token, office=office, expected=403)
admin_member = next(m for m in team['members'] if m['email'] == email)
call('last admin protected', f"/team/members/{admin_member['id']}", 'PUT', {'is_active': False, 'is_admin': True, 'role_ids': []}, token=applicant, office=office, expected=409)
seed = call('other officine login', '/auth/login', 'POST', {'email': os.getenv('BESTPHARMA_ADMIN_EMAIL', 'admin@bestpharma.bj'), 'password': os.getenv('BESTPHARMA_ADMIN_PASSWORD', 'password')})
other = next(o['id'] for o in seed['officines'] if o['status'] == 'active')
call('foreign officine denied', '/qualite/actions', token=applicant, office=other, expected=403)
call('foreign action hidden', f"/qualite/actions/{created_action['id']}", 'PUT', action, token=seed['token'], office=other, expected=404)
# Requires a multi-worker HTTP server for actual parallelism (PHP_CLI_SERVER_WORKERS=4).
def race(functions):
    barrier = Barrier(len(functions))
    def run(fn):
        barrier.wait(timeout=10)
        return fn()
    with ThreadPoolExecutor(max_workers=len(functions)) as pool:
        return list(pool.map(run, functions))

race_email = f'race-{suffix}@example.test'
race_invite = call('concurrent invitation created', '/team/invitations', 'POST', {'email': race_email, 'is_admin': True, 'role_ids': []}, token=applicant, office=office, expected=201)
race_payload = {'token': race_invite['invite_token'], 'email': race_email, 'name': 'Administrateur fictif concurrent', 'password': password, 'password_confirmation': password}
results = race([lambda: call('parallel accept A', '/invitations/accept', 'POST', race_payload, expected=(201,422)), lambda: call('parallel accept B', '/invitations/accept', 'POST', race_payload, expected=(201,422))])
assert sum('token' in result for result in results) == 1, 'Invitation accepted more than once'
second_admin = next(result['token'] for result in results if 'token' in result)
team = call('team before concurrent demotion', '/team', token=applicant, office=office)
second_id = next(m['id'] for m in team['members'] if m['email'] == race_email)
statuses_before = len(checks)
race([lambda: call('parallel self-demotion A', f"/team/members/{admin_member['id']}", 'PUT', {'is_admin':False,'is_active':True,'role_ids':[]}, token=applicant, office=office, expected=(200,409)), lambda: call('parallel self-demotion B', f'/team/members/{second_id}', 'PUT', {'is_admin':False,'is_active':True,'role_ids':[]}, token=second_admin, office=office, expected=(200,409))])
assert sorted(check['status'] for check in checks[statuses_before:]) == [200,409], 'Last-admin invariant violated'
call('logout concurrent administrator', '/auth/logout', 'POST', {}, token=second_admin)
for label, token in [('member', member_token), ('applicant', applicant), ('reviewer', reviewer), ('seed', seed['token'])]:
    call('logout '+label, '/auth/logout', 'POST', {}, token=token)
call('revoked session denied', '/applications', token=applicant, expected=401)
print(json.dumps({'result': 'passed', 'checks': len(checks), 'database': 'configured Laravel database', 'details': checks}, ensure_ascii=False, indent=2))
