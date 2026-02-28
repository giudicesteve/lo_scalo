import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/migrate-product-names
 * 
 * Migra i dati esistenti per il supporto bilingue:
 * 1. Product: copia name in nameEn dove nameEn è null
 * 2. OrderItem: copia Product.name in productName e Product.nameEn in productNameEn
 * 
 * Richiede autenticazione super admin.
 */
export async function POST() {
  try {
    // Verifica autenticazione super admin
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    });

    if (!admin?.canManageAdmins) {
      return NextResponse.json(
        { error: "Only super admins can run migration" },
        { status: 403 }
      );
    }

    const results = {
      products: { updated: 0, errors: [] as string[] },
      orderItems: { updated: 0, errors: [] as string[] },
    };

    // 1. Aggiorna Product: copia name in nameEn dove null
    const productsToUpdate = await prisma.product.findMany({
      where: { nameEn: null },
    });

    for (const product of productsToUpdate) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: { nameEn: product.name },
        });
        results.products.updated++;
      } catch (error) {
        results.products.errors.push(`Product ${product.id}: ${error}`);
      }
    }

    // 2. Aggiorna OrderItem: copia nomi dal prodotto collegato
    const orderItemsToUpdate = await prisma.orderItem.findMany({
      where: {
        OR: [
          { productName: null },
          { productNameEn: null },
        ],
      },
      include: {
        Product: true,
      },
    });

    for (const item of orderItemsToUpdate) {
      try {
        const productName = item.Product?.name || "Prodotto";
        const productNameEn = item.Product?.nameEn || item.Product?.name || "Product";

        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            productName: item.productName || productName,
            productNameEn: item.productNameEn || productNameEn,
          },
        });
        results.orderItems.updated++;
      } catch (error) {
        results.orderItems.errors.push(`OrderItem ${item.id}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      results: {
        products: {
          updated: results.products.updated,
          total: productsToUpdate.length,
          errors: results.products.errors.length,
        },
        orderItems: {
          updated: results.orderItems.updated,
          total: orderItemsToUpdate.length,
          errors: results.orderItems.errors.length,
        },
      },
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrate-product-names
 * 
 * Ritorna il conteggio dei record che necessitano migrazione.
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    });

    if (!admin?.canManageAdmins) {
      return NextResponse.json(
        { error: "Only super admins can view migration status" },
        { status: 403 }
      );
    }

    const [productsCount, orderItemsCount] = await Promise.all([
      prisma.product.count({
        where: { nameEn: null },
      }),
      prisma.orderItem.count({
        where: {
          OR: [
            { productName: null },
            { productNameEn: null },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      needsMigration: {
        products: productsCount,
        orderItems: orderItemsCount,
      },
    });
  } catch (error) {
    console.error("Migration check error:", error);
    return NextResponse.json(
      { error: "Failed to check migration status", details: String(error) },
      { status: 500 }
    );
  }
}
