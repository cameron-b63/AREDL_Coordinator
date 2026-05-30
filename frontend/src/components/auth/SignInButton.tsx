import { signInUrl } from '../../lib/api';

export function SignInButton() {
  return (
    <a class="sign-in-button" href={signInUrl()}>
      Sign in with Discord
    </a>
  );
}
