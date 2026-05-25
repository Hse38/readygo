export interface AppleSignInBody {
  identityToken: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
}

export interface GoogleSignInBody {
  idToken: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUserResponse;
}
