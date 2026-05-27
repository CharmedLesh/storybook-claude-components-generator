import { detectClaudeAuth } from '@/lib/agent';
import { ClientShell } from './ClientShell';

export async function AppShell() {
  const { hasOauthCredentials, credentialsPath } = await detectClaudeAuth();
  const storybookUrl =
    process.env.NEXT_PUBLIC_STORYBOOK_URL ?? 'http://localhost:6006';
  return (
    <ClientShell
      authReady={hasOauthCredentials}
      credentialsPath={credentialsPath}
      storybookUrl={storybookUrl}
    />
  );
}
