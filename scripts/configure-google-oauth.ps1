$ErrorActionPreference = 'Stop'
Write-Host 'SSC Insight: configure Google OAuth for Neon production.'
Write-Host 'Secrets are sent to Neon over stdin and are not written to a file.'
Write-Host 'Authorized redirect URI:'
Write-Host 'https://ep-withered-mud-b4zcuc9f.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth/callback/google'
$clientId = Read-Host 'Google OAuth Web client ID'
if ($clientId -notmatch '^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$') {
  throw 'Use the Google OAuth client ID ending in .apps.googleusercontent.com.'
}
$secureSecret = Read-Host 'Google OAuth client secret (hidden)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
try {
  $plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  if ([string]::IsNullOrWhiteSpace($plainSecret)) { throw 'The client secret cannot be empty.' }
  $payload = @{ client_id = $clientId.Trim(); client_secret = $plainSecret } | ConvertTo-Json -Compress
  # Suppress the API body: provider responses may include credential fields.
  $result = $payload | neon api '/projects/lingering-mode-47457333/branches/br-lively-flower-b4272e9b/auth/oauth_providers/google' -X PATCH -d - 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Neon rejected the update. Confirm neon login succeeds and this account can manage the production branch.' }
  Write-Host 'Google OAuth updated. Provider status:'
  neon neon-auth oauth-provider list --project-id lingering-mode-47457333 --branch production
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  $plainSecret = $null
  $payload = $null
  $result = $null
}
