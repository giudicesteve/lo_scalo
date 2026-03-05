import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Unauthorized", status: 401 };
  }

  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email },
  });

  if (!admin) {
    return { error: "Forbidden", status: 403 };
  }

  return { admin };
}

export async function checkSuperAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Unauthorized", status: 401 };
  }

  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email },
  });

  if (!admin || !admin.canManageAdmins) {
    return { error: "Forbidden", status: 403 };
  }

  return { admin };
}
