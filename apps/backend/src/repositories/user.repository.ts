import { prisma } from "../lib/prisma";

export class UserRepository {
  getById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }
}

export const userRepository = new UserRepository();
