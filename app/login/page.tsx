import { LoginForm } from './login-form';

const INACTIVE_ACCOUNT_MESSAGE =
  'Tu cuenta está desactivada. Contacta al administrador para reactivarla.';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return <LoginForm initialError={error === 'inactivo' ? INACTIVE_ACCOUNT_MESSAGE : ''} />;
}
