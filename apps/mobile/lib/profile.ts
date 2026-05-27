import type { User } from "../constants/types";

export function isProfileComplete(user: Pick<User, "occupation"> | null | undefined): boolean {
  return Boolean(user?.occupation?.trim());
}
