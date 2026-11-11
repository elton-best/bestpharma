<?php
return [
 'require_privileged_mfa'=>(bool)env('SOCLE_REQUIRE_PRIVILEGED_MFA',true),
 'frontend_url'=>env('FRONTEND_URL','http://localhost:3001'),
 // Never enabled outside local/testing. Simulations must not be labelled delivered.
 'local_inbox'=>(bool)env('SOCLE_LOCAL_INBOX',false),
 'reminder_days'=>(int)env('SOCLE_REMINDER_DAYS',3),
 'expired_token_retention_days'=>(int)env('SOCLE_EXPIRED_TOKEN_RETENTION_DAYS',7),
 'invitation_days'=>(int)env('INVITATION_DAYS',7),
 'support_pending_days'=>(int)env('SUPPORT_PENDING_DAYS',14),
];
