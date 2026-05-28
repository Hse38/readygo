import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "token";
const USER_KEY = "user";
const PROFILE_PHOTO_KEY = "profile_photo_base64";
const DARK_MODE_KEY = "darkMode";
const LANGUAGE_KEY = "language";
const LEGACY_LANGUAGE_KEY = "readygo_language";

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function saveUser(user: object): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<object | null> {
  const user = await AsyncStorage.getItem(USER_KEY);
  if (!user) return null;
  return JSON.parse(user);
}

export async function removeUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    USER_KEY,
    PROFILE_PHOTO_KEY,
    DARK_MODE_KEY,
    LANGUAGE_KEY,
    LEGACY_LANGUAGE_KEY,
  ]);
}
